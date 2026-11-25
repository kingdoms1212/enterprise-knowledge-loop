package com.ekl.core.casework.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class CaseDaoImpl extends BaseDao<CaseSummary> implements CaseDao {
    private static final String READ_SQL = """
            select c.id, c.title, c.state, c.close_type
               from casework.cases c
               join iam.resource_policies p on p.resource_id = c.id
              where c.id = :resourceId
                and p.organization_id = :organizationId
                and p.acl_id = :aclId
                and p.policy_revision = :policyRevision
                and not p.blocked
                and p.classification_level is not null
            """;

    CaseDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<CaseSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new CaseSummary(
                row.getObject("id", UUID.class), row.getString("title"), row.getString("state"), row.getString("close_type")));
    }
}
