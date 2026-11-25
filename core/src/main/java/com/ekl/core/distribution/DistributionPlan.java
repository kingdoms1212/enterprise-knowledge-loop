package com.ekl.core.distribution;

import java.util.List;
import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public record DistributionPlan(@JsonProperty("version_id") UUID version,
                               @JsonProperty("department_ids") List<UUID> departments, String reason,
                               @JsonProperty("ack_required") boolean ackRequired) {
}
