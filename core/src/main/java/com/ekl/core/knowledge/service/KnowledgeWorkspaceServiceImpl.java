package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CursorPage;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.knowledge.KnowledgeWorkspace;
import com.ekl.core.knowledge.blo.KnowledgeWorkspaceBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class KnowledgeWorkspaceServiceImpl implements KnowledgeWorkspaceService {
    private final LoginService login;
    private final KnowledgeWorkspaceBlo blo;
    private final CommandService commands;

    KnowledgeWorkspaceServiceImpl(LoginService login, KnowledgeWorkspaceBlo blo, CommandService commands) {
        this.login = login;
        this.blo = blo;
        this.commands = commands;
    }

    @Override
    @Transactional
    public CursorPage<KnowledgeWorkspace.Row> drafts(RequestActor actor, String cursor, int limit) {
        return blo.drafts(current(actor), cursor, limit);
    }

    @Override
    @Transactional
    public CursorPage<KnowledgeWorkspace.Row> reviews(RequestActor actor, String cursor, int limit) {
        return blo.reviews(current(actor), cursor, limit);
    }

    @Override
    @Transactional(noRollbackFor = ResponseStatusException.class)
    public KnowledgeWorkspace.Detail detail(RequestActor actor, UUID version) {
        return blo.detail(current(actor), version);
    }

    private SessionContext current(RequestActor actor) {
        var entry = actor.context() != null ? actor.context() : login.current(actor.sessionId(), actor.accountId());
        commands.lockOrganizationForQuery(entry.organizationId());
        return login.current(actor);
    }
}
