package com.ekl.core.knowledge.blo;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.core.knowledge.KnowledgeReview;

public interface KnowledgeReviewBlo {
    UUID submit(SessionContext session, UUID knowledge, UUID version, KnowledgeReview.Submit input);
    CommandResult decide(SessionContext session, UUID step, String key, KnowledgeReview.Decision input);
    KnowledgeReview.Step step(SessionContext session, UUID version);
}
