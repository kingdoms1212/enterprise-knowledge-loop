package com.ekl.core.distribution.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DistributionDeliveryDaoImpl implements DistributionDeliveryDao {
    private static final String READY = """
            from ops.outbox o
            join distribution.distributions d on d.id = o.aggregate_id and d.row_version = o.aggregate_revision
            join knowledge.knowledge_versions v on v.id = d.version_id
            join knowledge.knowledge k on k.id = v.knowledge_id and k.active_version_id = v.id
            join knowledge.index_revisions i on i.id = k.active_index_revision_id and i.version_id = v.id
            join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
            where o.aggregate_type = 'DISTRIBUTION' and o.event_type = 'DistributionRequested'
              and o.state = 'PENDING' and o.available_at <= now()
              and d.trigger = 'AUTO_ON_READY' and d.state = 'QUEUED' and d.audience_policy = 'READABLE_ONLY'
              and v.state = 'PUBLISHED' and i.ready and i.superseded_at is null and not p.blocked
              and p.policy_revision = i.policy_revision and p.effective_policy_hash = i.effective_policy_hash
              and (v.effective_from is null or v.effective_from <= statement_timestamp())
              and (v.expires_at is null or v.expires_at > statement_timestamp())
            """;
    private final JdbcClient jdbc;

    DistributionDeliveryDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Work> nextReady() {
        return jdbc.sql("select o.event_id, d.id, v.id, k.organization_id " + READY
                + " order by o.created_at, o.event_id limit 1").query((r, index) -> new Work(
                r.getObject(1, UUID.class), r.getObject(2, UUID.class),
                r.getObject(3, UUID.class), r.getObject(4, UUID.class))).optional();
    }

    @Override
    public boolean lockReady(Work work) {
        return jdbc.sql("select o.event_id " + READY + """
                and o.event_id = :event for update of o, d skip locked
                """).param("event", work.eventId()).query(UUID.class).optional().isPresent();
    }

    @Override
    public List<Recipient> candidates(Work work) {
        return jdbc.sql("""
                select u.id, e.id, e.employee_no, u.display_name, a.id, a.department_id, a.assignment_type
                from distribution.distribution_targets t
                join iam.assignments a on a.department_id = t.department_id and a.organization_id = :org
                join iam.employments e on e.id = a.employment_id and e.organization_id = a.organization_id
                join iam.users u on u.person_id = e.person_id and u.organization_id = e.organization_id
                join iam.persons p on p.id = e.person_id and p.status = 'ACTIVE'
                where t.distribution_id = :id and t.active and not t.excluded and not t.include_descendants
                  and u.active and u.deactivated_at is null and a.status = 'ACTIVE' and e.status = 'ACTIVE'
                  and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
                  and e.valid_from <= now() and (e.valid_to is null or e.valid_to > now())
                order by u.id, a.id
                """).param("id", work.distributionId()).param("org", work.organizationId())
                .query((r, index) -> new Recipient(new SessionContext(work.organizationId(), r.getObject(1, UUID.class),
                        r.getObject(2, UUID.class), r.getString(3), r.getString(4), r.getObject(5, UUID.class), 0),
                        r.getObject(6, UUID.class), r.getString(7))).list();
    }

    @Override
    public void deliver(Work work, Recipient recipient) {
        var user = recipient.context().accountId();
        jdbc.sql("""
                insert into distribution.receipts (distribution_id, user_id, department_id, version_id)
                values (:id, :user, :department, :version) on conflict (version_id, user_id) do nothing
                """).param("id", work.distributionId()).param("user", user)
                .param("department", recipient.departmentId()).param("version", work.versionId()).update();
        jdbc.sql("""
                insert into distribution.receipt_bases
                    (distribution_id, user_id, assignment_id, department_id, assignment_type)
                select distribution_id, user_id, :assignment, :department, :type
                from distribution.receipts where distribution_id = :id and user_id = :user
                on conflict do nothing
                """).param("id", work.distributionId()).param("user", user)
                .param("assignment", recipient.context().assignmentId()).param("department", recipient.departmentId())
                .param("type", recipient.assignmentType()).update();
        jdbc.sql("""
                insert into distribution.distribution_deliveries (distribution_id, user_id, department_id, state, attempts)
                values (:id, :user, :department, 'DELIVERED', 1) on conflict do nothing
                """).param("id", work.distributionId()).param("user", user)
                .param("department", recipient.departmentId()).update();
    }

    @Override
    public void finish(Work work) {
        jdbc.sql("""
                update distribution.distributions set state = 'DELIVERED', state_changed_at = now(),
                    delivered_at = now(), row_version = row_version + 1 where id = :id
                """).param("id", work.distributionId()).update();
        jdbc.sql("""
                insert into distribution.distribution_state_transitions (distribution_id, from_state, to_state)
                values (:id, 'QUEUED', 'DELIVERED')
                """).param("id", work.distributionId()).update();
        jdbc.sql("""
                update ops.outbox set state = 'SUCCEEDED', attempts = attempts + 1, finished_at = now() where event_id = :event
                """).param("event", work.eventId()).update();
    }
}
