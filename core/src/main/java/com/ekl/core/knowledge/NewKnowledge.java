package com.ekl.core.knowledge;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public record NewKnowledge(String title, String kind, String body, @JsonProperty("source_refs") List<Source> sources,
                           @JsonProperty("classification_level") Integer classification,
                           @JsonProperty("acl_id") UUID acl, @JsonProperty("sharing_scope") String sharing) {
    public record Source(@JsonProperty("source_role") String role,
                         @JsonProperty("document_version_id") UUID document,
                         @JsonProperty("case_id") UUID caseId, @JsonProperty("outcome_id") UUID outcome,
                         @JsonProperty("source_locator") String locator) {
    }

    public record Created(UUID knowledgeId, UUID versionId) {
    }
}
