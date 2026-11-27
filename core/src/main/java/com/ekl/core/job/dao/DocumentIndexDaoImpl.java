package com.ekl.core.job.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.DocumentIndexJob.Chunk;
import com.ekl.core.job.DocumentIndexJob.Source;
import com.ekl.core.job.DocumentOutboxJob;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import tools.jackson.databind.json.JsonMapper;

@Repository
class DocumentIndexDaoImpl implements DocumentIndexDao {
    private final JdbcClient jdbc;
    private final JsonMapper json;

    DocumentIndexDaoImpl(JdbcClient jdbc, JsonMapper json) {
        this.jdbc = jdbc;
        this.json = json;
    }

    @Override
    public Optional<UUID> organization(UUID document) {
        return jdbc.sql("""
                select organization_id from iam.secured_resources where id = :id and resource_type = 'DOCUMENT'
                """).param("id", document).query(UUID.class).optional();
    }

    @Override
    public Optional<Source> publishedSource(DocumentOutboxJob job) {
        return jdbc.sql("""
                select p.organization_id, v.id, p.acl_id, p.policy_revision, coalesce(e.revision, 0),
                       p.effective_policy_hash, a.pipeline_version_id, v.parse_result::text
                from intake.documents d
                join intake.document_versions v on v.id = d.published_version_id
                join iam.resource_policies p on p.resource_id = d.id
                left join iam.policy_epoch e on e.organization_id = p.organization_id
                left join ops.active_pipeline a on a.organization_id = p.organization_id
                where d.id = :document and v.id = :version and d.disposed_at is null
                  and v.publish_state = 'PUBLISHED' and v.parse_status = 'PARSED' and not p.blocked
                for update of d, p
                """).param("document", job.document()).param("version", job.version())
                .query((row, index) -> new Source(row.getObject(1, UUID.class), row.getObject(2, UUID.class),
                        row.getObject(3, UUID.class), row.getLong(4), row.getLong(5), row.getBytes(6),
                        row.getObject(7, UUID.class), row.getString(8))).optional();
    }

    @Override
    public UUID createRevision(UUID document, Source source) {
        return jdbc.sql("""
                insert into knowledge.index_revisions
                    (source_kind, document_id, document_version_id, pipeline_version_id,
                     policy_revision, effective_policy_hash, security_metadata)
                values ('DOCUMENT_VERSION', :document, :version, :pipeline, :policy,
                        :hash, jsonb_build_object('acl_id', cast(:acl as uuid), 'retrieval', 'FTS_ONLY'))
                on conflict (document_version_id, pipeline_version_id, policy_revision)
                do update set superseded_at = null
                returning id
                """).param("document", document).param("version", source.version()).param("pipeline", source.pipeline())
                .param("policy", source.revision()).param("hash", source.policyHash()).param("acl", source.acl())
                .query(UUID.class).single();
    }

    @Override
    public void writeKeywordIndex(DocumentOutboxJob job, Source source, UUID revision, List<Chunk> chunks) {
        var run = jdbc.sql("""
                insert into ops.pipeline_runs
                     (pipeline_version_id, source_kind, source_id, policy_revision, idempotency_key,
                      outbox_event_id, job_id, state, started_at, finished_at)
                values (:pipeline, 'DOCUMENT_VERSION', :version, :policy, :key,
                        :event, :event, 'SUCCEEDED', now(), now())
                on conflict (idempotency_key) do update set state = 'SUCCEEDED', finished_at = now()
                returning id
                """).param("pipeline", source.pipeline()).param("version", source.version()).param("policy", source.revision())
                .param("key", "document-fts:" + job.id()).param("event", job.id()).query(UUID.class).single();
        jdbc.sql("""
                insert into knowledge.chunks
                    (id, index_revision_id, ordinal, text, text_hash, source_locator,
                     pipeline_run_id, acl_id, policy_epoch, search_tokens)
                select c.id, :revision, c.ordinal, c.text, sha256(convert_to(c.text, 'UTF8')),
                       c.locator, :run, :acl, :epoch, c.text
                from jsonb_to_recordset(cast(:chunks as jsonb)) as c(id uuid, ordinal int, text text, locator jsonb)
                on conflict (index_revision_id, ordinal) do nothing
                """).param("chunks", json.writeValueAsString(chunks)).param("revision", revision)
                .param("run", run).param("acl", source.acl()).param("epoch", source.epoch()).update();
        jdbc.sql("""
                update knowledge.index_revisions set keyword_state = 'READY', chunk_count = :count
                where id = :revision
                """).param("revision", revision).param("count", chunks.size()).update();
        jdbc.sql("""
                update intake.documents set active_index_revision_id = :revision
                where id = :document and published_version_id = :version
                """).param("revision", revision).param("document", job.document()).param("version", source.version()).update();
        supersedeInactive(job.document());
    }

    @Override
    public void supersedeInactive(UUID document) {
        jdbc.sql("""
                update knowledge.index_revisions i set superseded_at = now()
                from intake.documents d
                where d.id = :document and i.document_id = d.id and i.superseded_at is null
                  and i.id is distinct from d.active_index_revision_id
                """).param("document", document).update();
    }
}
