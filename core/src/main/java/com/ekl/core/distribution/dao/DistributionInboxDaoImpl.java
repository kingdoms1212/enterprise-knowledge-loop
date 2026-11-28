package com.ekl.core.distribution.dao;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.auth.SessionContext;
import com.ekl.core.distribution.DistributionInbox;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DistributionInboxDaoImpl implements DistributionInboxDao {
    private static final String RECEIPTS = """
            from distribution.receipts r
            join distribution.receipt_bases b on b.distribution_id = r.distribution_id and b.user_id = r.user_id
            join distribution.distributions d on d.id = r.distribution_id and d.version_id = r.version_id
            join knowledge.knowledge_versions v on v.id = r.version_id
            join knowledge.knowledge k on k.id = v.knowledge_id and k.active_version_id = v.id
            join knowledge.index_revisions i on i.id = k.active_index_revision_id and i.version_id = v.id
            join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
            where r.user_id = :account and b.assignment_id = :assignment and b.revoked_at is null
              and k.organization_id = :org and d.state in ('DELIVERED', 'PARTIAL_FAILED')
              and v.state = 'PUBLISHED' and i.ready and i.superseded_at is null and not p.blocked
              and i.policy_revision = p.policy_revision and i.effective_policy_hash = p.effective_policy_hash
              and (v.effective_from is null or v.effective_from <= statement_timestamp())
              and (v.expires_at is null or v.expires_at > statement_timestamp())
            """;

    private final JdbcClient jdbc;

    DistributionInboxDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> candidates(SessionContext session, UUID after, int limit) {
        return query("select r.version_id " + RECEIPTS + """
                and (cast(:after as uuid) is null or r.version_id > :after)
                order by r.version_id limit :limit
                """, session).param("after", after).param("limit", limit).query(UUID.class).list();
    }

    @Override
    public Optional<DistributionInbox.Item> item(SessionContext session, ResourceReadScope scope) {
        return query("select d.id, v.id, k.title, v.version_no, r.delivered_at, r.acknowledged_at " + RECEIPTS + """
                and r.version_id = :version and p.acl_id = :acl and p.policy_revision = :revision
                """, session).param("version", scope.resourceId()).param("acl", scope.aclId())
                .param("revision", scope.policyRevision())
                .query((row, index) -> new DistributionInbox.Item(row.getObject(1, UUID.class),
                        row.getObject(2, UUID.class), row.getString(3), row.getInt(4),
                        row.getObject(5, OffsetDateTime.class), row.getObject(6, OffsetDateTime.class))).optional();
    }

    private JdbcClient.StatementSpec query(String sql, SessionContext session) {
        return jdbc.sql(sql).param("account", session.accountId()).param("assignment", session.assignmentId())
                .param("org", session.organizationId());
    }
}
