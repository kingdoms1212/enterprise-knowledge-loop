package com.ekl.core.casework.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.casework.CaseWorkspace;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.core.casework.blo.CaseWorkspaceBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
class CaseWorkspaceServiceImpl implements CaseWorkspaceService {
    private final LoginService login;
    private final CaseWorkspaceBlo blo;

    CaseWorkspaceServiceImpl(LoginService login, CaseWorkspaceBlo blo) {
        this.login = login;
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public CursorPage<CaseWorkspace.Row> list(RequestActor actor, String cursor, int limit) {
        return blo.list(session(actor), cursor, limit);
    }

    @Override
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Optional<CaseWorkspace.Detail> find(RequestActor actor, UUID id) {
        return blo.find(session(actor), id);
    }

    private SessionContext session(RequestActor actor) {
        return login.current(actor);
    }
}
