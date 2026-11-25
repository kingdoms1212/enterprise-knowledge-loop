package com.ekl.core.knowledge.blo;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.NewKnowledge;

public interface KnowledgeDraftBlo {
    NewKnowledge.Created create(RequestActor actor, String key, NewKnowledge input);
}
