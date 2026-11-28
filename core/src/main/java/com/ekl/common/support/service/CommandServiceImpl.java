package com.ekl.common.support.service;

import java.util.UUID;
import java.util.function.Supplier;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.blo.CommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(propagation = Propagation.MANDATORY)
class CommandServiceImpl implements CommandService {
    private final CommandBlo blo;

    CommandServiceImpl(CommandBlo blo) {
        this.blo = blo;
    }

    @Override
    public void lockOrganization(UUID organization) {
        blo.lockOrganization(organization);
    }

    @Override
    public void lockOrganizationForQuery(UUID organization) {
        blo.lockOrganizationForQuery(organization);
    }

    @Override
    public void bumpPolicyEpoch(UUID organization) {
        blo.bumpPolicyEpoch(organization);
    }

    @Override
    public UUID enqueue(String aggregateType, UUID aggregateId, long revision, String event, UUID actor, UUID version) {
        return blo.enqueue(aggregateType, aggregateId, revision, event, actor, version);
    }

    @Override
    public CommandResult once(SessionContext session, String operation, String key, byte[] hash,
                              int status, Supplier<CommandResult> command) {
        return blo.once(session, operation, key, hash, status, command);
    }
}
