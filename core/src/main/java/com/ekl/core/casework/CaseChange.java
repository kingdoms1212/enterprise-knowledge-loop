package com.ekl.core.casework;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class CaseChange {
    private CaseChange() {
    }

    public record Decide(String decision, String reason, @JsonProperty("analysis_id") UUID analysis,
                         @JsonProperty("expected_version") Long expectedVersion) {
    }

    public record Close(@JsonProperty("close_type") String type, @JsonProperty("close_note") String note,
                        Outcome outcome, @JsonProperty("applied_reference") Reference reference,
                        @JsonProperty("expected_version") Long expectedVersion) {
    }

    public record Outcome(String result, String summary, String applicability, String limitations) {
    }

    public record Reference(@JsonProperty("document_version_id") UUID document,
                            @JsonProperty("knowledge_version_id") UUID knowledge, String reason) {
    }
}
