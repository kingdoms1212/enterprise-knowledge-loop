package com.ekl.common.support.blo;

import java.util.UUID;
import java.util.function.Supplier;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;

public interface CommandBlo {
    void lockOrganization(UUID organization);
    void bumpPolicyEpoch(UUID organization);
    UUID enqueue(String aggregateType, UUID aggregateId, long revision, String event, UUID actor, UUID version);
    CommandResult once(SessionContext session, String operation, String key, byte[] hash,
                       int status, Supplier<CommandResult> command);
}
