package com.ekl.core.distribution.dao;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;

public interface DistributionCommandDao {
    Optional<Long> lockPublishedVersion(UUID organization, UUID version);
    boolean withinApprovedDepartment(UUID organization, UUID version, UUID department);
    void create(UUID id, UUID version, UUID actor, String reason, boolean acknowledgementRequired);
    void addTarget(UUID id, UUID version, UUID department);
    void enqueuePlan(UUID id, UUID actor);
    Optional<LockedDistribution> lock(UUID organization, UUID id);
    boolean canRetry(UUID id);
    void bumpRevision(UUID id, long revision);
    Optional<UUID> lockReceipt(SessionContext session, UUID id);
    OffsetDateTime acknowledge(UUID id, UUID account);
    void withdrawVersion(UUID organization, UUID version, UUID actor);

    record LockedDistribution(UUID version, String state, long revision) {
    }
}
