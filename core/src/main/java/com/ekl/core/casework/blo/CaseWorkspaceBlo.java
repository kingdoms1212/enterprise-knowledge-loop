package com.ekl.core.casework.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.casework.CaseWorkspace;
import com.ekl.common.auth.SessionContext;

public interface CaseWorkspaceBlo {
    CursorPage<CaseWorkspace.Row> list(SessionContext session, String cursor, int limit);
    Optional<CaseWorkspace.Detail> find(SessionContext session, UUID id);
}
