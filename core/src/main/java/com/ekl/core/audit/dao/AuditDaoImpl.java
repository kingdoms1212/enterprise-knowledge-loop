package com.ekl.core.audit.dao;

import java.util.Map;
import java.util.Optional;
import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.core.audit.AuditEventSummary;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class AuditDaoImpl extends BaseDao<AuditEventSummary> implements AuditDao {
    private static final String SQL = """
            select id, occurred_at, action, decision, reason_code
              from audit.audit_events
             where organization_id = :organizationId and id = :eventId and occurred_at = :occurredAt
            """;

    private final JdbcClient jdbc;

    AuditDaoImpl(JdbcClient jdbc) {
        super(jdbc);
        this.jdbc = jdbc;
    }

    @Override
    public void recordAccess(ResourceAccessAudit access) {
        var session = access.session();
        jdbc.sql("""
                insert into audit.audit_events (organization_id, actor_id, actor_person_id, actor_employment_id,
                    actor_assignment_id, context_revision, action, target_type, target_resource_id,
                    decision, reason_code, policy_revision)
                values (:orgId, :accountId, :personId, :employmentId, :assignmentId, :contextRevision, :action,
                    :resourceType, :resourceId, :decision, :reasonCode, :policyRevision)
                """)
                .param("orgId", session.organizationId()).param("accountId", session.accountId())
                .param("personId", access.personId()).param("employmentId", session.employmentId())
                .param("assignmentId", session.assignmentId()).param("contextRevision", session.contextRevision())
                .param("action", access.action()).param("resourceType", access.resourceType())
                .param("resourceId", access.resourceId()).param("decision", access.allowed() ? "ALLOW" : "DENY")
                .param("reasonCode", access.reasonCode()).param("policyRevision", access.policyRevision())
                .update();
    }

    @Override
    public Optional<AuditEventSummary> findEvent(UUID organizationId, UUID eventId, OffsetDateTime occurredAt) {
        var parameters = Map.of("organizationId", organizationId, "eventId", eventId, "occurredAt", occurredAt);
        return queryOne(SQL, parameters, (row, index) -> new AuditEventSummary(row.getObject("id", UUID.class), row.getObject("occurred_at", OffsetDateTime.class),
                row.getString("action"), row.getString("decision"), row.getString("reason_code")));
    }
}
