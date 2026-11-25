package com.ekl.core.knowledge.blo;

import java.nio.charset.StandardCharsets;
import java.util.UUID;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.common.support.service.LocalBlobStore;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.distribution.service.DistributionCommandService;
import com.ekl.core.knowledge.KnowledgeDraftEdit;
import com.ekl.core.knowledge.KnowledgeRetirement;
import com.ekl.core.knowledge.dao.KnowledgeCommandDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class KnowledgeCommandBloImpl implements KnowledgeCommandBlo {
    private final LoginService login;
    private final AuthorizationService auth;
    private final CommandService commands;
    private final DistributionCommandService distributions;
    private final AuditService audit;
    private final KnowledgeCommandDao dao;

    KnowledgeCommandBloImpl(LoginService login, AuthorizationService auth, CommandService commands,
                            DistributionCommandService distributions, AuditService audit, KnowledgeCommandDao dao) {
        this.login = login;
        this.auth = auth;
        this.commands = commands;
        this.distributions = distributions;
        this.audit = audit;
        this.dao = dao;
    }

    @Override
    public CommandResult editDraft(RequestActor actor, UUID id, UUID version, KnowledgeDraftEdit input) {
        var session = login.current(actor.sessionId(), actor.accountId());
        commands.lockOrganization(session.organizationId());
        var row = dao.lock(session.organizationId(), id, version)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!auth.check(session, version, "KNOWLEDGE_VERSION", "WRITE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        CommandRules.requireVersion(row.revision(), input.expectedVersion());
        if (!"DRAFT".equals(row.state()) || (input.acl() != null && !input.acl().equals(row.acl()))) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        var body = CommandRules.required(input.body(), 100_000);
        dao.editDraft(version, row.revision(), actor.accountId(), body,
                LocalBlobStore.sha256(body.getBytes(StandardCharsets.UTF_8)));
        return new CommandResult(version, null, row.revision() + 1);
    }

    @Override
    public CommandResult retire(RequestActor actor, UUID id, UUID version, KnowledgeRetirement input) {
        var session = login.current(actor.sessionId(), actor.accountId());
        commands.lockOrganization(session.organizationId());
        var row = dao.lock(session.organizationId(), id, version)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var grant = auth.check(session, version, "KNOWLEDGE_VERSION", "RETIRE");
        if (!grant.allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        CommandRules.requireVersion(row.revision(), input.expectedVersion());
        var reason = CommandRules.required(input.reason(), 2000);
        if (!"PUBLISHED".equals(row.state())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        dao.retire(id, version, row.revision(), reason);
        distributions.withdrawVersion(session, version);
        var newRevision = row.revision() + 1;
        commands.bumpPolicyEpoch(session.organizationId());
        commands.enqueue("KNOWLEDGE_VERSION", version, newRevision, "IndexRetire", actor.accountId(), version);
        audit.recordAccess(new ResourceAccessAudit(session, grant.personId(), version, "KNOWLEDGE_VERSION",
                "RETIRE", true, "RETIRED", grant.scope().policyRevision()));
        return new CommandResult(version, null, newRevision);
    }
}
