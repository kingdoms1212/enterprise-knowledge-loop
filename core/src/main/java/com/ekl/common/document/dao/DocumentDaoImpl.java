package com.ekl.common.document.dao;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;
import com.ekl.framework.dao.BaseDao;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DocumentDaoImpl extends BaseDao<DocumentSummary> implements DocumentDao {
    private static final String READ_SQL = """
                select d.id, d.title, d.owner_department_id, d.folder_id,
                       v.id as version_id, v.version_no, v.parse_status
                  from intake.documents d
                  join iam.resource_policies p on p.resource_id = d.id
                  left join intake.document_versions v on v.id = d.current_version_id
                 where d.id = :resourceId
                   and d.disposed_at is null
                   and p.organization_id = :organizationId
                   and p.acl_id = :aclId
                   and p.policy_revision = :policyRevision
                   and not p.blocked
                   and p.classification_level is not null
                """;
    private final JdbcClient jdbc;

    DocumentDaoImpl(JdbcClient jdbc) {
        super(jdbc);
        this.jdbc = jdbc;
    }

    @Override
    public Optional<DocumentSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new DocumentSummary(
                row.getObject("id", UUID.class),
                row.getString("title"),
                row.getObject("owner_department_id", UUID.class),
                row.getObject("folder_id", UUID.class),
                row.getObject("version_id", UUID.class),
                row.getObject("version_no", Integer.class),
                row.getString("parse_status")));
    }

    @Override
    public List<DocumentVersionSummary> findReadableVersions(ResourceReadScope scope) {
        return jdbc.sql("""
                select v.id, v.version_no, v.parse_status, v.publish_state, v.created_at
                  from intake.document_versions v
                  join intake.documents d on d.id = v.document_id and d.disposed_at is null
                  join iam.resource_policies p on p.resource_id = d.id
                 where d.id = :resourceId and p.organization_id = :organizationId
                   and p.acl_id = :aclId and p.policy_revision = :policyRevision
                   and not p.blocked and p.classification_level is not null
                 order by v.version_no desc
                """).params(scope.sqlParameters())
                .query((row, index) -> new DocumentVersionSummary(row.getObject("id", UUID.class),
                        row.getInt("version_no"), row.getString("parse_status"), row.getString("publish_state"),
                        row.getObject("created_at", OffsetDateTime.class))).list();
    }
}
