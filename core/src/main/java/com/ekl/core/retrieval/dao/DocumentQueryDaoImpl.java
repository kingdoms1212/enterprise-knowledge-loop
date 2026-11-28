package com.ekl.core.retrieval.dao;

import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceSearchScope;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.service.LocalBlobStore;
import com.ekl.core.retrieval.DocumentQuery.Hit;
import com.ekl.core.retrieval.DocumentQuery.Pipeline;
import com.ekl.core.retrieval.DocumentQuery.Response;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

import static java.nio.charset.StandardCharsets.UTF_8;

@Repository
class DocumentQueryDaoImpl implements DocumentQueryDao {
    private static final byte[] FTS_CONFIG = LocalBlobStore.sha256("document-fts-v1:simple".getBytes(UTF_8));
    // The shared view requires both vector and keyword readiness. This path uses keyword readiness only.
    private static final String INDEXED = """
            from intake.documents d
            join intake.document_versions v on v.id = d.published_version_id and v.publish_state = 'PUBLISHED'
            join iam.resource_policies p on p.resource_id = d.id and not p.blocked
            join knowledge.index_revisions i on i.id = d.active_index_revision_id
               and i.document_id = d.id and i.document_version_id = v.id and i.source_kind = 'DOCUMENT_VERSION'
               and i.keyword_state = 'READY' and i.superseded_at is null
            join ops.active_pipeline a on a.organization_id = p.organization_id and a.pipeline_version_id = i.pipeline_version_id
            """;

    private final JdbcClient jdbc;
    private final JsonMapper json;

    DocumentQueryDaoImpl(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    public Optional<Pipeline> pipeline(UUID organization) {
        return jdbc.sql("""
                select p.pipeline_version_id, coalesce(e.revision, 0) from ops.active_pipeline p
                left join iam.policy_epoch e on e.organization_id = p.organization_id
                where p.organization_id = :org
                """).param("org", organization).query((row, index) ->
                new Pipeline(row.getObject(1, UUID.class), row.getLong(2))).optional();
    }

    @Override
    public List<UUID> indexedDocuments(UUID organization) {
        return jdbc.sql("select d.id " + INDEXED + " where p.organization_id = :org and d.disposed_at is null")
                .param("org", organization).query(UUID.class).list();
    }

    @Override
    public List<Hit> search(UUID organization, List<ResourceSearchScope> scopes, String question, int limit) {
        var allowed = json.writeValueAsString(scopes.stream().map(scope -> Map.of("resource_id", scope.resourceId(),
                "acl_id", scope.aclId(), "revision", scope.policyRevision())).toList());
        return jdbc.sql("""
                with allowed as (
                    select * from jsonb_to_recordset(cast(:allowed as jsonb))
                        as a(resource_id uuid, acl_id uuid, revision bigint)
                )
                select c.id, i.id, d.id, v.id, c.acl_id, p.policy_revision, v.version_no, d.title,
                       (c.source_locator ->> 'page')::integer, (c.source_locator ->> 'paragraph')::integer,
                       c.text, ts_rank(c.search_tsv, term.q) as rank
                """ + INDEXED + """
                join allowed s on s.resource_id = d.id and s.acl_id = p.acl_id and s.revision = p.policy_revision
                join knowledge.chunks c on c.index_revision_id = i.id and c.acl_id = s.acl_id
                cross join plainto_tsquery('simple', :question) as term(q)
                where p.organization_id = :org and d.disposed_at is null and c.search_tsv @@ term.q
                order by rank desc, c.id limit :limit
                """).param("allowed", allowed).param("question", question).param("org", organization).param("limit", limit)
                .query((row, index) -> new Hit(row.getObject(1, UUID.class), row.getObject(2, UUID.class),
                        row.getObject(3, UUID.class), row.getObject(4, UUID.class), row.getObject(5, UUID.class),
                        row.getLong(6), row.getInt(7), row.getString(8), row.getObject(9, Integer.class),
                        row.getObject(10, Integer.class), row.getString(11), row.getFloat(12))).list();
    }

    @Override
    public boolean isCurrent(UUID organization, Hit hit) {
        return jdbc.sql("select exists (select 1 " + INDEXED + """
                join knowledge.chunks c on c.index_revision_id = i.id and c.acl_id = p.acl_id
                where p.organization_id = :org and d.disposed_at is null and d.id = :doc
                  and v.id = :version and i.id = :revision and c.id = :chunk
                  and p.acl_id = :acl and p.policy_revision = :policy)
                """).param("org", organization).param("doc", hit.document()).param("version", hit.version())
                .param("revision", hit.revision()).param("chunk", hit.chunk()).param("acl", hit.acl())
                .param("policy", hit.policyRevision()).query(Boolean.class).single();
    }

    @Override
    public void record(SessionContext session, Pipeline pipeline, UUID caseId, byte[] questionHash, int latency,
                       Response response, String auditReason, List<Hit> retrieved, Map<String, Hit> context) {
        jdbc.sql("""
                insert into ops.rag_requests (id, organization_id, actor_id, case_id, policy_epoch,
                    pipeline_version_id, status, question_hash, latency_ms, retrieval_config_hash, outcome_reason)
                values (:id, :org, :actor, :caseId, :epoch, :pipeline, :status, :hash, :latency, :config, :reason)
                """).param("id", response.requestId()).param("org", session.organizationId())
                .param("actor", session.accountId()).param("caseId", caseId).param("epoch", pipeline.epoch())
                .param("pipeline", pipeline.id()).param("status", response.status()).param("hash", questionHash)
                .param("latency", latency).param("config", FTS_CONFIG).param("reason", auditReason).update();
        int rank = 0;
        for (var hit : retrieved) {
            source(response.requestId(), "RETRIEVED", ++rank, hit, null);
        }
        rank = 0;
        var acls = new HashSet<UUID>();
        for (var entry : context.entrySet()) {
            source(response.requestId(), "CONTEXT", ++rank, entry.getValue(), entry.getKey());
            acls.add(entry.getValue().acl());
        }
        rank = 0;
        for (var citation : response.sources()) {
            source(response.requestId(), "CITED", ++rank, context.get(citation.citationKey()), citation.citationKey());
        }
        for (var acl : acls) {
            jdbc.sql("insert into ops.rag_request_acls (rag_request_id, acl_id) values (:id, :acl)")
                    .param("id", response.requestId()).param("acl", acl).update();
        }
    }

    private void source(UUID request, String stage, int rank, Hit hit, String key) {
        jdbc.sql("""
                insert into ops.rag_request_sources (request_id, stage, chunk_id, index_revision_id, rank, score, citation_key)
                values (:id, :stage, :chunk, :revision, :rank, :score, :key)
                """).param("id", request).param("stage", stage).param("chunk", hit.chunk())
                .param("revision", hit.revision()).param("rank", rank).param("score", hit.rank()).param("key", key).update();
    }
}
