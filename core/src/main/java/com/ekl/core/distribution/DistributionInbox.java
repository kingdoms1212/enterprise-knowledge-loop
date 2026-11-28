package com.ekl.core.distribution;

import java.time.OffsetDateTime;
import java.util.UUID;

public final class DistributionInbox {
    private DistributionInbox() {
    }

    public record Item(UUID id, UUID versionId, String title, int versionNumber,
                       OffsetDateTime deliveredAt, OffsetDateTime acknowledgedAt) {
    }
}
