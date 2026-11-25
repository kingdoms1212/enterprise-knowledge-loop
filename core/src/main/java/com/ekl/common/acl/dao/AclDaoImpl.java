package com.ekl.common.acl.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.AclPolicy;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class AclDaoImpl extends BaseDao<AclPolicy> implements AclDao {
    private static final String READ_SQL = """
            select p.resource_id as id, p.acl_id, p.policy_revision, p.acl_origin, p.classification_level
               from iam.resource_policies p
              where p.resource_id = :resourceId
                and p.organization_id = :organizationId
                and p.acl_id = :aclId
                and p.policy_revision = :policyRevision
                and not p.blocked
                and p.classification_level is not null
            """;

    AclDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<AclPolicy> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new AclPolicy(
                row.getObject("id", UUID.class), row.getObject("acl_id", UUID.class),
                row.getLong("policy_revision"), row.getString("acl_origin"), row.getInt("classification_level")));
    }
}
