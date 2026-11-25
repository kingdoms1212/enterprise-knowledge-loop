package com.ekl.core.job;

import java.util.UUID;

public record JobSummary(UUID eventId, UUID aggregateId, String eventType, String state, int attempts) {
}
