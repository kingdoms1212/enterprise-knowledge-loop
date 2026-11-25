package com.ekl.core.knowledge.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.NewKnowledge;

public interface KnowledgeDraftService {
    NewKnowledge.Created create(RequestActor actor, String key, NewKnowledge input);
}
