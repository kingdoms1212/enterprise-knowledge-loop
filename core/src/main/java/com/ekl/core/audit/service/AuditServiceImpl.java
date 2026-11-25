package com.ekl.core.audit.service;

import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.core.audit.AuditEventSummary;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.blo.AuditBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class AuditServiceImpl implements AuditService {
    private final AuditBlo blo;

    AuditServiceImpl(AuditBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public void recordAccess(ResourceAccessAudit access) {
        blo.recordAccess(access);
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<AuditEventSummary> findEvent(UUID organizationId, UUID eventId, OffsetDateTime occurredAt) {
        return blo.findEvent(organizationId, eventId, occurredAt);
    }
}
