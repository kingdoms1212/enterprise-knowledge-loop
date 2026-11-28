package com.ekl.core.knowledge;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class KnowledgeReview {
    private KnowledgeReview() {
    }

    public record Submit(String reason, @JsonProperty("expected_version") Long expectedVersion) {
    }

    public record Decision(String decision, String reason, @JsonProperty("expected_version") Long expectedVersion) {
    }

    public record Step(UUID id, String state, long rowVersion, boolean canDecide, String reason) {
    }

    public record Version(UUID id, UUID author, UUID department, String state, long revision,
                          byte[] contentHash, byte[] aclHash, byte[] policyHash, UUID submission) {
    }

    public record Pending(UUID id, UUID line, UUID knowledge, UUID version, UUID department, UUID drafter,
                          String state, long revision, String reason) {
    }
}
