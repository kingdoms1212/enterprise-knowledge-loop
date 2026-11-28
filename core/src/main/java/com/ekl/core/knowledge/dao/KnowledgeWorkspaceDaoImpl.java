package com.ekl.core.knowledge.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeWorkspace;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class KnowledgeWorkspaceDaoImpl implements KnowledgeWorkspaceDao {
    private static final String SCOPED = """
            from knowledge.knowledge_versions v
            join knowledge.knowledge k on k.id = v.knowledge_id
            join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
            where v.id = :version and k.organization_id = :org and p.acl_id = :acl
              and p.policy_revision = :policy and not p.blocked
            """;
    private static final String ROW = "select v.id, k.id, k.title, v.version_no, v.kind, v.state ";
    private final JdbcClient jdbc;

    KnowledgeWorkspaceDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> candidates(UUID organization, UUID account, UUID after, int limit) {
        return jdbc.sql("""
                select v.id from knowledge.knowledge_versions v
                join knowledge.knowledge k on k.id = v.knowledge_id
                where k.organization_id = :org and v.created_by = :account
                  and v.state in ('DRAFT', 'REVIEW', 'APPROVED')
                  and (cast(:after as uuid) is null or v.id > :after)
                order by v.id limit :limit
                """).param("org", organization).param("account", account).param("after", after)
                .param("limit", limit).query(UUID.class).list();
    }

    @Override
    public List<UUID> reviewCandidates(UUID organization, UUID assignment, UUID after, int limit) {
        return jdbc.sql("""
                select l.version_id from knowledge.approval_lines l
                  join knowledge.approval_line_steps s on s.line_id = l.id and s.state = 'OPEN' and s.step_kind = 'FINAL'
                  join iam.assignments a on a.department_id = s.department_id and a.organization_id = l.organization_id
                where l.organization_id = :org and l.state = 'IN_PROGRESS' and l.case_id is null and a.id = :assignment
                  and (cast(:after as uuid) is null or l.version_id > :after)
                order by l.version_id limit :limit
                """).param("org", organization).param("assignment", assignment).param("after", after)
                .param("limit", limit).query(UUID.class).list();
    }

    @Override
    public Optional<KnowledgeWorkspace.Row> row(ResourceReadScope scope) {
        return scoped(ROW + SCOPED, scope).query((result, index) -> rowOf(result)).optional();
    }

    @Override
    public Optional<StoredDetail> detail(ResourceReadScope scope) {
        return scoped(ROW + ", v.body, v.row_version, v.created_by, p.owner_department_id " + SCOPED, scope)
                .query((result, index) -> new StoredDetail(rowOf(result), result.getString(7), result.getLong(8),
                        result.getObject(9, UUID.class), result.getObject(10, UUID.class))).optional();
    }

    @Override
    public List<KnowledgeWorkspace.Source> liveSources(UUID version) {
        return jdbc.sql("""
                select d.id, c.id, coalesce(d.title, c.title), dv.version_no, s.source_locator ->> 'location'
                from knowledge.knowledge_sources s
                left join intake.document_versions dv on dv.id = s.document_version_id
                left join intake.documents d on d.id = dv.document_id
                left join casework.outcomes o on o.id = s.outcome_id and o.case_id = s.case_id
                left join casework.cases c on c.id = o.case_id
                where s.version_id = :version and (
                    (d.disposed_at is null and dv.publish_state = 'PUBLISHED' and d.published_version_id = dv.id)
                    or (c.state = 'CLOSED' and o.state = 'VERIFIED'))
                order by s.id
                """).param("version", version).query((r, index) -> new KnowledgeWorkspace.Source(
                r.getObject(1, UUID.class), r.getObject(2, UUID.class), r.getString(3),
                r.getObject(4, Integer.class), r.getString(5))).list();
    }

    @Override
    public int sourceCount(UUID version) {
        return jdbc.sql("select count(*) from knowledge.knowledge_sources where version_id = :version")
                .param("version", version).query(Integer.class).single();
    }

    private JdbcClient.StatementSpec scoped(String sql, ResourceReadScope scope) {
        return jdbc.sql(sql).param("version", scope.resourceId()).param("org", scope.organizationId())
                .param("acl", scope.aclId()).param("policy", scope.policyRevision());
    }

    private static KnowledgeWorkspace.Row rowOf(java.sql.ResultSet r) throws java.sql.SQLException {
        return new KnowledgeWorkspace.Row(r.getObject(1, UUID.class), r.getObject(2, UUID.class),
                r.getString(3), r.getInt(4), r.getString(5), r.getString(6));
    }
}
