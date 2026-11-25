package com.ekl.core.distribution;

import java.util.UUID;

public record DistributionSummary(UUID id, UUID versionId, String state, boolean acknowledgementRequired) {
}
