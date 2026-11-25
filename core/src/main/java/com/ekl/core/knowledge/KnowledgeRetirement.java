package com.ekl.core.knowledge;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KnowledgeRetirement(String reason, @JsonProperty("expected_version") Long expectedVersion) {
}
