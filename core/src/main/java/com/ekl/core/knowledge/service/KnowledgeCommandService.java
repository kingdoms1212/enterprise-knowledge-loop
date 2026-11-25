package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.core.knowledge.KnowledgeDraftEdit;
import com.ekl.core.knowledge.KnowledgeRetirement;

public interface KnowledgeCommandService {
    CommandResult editDraft(RequestActor actor, UUID id, UUID version, KnowledgeDraftEdit input);

    CommandResult retire(RequestActor actor, UUID id, UUID version, KnowledgeRetirement input);
}
