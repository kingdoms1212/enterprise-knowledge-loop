package com.ekl.core.retrieval;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class DocumentQuery {
    private DocumentQuery() {
    }

    public record Request(String question, @JsonProperty("top_k") Integer topK, @JsonProperty("case_id") UUID caseId) {
    }

    public record Response(@JsonProperty("request_id") UUID requestId, String status,
                           @JsonProperty("outcome_reason") String outcomeReason, boolean degraded,
                           @JsonProperty("generation_mode") String generationMode, String answer, List<Source> sources) {
    }

    public record Source(@JsonProperty("citation_key") String citationKey,
                         @JsonProperty("document_id") UUID documentId,
                         @JsonProperty("document_version_id") UUID versionId,
                         @JsonProperty("version_number") int versionNumber,
                         String title, Integer page, Integer paragraph) {
    }

    public record Hit(UUID chunk, UUID revision, UUID document, UUID version, UUID acl, long policyRevision,
                      int versionNumber, String title, Integer page, Integer paragraph, String text, float rank) {
        public Source source(String key) {
            return new Source(key, document, version, versionNumber, title, page, paragraph);
        }
    }

    public record Pipeline(UUID id, long epoch) {
    }
}
