package com.ekl.core.distribution.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.core.distribution.DistributionPlan;

public interface DistributionCommandService {
    CommandResult create(RequestActor actor, String key, DistributionPlan input);
    CommandResult redeliver(RequestActor actor, UUID id, String key);

    OffsetDateTime acknowledge(RequestActor actor, UUID id);

    void planAutomatic(SessionContext session, UUID version, UUID department, String reason);
    UUID queueAutomatic(SessionContext session, UUID version);

    void withdrawVersion(SessionContext session, UUID version);
}
