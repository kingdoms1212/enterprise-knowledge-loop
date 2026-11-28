package com.ekl.common.support.blo;

import java.util.UUID;
import java.util.function.Supplier;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.dao.CommandDao;
import org.springframework.stereotype.Component;

@Component
class CommandBloImpl implements CommandBlo {
    private final CommandDao dao;

    CommandBloImpl(CommandDao dao) {
        this.dao = dao;
    }

    @Override
    public void lockOrganization(UUID organization) {
        dao.lockOrganization(organization);
    }

    @Override
    public void lockOrganizationForQuery(UUID organization) {
        dao.lockOrganizationForQuery(organization);
    }

    @Override
    public void bumpPolicyEpoch(UUID organization) {
        dao.bumpPolicyEpoch(organization);
    }

    @Override
    public UUID enqueue(String aggregateType, UUID aggregateId, long revision, String event, UUID actor, UUID version) {
        return dao.enqueue(aggregateType, aggregateId, revision, event, actor, version);
    }

    @Override
    public CommandResult once(SessionContext session, String operation, String key, byte[] hash,
                              int status, Supplier<CommandResult> command) {
        var normalizedKey = CommandRules.required(key, 255);
        var assignmentHash = CommandRules.digest(session.assignmentId(), hash);
        if (!dao.claim(session, operation, normalizedKey, assignmentHash)) {
            return dao.replay(session, operation, normalizedKey, assignmentHash);
        }
        var result = command.get();
        dao.complete(session, operation, normalizedKey, status, result);
        return result;
    }
}
