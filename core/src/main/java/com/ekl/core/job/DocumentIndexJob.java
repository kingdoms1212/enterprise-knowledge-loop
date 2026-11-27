package com.ekl.core.job;

import java.util.Map;
import java.util.UUID;

public final class DocumentIndexJob {
    private DocumentIndexJob() {
    }
    public record Source(UUID organization, UUID version, UUID acl, long revision, long epoch,
                         byte[] policyHash, UUID pipeline, String parsedSegments) {
    }

    public record Chunk(UUID id, int ordinal, String text, Map<String, Integer> locator) {
    }
}
