package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CursorPage;
import com.ekl.core.knowledge.KnowledgeWorkspace;

public interface KnowledgeWorkspaceService {
    CursorPage<KnowledgeWorkspace.Row> drafts(RequestActor actor, String cursor, int limit);
    CursorPage<KnowledgeWorkspace.Row> reviews(RequestActor actor, String cursor, int limit);

    KnowledgeWorkspace.Detail detail(RequestActor actor, UUID version);
}
