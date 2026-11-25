package com.ekl.core.knowledge;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public record KnowledgeDraftEdit(String body, @JsonProperty("acl_id") UUID acl,
                                 @JsonProperty("expected_version") Long expectedVersion) {
}
