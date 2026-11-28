package com.ekl.core.knowledge.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.core.knowledge.KnowledgeReview;

public interface KnowledgeReviewService {
    UUID submit(RequestActor actor, UUID knowledge, UUID version, KnowledgeReview.Submit input);
    CommandResult decide(RequestActor actor, UUID step, String key, KnowledgeReview.Decision input);
}
