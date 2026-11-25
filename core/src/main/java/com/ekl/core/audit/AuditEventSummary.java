package com.ekl.core.audit;

import java.time.OffsetDateTime;
import java.util.UUID;

public record AuditEventSummary(UUID id, OffsetDateTime occurredAt, String action, String decision, String reasonCode) {
}
