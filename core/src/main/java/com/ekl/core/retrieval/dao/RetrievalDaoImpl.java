package com.ekl.core.retrieval.dao;

import java.util.Map;
import java.util.List;
import java.util.UUID;
import com.ekl.common.acl.ResourceSearchScope;

import com.ekl.core.retrieval.KeywordHit;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class RetrievalDaoImpl extends BaseDao<KeywordHit> implements RetrievalDao {
    private static final String SQL = """
            select s.chunk_id, coalesce(s.document_version_id, s.knowledge_version_id) as version_id,
                   s.source_kind, c.source_locator::text as source_locator, ts_rank(s.search_tsv, q.term) as rank
              from knowledge.v_searchable_chunks s
              join knowledge.chunks c on c.id = s.chunk_id
              join iam.resource_policies p on p.resource_id = s.resource_id
             cross join plainto_tsquery('simple', :tokens) as q(term)
             where s.organization_id = :organizationId and s.resource_id = :resourceId and s.acl_id = :aclId
               and p.organization_id = :organizationId and p.acl_id = :aclId
               and p.policy_revision = :policyRevision and not p.blocked and p.classification_level is not null
               and s.search_tsv @@ q.term
             order by rank desc, s.chunk_id
             limit :limit
            """;

    RetrievalDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public List<KeywordHit> searchKeywords(ResourceSearchScope scope, String tokens, int limit) {
        var parameters = Map.of("organizationId", scope.organizationId(), "resourceId", scope.resourceId(),
                "aclId", scope.aclId(), "policyRevision", scope.policyRevision(),
                "tokens", tokens, "limit", limit);
        return queryList(SQL, parameters, (row, index) -> new KeywordHit(row.getObject("chunk_id", UUID.class), row.getObject("version_id", UUID.class),
                row.getString("source_kind"), row.getString("source_locator"), row.getFloat("rank")));
    }
}
