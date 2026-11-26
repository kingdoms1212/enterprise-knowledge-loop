package com.ekl.core.casework.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.casework.CaseWorkspace;
import com.ekl.common.auth.RequestActor;

public interface CaseWorkspaceService {
    CursorPage<CaseWorkspace.Row> list(RequestActor actor, String cursor, int limit);
    Optional<CaseWorkspace.Detail> find(RequestActor actor, UUID id);
}
