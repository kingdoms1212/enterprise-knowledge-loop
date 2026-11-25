package com.ekl.core.distribution.blo;

import java.time.OffsetDateTime;
import java.util.Objects;
import java.util.UUID;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.distribution.DistributionPlan;
import com.ekl.core.distribution.dao.DistributionCommandDao;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class DistributionCommandBloImpl implements DistributionCommandBlo {
    private final LoginService login;
    private final AuthorizationService auth;
    private final CommandService commands;
    private final DistributionCommandDao dao;

    DistributionCommandBloImpl(LoginService login, AuthorizationService auth, CommandService commands,
                               DistributionCommandDao dao) {
        this.login = login;
        this.auth = auth;
        this.commands = commands;
        this.dao = dao;
    }

    @Override
    public CommandResult create(RequestActor actor, String key, DistributionPlan input) {
        var session = login.current(actor.sessionId(), actor.accountId());
        if (!auth.hasRole(session, "DISTRIBUTE", null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (input.version() == null || input.departments() == null || input.departments().isEmpty()
                || input.departments().size() > 30 || input.departments().stream().anyMatch(Objects::isNull)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var reason = CommandRules.required(input.reason(), 2000);
        var departments = input.departments().stream().distinct().sorted().toList();
        commands.lockOrganization(session.organizationId());
        if (dao.lockPublishedVersion(session.organizationId(), input.version()).isEmpty()
                || !auth.check(session, input.version(), "KNOWLEDGE_VERSION", "DISTRIBUTE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        var hash = CommandRules.digest(input.version(), departments, reason, input.ackRequired());
        return commands.once(session, "POST /distributions", key, hash, 202, () -> {
            for (var department : departments) {
                if (!dao.withinApprovedDepartment(session.organizationId(), input.version(), department)) {
                    throw new ResponseStatusException(HttpStatus.CONFLICT);
                }
            }
            var id = UUID.randomUUID();
            dao.create(id, input.version(), actor.accountId(), reason, input.ackRequired());
            try {
                departments.forEach(department -> dao.addTarget(id, input.version(), department));
            } catch (DuplicateKeyException exception) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            dao.enqueuePlan(id, actor.accountId());
            var job = commands.enqueue("DISTRIBUTION", id, 1, "DistributionRequested", actor.accountId(), input.version());
            return new CommandResult(id, job, 1L);
        });
    }

    @Override
    public CommandResult redeliver(RequestActor actor, UUID id, String key) {
        var session = login.current(actor.sessionId(), actor.accountId());
        commands.lockOrganization(session.organizationId());
        var distribution = dao.lock(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!auth.check(session, distribution.version(), "KNOWLEDGE_VERSION", "DISTRIBUTE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return commands.once(session, "POST /distributions/" + id + "/redeliver", key, CommandRules.digest(id),
                202, () -> {
                    if (!("FAILED".equals(distribution.state()) || "PARTIAL_FAILED".equals(distribution.state()))
                            || !dao.canRetry(id)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT);
                    }
                    dao.bumpRevision(id, distribution.revision());
                    var revision = distribution.revision() + 1;
                    var job = commands.enqueue("DISTRIBUTION", id, revision, "DistributionRedeliveryRequested",
                            actor.accountId(), distribution.version());
                    return new CommandResult(id, job, revision);
                });
    }

    @Override
    public OffsetDateTime acknowledge(RequestActor actor, UUID id) {
        var session = login.current(actor.sessionId(), actor.accountId());
        if (session.assignmentId() == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        commands.lockOrganization(session.organizationId());
        var version = dao.lockReceipt(session, id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var read = auth.checkRead(session, version, "KNOWLEDGE_VERSION");
        if (!read.allowed() || read.emergency()
                || !auth.check(session, version, "KNOWLEDGE_VERSION", "ACKNOWLEDGE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return dao.acknowledge(id, actor.accountId());
    }

    @Override
    public void withdrawVersion(SessionContext session, UUID version) {
        dao.withdrawVersion(session.organizationId(), version, session.accountId());
    }
}
