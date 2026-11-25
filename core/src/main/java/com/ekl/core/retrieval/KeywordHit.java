package com.ekl.core.retrieval;

import java.util.UUID;

public record KeywordHit(UUID chunkId, UUID versionId, String sourceKind, String sourceLocator, float rank) {
}
