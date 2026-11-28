package com.ekl.core.knowledge.blo;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CursorPage;
import com.ekl.core.knowledge.KnowledgeWorkspace;

public interface KnowledgeWorkspaceBlo {
    CursorPage<KnowledgeWorkspace.Row> drafts(SessionContext session, String cursor, int limit);
    CursorPage<KnowledgeWorkspace.Row> reviews(SessionContext session, String cursor, int limit);

    KnowledgeWorkspace.Detail detail(SessionContext session, UUID version);
}
