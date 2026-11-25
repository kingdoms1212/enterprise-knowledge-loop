package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.core.knowledge.KnowledgeDraftEdit;
import com.ekl.core.knowledge.KnowledgeRetirement;
import com.ekl.core.knowledge.blo.KnowledgeCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class KnowledgeCommandServiceImpl implements KnowledgeCommandService {
    private final KnowledgeCommandBlo blo;

    KnowledgeCommandServiceImpl(KnowledgeCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public CommandResult editDraft(RequestActor actor, UUID id, UUID version, KnowledgeDraftEdit input) {
        return blo.editDraft(actor, id, version, input);
    }

    @Override
    @Transactional
    public CommandResult retire(RequestActor actor, UUID id, UUID version, KnowledgeRetirement input) {
        return blo.retire(actor, id, version, input);
    }
}
