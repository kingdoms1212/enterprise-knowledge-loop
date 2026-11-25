package com.ekl.core.distribution.service;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.core.distribution.DistributionPlan;
import com.ekl.core.distribution.blo.DistributionCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DistributionCommandServiceImpl implements DistributionCommandService {
    private final DistributionCommandBlo blo;

    DistributionCommandServiceImpl(DistributionCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public CommandResult create(RequestActor actor, String key, DistributionPlan input) {
        return blo.create(actor, key, input);
    }

    @Override
    @Transactional
    public CommandResult redeliver(RequestActor actor, UUID id, String key) {
        return blo.redeliver(actor, id, key);
    }

    @Override
    @Transactional
    public OffsetDateTime acknowledge(RequestActor actor, UUID id) {
        return blo.acknowledge(actor, id);
    }

    @Override
    @Transactional
    public void withdrawVersion(SessionContext session, UUID version) {
        blo.withdrawVersion(session, version);
    }
}
