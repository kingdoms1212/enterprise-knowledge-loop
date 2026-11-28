package com.ekl.core.distribution.dao;

import java.time.OffsetDateTime;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DistributionCommandDaoImpl implements DistributionCommandDao {
    private final JdbcClient jdbc;

    DistributionCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Long> lockPublishedVersion(UUID organization, UUID version) {
        return jdbc.sql("""
                select v.row_version from knowledge.knowledge_versions v
                  join knowledge.knowledge k on k.id = v.knowledge_id
                  join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
                 where v.id = :version and k.organization_id = :org and v.state = 'PUBLISHED'
                   and (v.effective_from is null or v.effective_from <= now())
                   and (v.expires_at is null or v.expires_at > now())
                 for update of v, p
                """).param("org", organization).param("version", version).query(Long.class).optional();
    }

    @Override
    public boolean withinApprovedDepartment(UUID organization, UUID version, UUID department) {
        return jdbc.sql("""
                select d.id from iam.departments d join iam.resource_policies p on p.organization_id = d.organization_id
                 where d.id = :dept and d.organization_id = :org and p.resource_id = :version
                   and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
                   and (p.owner_department_id = d.id or exists (
                       select 1 from iam.resource_scope_values s where s.resource_id = p.resource_id
                        and s.dimension = 'DEPARTMENT' and s.department_id = d.id))
                   and (p.department_scope_mode = 'NOT_APPLICABLE' or exists (
                       select 1 from iam.resource_scope_values s where s.resource_id = p.resource_id
                        and s.dimension = 'DEPARTMENT' and s.department_id = d.id))
                 for share of d
                """).param("org", organization).param("version", version).param("dept", department)
                .query(UUID.class).optional().isPresent();
    }

    @Override
    public void create(UUID id, UUID version, UUID actor, String reason, boolean acknowledgementRequired) {
        createPlanRow(id, version, actor, reason, acknowledgementRequired, "MANUAL");
    }

    @Override
    public void createAuto(UUID id, UUID version, UUID actor, String reason) {
        createPlanRow(id, version, actor, reason, true, "AUTO_ON_READY");
    }

    @Override
    public Optional<UUID> plannedAuto(UUID version) {
        return jdbc.sql("""
                select id from distribution.distributions
                where version_id = :version and trigger = 'AUTO_ON_READY' and state = 'PLANNED'
                for update
                """).param("version", version).query(UUID.class).optional();
    }

    private void createPlanRow(UUID id, UUID version, UUID actor, String reason, boolean acknowledgementRequired,
                               String trigger) {
        jdbc.sql("""
                insert into distribution.distributions (id, version_id, created_by, state, reason,
                    acknowledgement_required, audience_policy, idempotency_key, trigger)
                values (:id, :version, :actor, 'PLANNED', :reason, :ack, 'READABLE_ONLY', :key, :trigger)
                """).param("id", id).param("version", version).param("actor", actor)
                .param("reason", reason).param("ack", acknowledgementRequired)
                .param("key", trigger + "/" + id).param("trigger", trigger).update();
        transition(id, null, "PLANNED", actor);
    }

    @Override
    public void addTarget(UUID id, UUID version, UUID department) {
        jdbc.sql("""
                insert into distribution.distribution_targets (distribution_id, version_id, department_id, active)
                values (:id, :version, :dept, true)
                """).param("id", id).param("version", version).param("dept", department).update();
    }

    @Override
    public void enqueuePlan(UUID id, UUID actor) {
        jdbc.sql("""
                update distribution.distributions set state = 'QUEUED', approved_by = :actor, queued_at = now(),
                    state_changed_at = now(), row_version = row_version + 1
                 where id = :id and state = 'PLANNED' and row_version = 0
                """).param("id", id).param("actor", actor).update();
        transition(id, "PLANNED", "QUEUED", actor);
    }

    private void transition(UUID id, String previous, String next, UUID actor) {
        jdbc.sql("""
                insert into distribution.distribution_state_transitions (distribution_id, from_state, to_state, actor_id)
                values (:id, :previous, :next, :actor)
                """).param("id", id).param("previous", previous).param("next", next).param("actor", actor).update();
    }

    @Override
    public Optional<LockedDistribution> lock(UUID organization, UUID id) {
        return jdbc.sql("""
                select d.version_id, d.state, d.row_version from distribution.distributions d
                  join knowledge.knowledge_versions v on v.id = d.version_id
                  join knowledge.knowledge k on k.id = v.knowledge_id
                  join knowledge.index_revisions i on i.id = k.active_index_revision_id and i.version_id = v.id
                 where d.id = :id and k.organization_id = :org and v.state = 'PUBLISHED'
                   and k.active_version_id = v.id and i.ready and i.superseded_at is null
                   and (v.effective_from is null or v.effective_from <= now())
                   and (v.expires_at is null or v.expires_at > now())
                 for update of d for share of v, k, i
                """).param("id", id).param("org", organization).query((row, index) ->
                new LockedDistribution(row.getObject(1, UUID.class), row.getString(2), row.getLong(3))).optional();
    }

    @Override
    public boolean canRetry(UUID id) {
        return jdbc.sql("""
                select exists (select 1 from distribution.distribution_deliveries
                    where distribution_id = :id and state = 'FAILED')
                    and not exists (select 1 from ops.outbox where aggregate_id = :id
                        and event_type = 'DistributionRedeliveryRequested'
                        and state in ('PENDING','RUNNING','RETRY_WAIT'))
                """).param("id", id).query(Boolean.class).single();
    }

    @Override
    public void bumpRevision(UUID id, long revision) {
        jdbc.sql("""
                update distribution.distributions set row_version = row_version + 1
                 where id = :id and row_version = :revision
                """).param("id", id).param("revision", revision).update();
    }

    @Override
    public Optional<UUID> lockReceipt(SessionContext session, UUID id) {
        return jdbc.sql("""
                select d.version_id from distribution.distributions d
                  join distribution.receipts r on r.distribution_id = d.id and r.version_id = d.version_id
                  join distribution.receipt_bases b on b.distribution_id = r.distribution_id and b.user_id = r.user_id
                  join knowledge.knowledge_versions v on v.id = d.version_id
                  join knowledge.knowledge k on k.id = v.knowledge_id
                  join knowledge.index_revisions i on i.id = k.active_index_revision_id and i.version_id = v.id
                 where d.id = :id and k.organization_id = :org and r.user_id = :actor
                   and b.assignment_id = :assignment and b.revoked_at is null
                   and d.state in ('DELIVERED','PARTIAL_FAILED') and v.state = 'PUBLISHED'
                   and k.active_version_id = v.id and i.ready and i.superseded_at is null
                   and (v.effective_from is null or v.effective_from <= now())
                   and (v.expires_at is null or v.expires_at > now())
                 for update of r for share of d, b, k, v, i
                """).param("id", id).param("org", session.organizationId()).param("actor", session.accountId())
                .param("assignment", session.assignmentId()).query(UUID.class).optional();
    }

    @Override
    public OffsetDateTime acknowledge(UUID id, UUID account) {
        return jdbc.sql("""
                update distribution.receipts set acknowledged_at = coalesce(acknowledged_at, now())
                 where distribution_id = :id and user_id = :actor returning acknowledged_at
                """).param("id", id).param("actor", account).query(OffsetDateTime.class).single();
    }

    @Override
    public void withdrawVersion(UUID organization, UUID version, UUID actor) {
        jdbc.sql("""
                with previous as (
                    select d.id, d.state from distribution.distributions d
                      join knowledge.knowledge_versions v on v.id = d.version_id
                      join knowledge.knowledge k on k.id = v.knowledge_id
                     where d.version_id = :version and k.organization_id = :org
                       and d.state not in ('CANCELLED','WITHDRAWN','SUPERSEDED')
                     for update of d
                ), changed as (
                    update distribution.distributions d set state =
                        case when p.state = 'PLANNED' then 'CANCELLED' else 'WITHDRAWN' end,
                        state_changed_at = now(), row_version = d.row_version + 1
                      from previous p where d.id = p.id returning d.id, p.state as previous_state, d.state
                )
                insert into distribution.distribution_state_transitions (distribution_id, from_state, to_state, actor_id)
                select id, previous_state, state, :actor from changed
                """).param("version", version).param("org", organization).param("actor", actor).update();
        jdbc.sql("""
                update distribution.distribution_targets t set active = false
                  from distribution.distributions d, knowledge.knowledge_versions v, knowledge.knowledge k
                 where t.distribution_id = d.id and d.version_id = v.id and v.knowledge_id = k.id
                   and v.id = :version and k.organization_id = :org and d.state in ('CANCELLED','WITHDRAWN')
                """).param("version", version).param("org", organization).update();
    }
}
