package com.ekl.core.knowledge.blo;

import java.util.Set;
import java.util.UUID;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.distribution.service.DistributionCommandService;
import com.ekl.core.knowledge.KnowledgeReview;
import com.ekl.core.knowledge.dao.KnowledgeReviewDao;
import com.ekl.core.knowledge.dao.KnowledgeWorkspaceDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class KnowledgeReviewBloImpl implements KnowledgeReviewBlo {
    private static final String TYPE = "KNOWLEDGE_VERSION";
    private static final Set<String> DECISIONS = Set.of("APPROVE", "RETURN", "REJECT");
    private final AuthorizationService auth;
    private final CommandService commands;
    private final DistributionCommandService distribution;
    private final KnowledgeReviewDao dao;
    private final KnowledgeWorkspaceDao workspace;

    KnowledgeReviewBloImpl(AuthorizationService auth, CommandService commands, DistributionCommandService distribution,
                          KnowledgeReviewDao dao, KnowledgeWorkspaceDao workspace) {
        this.auth = auth;
        this.commands = commands;
        this.distribution = distribution;
        this.dao = dao;
        this.workspace = workspace;
    }

    @Override
    public UUID submit(SessionContext session, UUID knowledge, UUID version, KnowledgeReview.Submit input) {
        var row = dao.lockVersion(session.organizationId(), knowledge, version)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireRead(session, version, TYPE);
        if (!session.accountId().equals(row.author()) || !auth.hasRole(session, "SUBMIT", row.department())
                || !auth.check(session, version, TYPE, "SUBMIT").allowed()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        CommandRules.requireVersion(row.revision(), input.expectedVersion());
        if (!"DRAFT".equals(row.state())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        var reason = CommandRules.required(input.reason(), 2000);
        var sources = sourceHash(session, version);
        var step = dao.submit(session.organizationId(), row, session.accountId(), sources, targetHash(row));
        distribution.planAutomatic(session, version, row.department(), reason);
        return step;
    }

    @Override
    public CommandResult decide(SessionContext session, UUID id, String key, KnowledgeReview.Decision input) {
        if (input.decision() == null || !DECISIONS.contains(input.decision())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var reason = "APPROVE".equals(input.decision()) && input.reason() == null
                ? null : CommandRules.required(input.reason(), 2000);
        var step = dao.step(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var row = dao.lockVersion(session.organizationId(), step.knowledge(), step.version())
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        requireRead(session, row.id(), TYPE);
        if (!canDecide(session, step)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        boolean publish = "APPROVE".equals(input.decision());
        if (publish && (!auth.check(session, row.id(), TYPE, "PUBLISH").allowed()
                || !auth.check(session, row.id(), TYPE, "DISTRIBUTE").allowed())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return commands.once(session, "POST /approval-steps/" + id + "/decision", key,
                CommandRules.digest(input.decision(), reason, input.expectedVersion()), publish ? 202 : 200, () -> {
                    CommandRules.requireVersion(step.revision(), input.expectedVersion());
                    if (!"OPEN".equals(step.state()) || !"REVIEW".equals(row.state())
                            || !step.department().equals(row.department())
                            || !dao.stepForVersion(session.organizationId(), row.id()).orElseThrow().id().equals(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT);
                    }
                    if (publish && !dao.matchesSubmission(row, sourceHash(session, row.id()), targetHash(row))) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT);
                    }
                    dao.recordDecision(row, step, session.accountId(), input.decision(), reason);
                    UUID index = null;
                    if (publish) {
                        index = commands.enqueue(TYPE, row.id(), row.revision() + 1, "KnowledgeIndexRequested",
                                session.accountId(), row.id());
                        distribution.queueAutomatic(session, row.id());
                    } else {
                        distribution.withdrawVersion(session, row.id());
                    }
                    return new CommandResult(row.id(), index, row.revision() + 1);
                });
    }

    @Override
    public KnowledgeReview.Step step(SessionContext session, UUID version) {
        return dao.stepForVersion(session.organizationId(), version).map(step -> new KnowledgeReview.Step(
                step.id(), step.state(), step.revision(), "OPEN".equals(step.state()) && canDecide(session, step),
                step.drafter().equals(session.accountId()) ? step.reason() : null)).orElse(null);
    }

    private boolean canDecide(SessionContext session, KnowledgeReview.Pending step) {
        return !session.accountId().equals(step.drafter()) && !dao.samePerson(session.accountId(), step.drafter())
                && auth.hasRole(session, "APPROVE", step.department())
                && auth.check(session, step.version(), TYPE, "APPROVE").allowed();
    }

    private byte[] sourceHash(SessionContext session, UUID version) {
        var sources = workspace.liveSources(version);
        if (sources.isEmpty() || sources.size() != workspace.sourceCount(version)
                || sources.stream().anyMatch(source -> source.documentId() == null)) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        sources.forEach(source -> requireRead(session, source.documentId(), "DOCUMENT"));
        return dao.documentSourceHash(version);
    }

    private byte[] targetHash(KnowledgeReview.Version row) {
        return CommandRules.digest("READABLE_ONLY", row.department(), true);
    }

    private void requireRead(SessionContext session, UUID id, String type) {
        var access = auth.checkRead(session, id, type);
        if (!access.allowed() || access.emergency()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }
}
