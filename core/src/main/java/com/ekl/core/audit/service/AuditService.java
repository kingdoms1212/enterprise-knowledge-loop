package com.ekl.core.audit.service;

import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.core.audit.AuditEventSummary;
import com.ekl.core.audit.ResourceAccessAudit;

public interface AuditService {
    void recordAccess(ResourceAccessAudit access);

    Optional<AuditEventSummary> findEvent(UUID organizationId, UUID eventId, OffsetDateTime occurredAt);
}
