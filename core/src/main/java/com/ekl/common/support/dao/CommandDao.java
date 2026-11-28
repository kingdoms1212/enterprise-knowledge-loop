package com.ekl.common.support.dao;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;

public interface CommandDao {
    void lockOrganization(UUID organization);
    void lockOrganizationForQuery(UUID organization);
    void bumpPolicyEpoch(UUID organization);
    UUID enqueue(String aggregateType, UUID aggregateId, long revision, String event, UUID actor, UUID version);
    boolean claim(SessionContext session, String operation, String key, byte[] hash);
    CommandResult replay(SessionContext session, String operation, String key, byte[] hash);
    void complete(SessionContext session, String operation, String key, int status, CommandResult result);
}
