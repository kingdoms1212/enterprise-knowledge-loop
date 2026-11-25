package com.ekl.core.audit.dao;

import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.core.audit.AuditEventSummary;
import com.ekl.core.audit.ResourceAccessAudit;

public interface AuditDao {
    void recordAccess(ResourceAccessAudit access);

    Optional<AuditEventSummary> findEvent(UUID organizationId, UUID eventId, OffsetDateTime occurredAt);
}
