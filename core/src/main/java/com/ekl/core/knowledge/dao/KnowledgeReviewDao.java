package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.knowledge.KnowledgeReview.Pending;
import com.ekl.core.knowledge.KnowledgeReview.Version;

public interface KnowledgeReviewDao {
    Optional<Version> lockVersion(UUID organization, UUID knowledge, UUID version);
    Optional<Pending> step(UUID organization, UUID step);
    Optional<Pending> stepForVersion(UUID organization, UUID version);
    boolean samePerson(UUID first, UUID second);
    byte[] documentSourceHash(UUID version);
    UUID submit(UUID organization, Version version, UUID author, byte[] sources, byte[] targets);
    boolean matchesSubmission(Version version, byte[] sources, byte[] targets);
    void recordDecision(Version version, Pending step, UUID actor, String decision, String reason);
}
