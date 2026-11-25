package com.ekl.core.audit.blo;

import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.core.audit.AuditEventSummary;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.dao.AuditDao;
import org.springframework.stereotype.Component;

@Component
class AuditBloImpl implements AuditBlo {
    private final AuditDao dao;

    AuditBloImpl(AuditDao dao) {
        this.dao = dao;
    }

    @Override
    public void recordAccess(ResourceAccessAudit access) {
        dao.recordAccess(access);
    }

    @Override
    public Optional<AuditEventSummary> findEvent(UUID organizationId, UUID eventId, OffsetDateTime occurredAt) {
        if (!(organizationId != null && eventId != null && occurredAt != null)) {
            return Optional.empty();
        }
        return dao.findEvent(organizationId, eventId, occurredAt);
    }
}
