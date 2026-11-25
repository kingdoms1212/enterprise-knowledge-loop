package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class KnowledgeDaoImpl extends BaseDao<KnowledgeVersionSummary> implements KnowledgeDao {
    private static final String READ_SQL = """
            select v.id, v.knowledge_id, v.version_no, v.kind, v.state
               from knowledge.knowledge_versions v
               join iam.resource_policies p on p.resource_id = v.id
              where v.id = :resourceId
                and p.organization_id = :organizationId
                and p.acl_id = :aclId
                and p.policy_revision = :policyRevision
                and not p.blocked
                and p.classification_level is not null
            """;

    KnowledgeDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<KnowledgeVersionSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new KnowledgeVersionSummary(
                row.getObject("id", UUID.class), row.getObject("knowledge_id", UUID.class),
                row.getInt("version_no"), row.getString("kind"), row.getString("state")));
    }
}
