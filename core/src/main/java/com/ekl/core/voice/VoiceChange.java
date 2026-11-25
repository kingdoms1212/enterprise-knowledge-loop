package com.ekl.core.voice;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class VoiceChange {
    private VoiceChange() {
    }

    public record Intake(String title, String body, @JsonProperty("received_department_id") UUID departmentId,
                         @JsonProperty("customer_id") UUID customerId, @JsonProperty("product_code") String productCode,
                         @JsonProperty("received_at") OffsetDateTime receivedAt, String channel,
                         @JsonProperty("urgency_hint") String urgency, @JsonProperty("external_id") String externalId) {
    }

    public record Triage(@JsonProperty("type_final") String type, @JsonProperty("urgency_final") String urgency,
                         @JsonProperty("primary_department_id") UUID department, @JsonProperty("handler_id") UUID handler,
                         @JsonProperty("related_department_ids") List<UUID> relatedDepartments,
                         @JsonProperty("existing_case_id") UUID existingCase,
                         @JsonProperty("override_reason") String overrideReason,
                         @JsonProperty("expected_version") Long expectedVersion) {
    }
}
