package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class KnowledgeCommandDaoImpl implements KnowledgeCommandDao {
    private final JdbcClient jdbc;

    KnowledgeCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<LockedVersion> lock(UUID organization, UUID id, UUID version) {
        return jdbc.sql("""
                select v.state, v.row_version, p.acl_id from knowledge.knowledge_versions v
                  join knowledge.knowledge k on k.id = v.knowledge_id
                  join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
                 where k.id = :id and k.organization_id = :org and v.id = :version for update of k, v, p
                """).param("id", id).param("org", organization).param("version", version)
                .query((row, index) -> new LockedVersion(row.getString(1), row.getLong(2),
                        row.getObject(3, UUID.class))).optional();
    }

    @Override
    public void retire(UUID id, UUID version, long revision, String reason) {
        jdbc.sql("""
                update knowledge.knowledge_versions set state = 'RETIRED', retired_reason = 'RETIRED',
                    retire_note = :reason, row_version = row_version + 1
                 where id = :version and row_version = :revision
                """).param("version", version).param("reason", reason).param("revision", revision).update();
        jdbc.sql("""
                update knowledge.knowledge set active_version_id = null, active_index_revision_id = null,
                    row_version = row_version + 1 where id = :id and active_version_id = :version
                """).param("id", id).param("version", version).update();
    }

    @Override
    public void editDraft(UUID version, long revision, UUID actor, String body, byte[] hash) {
        jdbc.sql("""
                update knowledge.knowledge_versions set body = :body, content_hash = :hash,
                    row_version = row_version + 1 where id = :version and row_version = :revision
                """).param("version", version).param("revision", revision).param("body", body)
                .param("hash", hash).update();
        jdbc.sql("""
                insert into knowledge.knowledge_version_edits (version_id, editor_id, body, content_hash)
                values (:version, :actor, :body, :hash)
                """).param("version", version).param("actor", actor).param("body", body).param("hash", hash).update();
    }
}
