package com.ekl.core.voice.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.voice.VoiceWorkspace;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.core.voice.blo.VoiceWorkspaceBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
class VoiceWorkspaceServiceImpl implements VoiceWorkspaceService {
    private final LoginService login;
    private final VoiceWorkspaceBlo blo;

    VoiceWorkspaceServiceImpl(LoginService login, VoiceWorkspaceBlo blo) {
        this.login = login;
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CursorPage<VoiceWorkspace.Row> list(RequestActor actor, String cursor, int limit) {
        return blo.list(session(actor), cursor, limit);
    }

    @Override
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Optional<VoiceWorkspace.Detail> find(RequestActor actor, UUID id) {
        return blo.find(session(actor), id);
    }

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public VoiceWorkspace.Capabilities capabilities(RequestActor actor) {
        return blo.capabilities(session(actor));
    }

    private SessionContext session(RequestActor actor) {
        return login.current(actor.sessionId(), actor.accountId());
    }
}
