package com.ekl.core.knowledge;

import java.util.UUID;

public record KnowledgeVersionSummary(UUID id, UUID knowledgeId, int versionNumber, String kind, String state) {
}
