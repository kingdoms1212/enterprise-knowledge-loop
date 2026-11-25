package com.ekl.core.knowledge.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.NewKnowledge;
import com.ekl.core.knowledge.blo.KnowledgeDraftBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class KnowledgeDraftServiceImpl implements KnowledgeDraftService {
    private final KnowledgeDraftBlo blo;

    KnowledgeDraftServiceImpl(KnowledgeDraftBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public NewKnowledge.Created create(RequestActor actor, String key, NewKnowledge input) {
        return blo.create(actor, key, input);
    }
}
