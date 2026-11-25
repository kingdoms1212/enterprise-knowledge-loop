package com.ekl.common.folder.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.folder.FolderSummary;
import com.ekl.framework.dao.BaseDao;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class FolderDaoImpl extends BaseDao<FolderSummary> implements FolderDao {
    private static final String READ_SQL = """
                select f.id, f.name, f.owner_department_id, f.parent_id
                  from intake.document_folders f
                  join iam.resource_policies p on p.resource_id = f.id
                 where f.id = :resourceId
                   and f.archived_at is null
                   and p.organization_id = :organizationId
                   and p.acl_id = :aclId
                   and p.policy_revision = :policyRevision
                   and not p.blocked
                   and p.classification_level is not null
                """;

    FolderDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<FolderSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new FolderSummary(
                row.getObject("id", UUID.class),
                row.getString("name"),
                row.getObject("owner_department_id", UUID.class),
                row.getObject("parent_id", UUID.class)));
    }
}
