package com.ekl.core.distribution.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.distribution.DistributionSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DistributionDaoImpl extends BaseDao<DistributionSummary> implements DistributionDao {
    private static final String READ_SQL = """
            select d.id, d.version_id, d.state, d.acknowledgement_required
               from distribution.distributions d
               join iam.resource_policies p on p.resource_id = d.version_id
              where d.version_id = :resourceId
                and p.organization_id = :organizationId
                and p.acl_id = :aclId
                and p.policy_revision = :policyRevision
                and not p.blocked
                and p.classification_level is not null
            order by d.created_at desc, d.id
             limit 1
            """;

    DistributionDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<DistributionSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new DistributionSummary(
                row.getObject("id", UUID.class), row.getObject("version_id", UUID.class),
                row.getString("state"), row.getBoolean("acknowledgement_required")));
    }
}
