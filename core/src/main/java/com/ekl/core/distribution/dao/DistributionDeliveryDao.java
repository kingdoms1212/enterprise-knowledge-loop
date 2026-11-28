package com.ekl.core.distribution.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;

public interface DistributionDeliveryDao {
    Optional<Work> nextReady();
    boolean lockReady(Work work);
    List<Recipient> candidates(Work work);
    void deliver(Work work, Recipient recipient);
    void finish(Work work);

    record Work(UUID eventId, UUID distributionId, UUID versionId, UUID organizationId) {
    }

    record Recipient(SessionContext context, UUID departmentId, String assignmentType) {
    }
}
