package com.ekl.core.casework.blo;

import java.util.Set;
import java.util.UUID;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.acl.service.PolicyRegistrationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.TriagedVoice;
import com.ekl.core.casework.dao.CaseCommandDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class CaseCommandBloImpl implements CaseCommandBlo {
    private static final Set<String> OUTCOME_RESULTS = Set.of("SUCCESS", "PARTIAL", "FAIL");
    private final LoginService login;
    private final AuthorizationService auth;
    private final CommandService commands;
    private final CaseCommandDao dao;
    private final PolicyRegistrationService policies;

    CaseCommandBloImpl(LoginService login, AuthorizationService auth, CommandService commands, CaseCommandDao dao,
                       PolicyRegistrationService policies) {
        this.login = login;
        this.auth = auth;
        this.commands = commands;
        this.dao = dao;
        this.policies = policies;
    }

    @Override
    public UUID createFromTriage(SessionContext session, TriagedVoice voice) {
        if (!dao.handlerInDepartment(session.organizationId(), voice.department(), voice.handler())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var id = UUID.randomUUID();
        policies.register(new ResourcePolicyRegistration(session.organizationId(), session.accountId(), id, "CASE",
                voice.department(), voice.classification(), null));
        dao.createFromTriage(session, id, voice);
        return id;
    }

    @Override
    public CommandResult decide(RequestActor actor, UUID id, CaseChange.Decide input) {
        var session = login.current(actor);
        var row = locked(session, id);
        CommandRules.requireVersion(row.version(), input.expectedVersion());
        if ("CLOSED".equals(row.state())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        if (input.analysis() != null && !dao.validAnalysis(id, input.analysis())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var decision = CommandRules.required(input.decision(), 20_000);
        var reason = CommandRules.required(input.reason(), 2000);
        var revision = dao.addDecision(id, actor.accountId(), row.decision(), input.analysis(), decision, reason);
        dao.recordDecision(id, row, revision, actor.accountId());
        return new CommandResult(revision, null, row.version() + 1);
    }

    @Override
    public CommandResult close(RequestActor actor, UUID id, String key, CaseChange.Close input) {
        var session = login.current(actor);
        var row = locked(session, id);
        var type = CommandRules.required(input.type(), 40);
        var note = input.note() == null ? null : CommandRules.required(input.note(), 2000);
        var outcome = input.outcome();
        var reference = input.reference();
        var hash = CommandRules.digest(type, note, input.expectedVersion(),
                outcome == null ? null : CommandRules.digest(outcome.result(), outcome.summary(), outcome.applicability(),
                        outcome.limitations()),
                reference == null ? null : CommandRules.digest(reference.document(), reference.knowledge(), reference.reason()));
        return commands.once(session, "POST /cases/" + id + "/close", key, hash, 200, () -> {
            CommandRules.requireVersion(row.version(), input.expectedVersion());
            if ("CLOSED".equals(row.state()) || dao.unfinishedTasks(id)) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            var decision = closeDecision(session, id, row, type, note, outcome, reference);
            var nextRevision = row.version() + 1;
            dao.close(id, row, actor.accountId(), decision, type, note);
            UUID job = null;
            if (row.knowledgeRequested()) {
                if ("NO_REPLY_NEEDED".equals(type)) {
                    dao.addOutcome(id, decision, new CaseChange.Outcome("NO_ACTION", note, null, null));
                }
                job = commands.enqueue("CASE", id, nextRevision, "KnowledgeDraftRequested", actor.accountId(), null);
            }
            return new CommandResult(id, job, nextRevision);
        });
    }

    private UUID closeDecision(SessionContext session, UUID id, CaseCommandDao.LockedCase row, String type, String note,
                               CaseChange.Outcome outcome, CaseChange.Reference reference) {
        var actor = session.accountId();
        return switch (type) {
            case "NO_REPLY_NEEDED" -> {
                if (outcome != null || reference != null) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
                }
                var requiredNote = CommandRules.required(note, 2000);
                yield dao.addDecision(id, actor, row.decision(), null, requiredNote, "NO_REPLY_NEEDED");
            }
            case "RESOLVED" -> {
                if (outcome == null || outcome.result() == null || !OUTCOME_RESULTS.contains(outcome.result())
                        || reference != null) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
                }
                if (row.decision() == null) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT);
                }
                var summary = CommandRules.required(outcome.summary(), 20_000);
                dao.addOutcome(id, row.decision(),
                        new CaseChange.Outcome(outcome.result(), summary, outcome.applicability(), outcome.limitations()));
                yield row.decision();
            }
            case "AI_REFERENCE" -> {
                if (outcome != null || reference == null
                        || (reference.document() == null) == (reference.knowledge() == null)) {
                    throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
                }
                var reason = CommandRules.required(reference.reason(), 2000);
                var source = dao.publishedSource(session.organizationId(), reference)
                        .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
                var access = auth.checkRead(session, source.resource(), source.type());
                if (!access.allowed() || access.emergency()) {
                    throw new ResponseStatusException(HttpStatus.NOT_FOUND);
                }
                var decision = dao.addDecision(id, actor, row.decision(), null, reason, "AI_REFERENCE");
                dao.recordReference(id, actor, decision,
                        new CaseChange.Reference(reference.document(), reference.knowledge(), reason), source);
                yield decision;
            }
            default -> throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        };
    }

    private CaseCommandDao.LockedCase locked(SessionContext session, UUID id) {
        commands.lockOrganization(session.organizationId());
        var row = dao.lock(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!auth.check(session, id, "CASE", "DECIDE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        if (!auth.hasRole(session, "DECIDE", row.department())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return row;
    }
}
