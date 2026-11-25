package com.ekl.common.support.dao;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
class CommandDaoImpl implements CommandDao {
    private final JdbcClient jdbc;

    CommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public void lockOrganization(UUID organization) {
        jdbc.sql("select pg_advisory_xact_lock(hashtextextended(cast(:org as text), 0))")
                .param("org", organization).query((row, index) -> true).single();
    }

    @Override
    public void bumpPolicyEpoch(UUID organization) {
        jdbc.sql("""
                insert into iam.policy_epoch (organization_id) values (:org)
                on conflict (organization_id) do update set revision = iam.policy_epoch.revision + 1,
                    updated_at = now()
                """).param("org", organization).update();
    }

    @Override
    public UUID enqueue(String aggregateType, UUID aggregateId, long revision, String event, UUID actor, UUID version) {
        return jdbc.sql("""
                insert into ops.outbox (aggregate_type, aggregate_id, aggregate_revision, event_type, payload)
                values (:type, :id, :revision, :event, jsonb_strip_nulls(jsonb_build_object(
                    'actor_id', cast(:actor as uuid), 'version_id', cast(:version as uuid))))
                returning event_id
                """).param("type", aggregateType).param("id", aggregateId).param("revision", revision)
                .param("event", event).param("actor", actor).param("version", version).query(UUID.class).single();
    }

    @Override
    public boolean claim(SessionContext session, String operation, String key, byte[] hash) {
        return jdbc.sql("""
                insert into ops.idempotency_keys (actor_id, operation, idem_key, request_hash, state, expires_at)
                values (:actor, :operation, :key, :hash, 'IN_PROGRESS', now() + interval '24 hours')
                on conflict (actor_id, operation, idem_key) do update
                   set request_hash = excluded.request_hash, state = 'IN_PROGRESS', response_status = null,
                       response_ref = null, created_at = now(), expires_at = excluded.expires_at
                 where ops.idempotency_keys.expires_at <= now()
                """).param("actor", session.accountId()).param("operation", operation)
                .param("key", key).param("hash", hash).update() == 1;
    }

    @Override
    public CommandResult replay(SessionContext session, String operation, String key, byte[] hash) {
        return jdbc.sql("""
                select (response_ref ->> 'id')::uuid as id, (response_ref ->> 'job_id')::uuid as job_id,
                       (response_ref ->> 'row_version')::bigint as row_version
                  from ops.idempotency_keys
                 where actor_id = :actor and operation = :operation and idem_key = :key
                   and request_hash = :hash and state = 'COMPLETED' and expires_at > now()
                """).param("actor", session.accountId()).param("operation", operation)
                .param("key", key).param("hash", hash)
                .query((row, index) -> new CommandResult(row.getObject("id", UUID.class),
                        row.getObject("job_id", UUID.class), row.getObject("row_version", Long.class)))
                .optional().orElseThrow(() -> new ResponseStatusException(HttpStatus.CONFLICT));
    }

    @Override
    public void complete(SessionContext session, String operation, String key, int status, CommandResult result) {
        jdbc.sql("""
                update ops.idempotency_keys set state = 'COMPLETED', response_status = :status,
                       response_ref = jsonb_build_object('id', cast(:id as uuid), 'job_id', cast(:job as uuid),
                                                         'row_version', cast(:revision as bigint))
                 where actor_id = :actor and operation = :operation and idem_key = :key and state = 'IN_PROGRESS'
                """).param("actor", session.accountId()).param("operation", operation).param("key", key)
                .param("status", status).param("id", result.id()).param("job", result.jobId())
                .param("revision", result.rowVersion()).update();
    }
}
