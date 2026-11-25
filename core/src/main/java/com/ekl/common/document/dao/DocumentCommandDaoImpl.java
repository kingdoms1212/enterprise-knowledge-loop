package com.ekl.common.document.dao;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DocumentCommandDaoImpl implements DocumentCommandDao {
    private final JdbcClient jdbc;

    DocumentCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<LockedDocument> lock(UUID organization, UUID id) {
        return jdbc.sql("""
                select d.owner_department_id, r.owner_id, d.row_version
                  from intake.documents d join iam.secured_resources r on r.id = d.id
                  join iam.resource_policies p on p.resource_id = d.id
                 where r.organization_id = :org and d.id = :id and d.disposed_at is null
                 for update of d, p
                """).param("org", organization).param("id", id)
                .query((row, index) -> new LockedDocument(row.getObject(1, UUID.class), row.getObject(2, UUID.class),
                        row.getLong(3))).optional();
    }

    @Override
    public void create(UUID id, UUID department, UUID folder, String title) {
        jdbc.sql("""
                insert into intake.documents (id, title, owner_department_id, folder_id)
                values (:id, :title, :dept, :folder)
                """).param("id", id).param("title", title).param("dept", department).param("folder", folder).update();
    }

    @Override
    public void addVersion(UUID id, UUID version, String blob, byte[] hash, int bytes, String mime, UUID actor) {
        jdbc.sql("""
                insert into intake.blobs (blob_key, sha256, size_bytes, mime, zone, state, created_by)
                values (:blob, :hash, :bytes, :mime, 'QUARANTINE', 'ACTIVE', :actor)
                """).param("blob", blob).param("hash", hash).param("bytes", bytes)
                .param("mime", mime).param("actor", actor).update();
        jdbc.sql("""
                insert into intake.document_versions (id, document_id, version_no, blob_key, sha256, mime, created_by)
                values (:version, :id,
                    (select coalesce(max(version_no), 0) + 1 from intake.document_versions where document_id = :id),
                    :blob, :hash, :mime, :actor)
                """).param("version", version).param("id", id).param("blob", blob)
                .param("hash", hash).param("mime", mime).param("actor", actor).update();
    }

    @Override
    public void replaceCurrent(UUID id, UUID version, long revision) {
        jdbc.sql("""
                update intake.documents set current_version_id = :version, row_version = row_version + 1
                where id = :id and row_version = :revision
                """).param("id", id).param("version", version).param("revision", revision).update();
    }

    @Override
    public boolean publishable(UUID id, UUID version) {
        return jdbc.sql("""
                select id from intake.document_versions where document_id = :id and id = :version
                 and parse_status = 'PARSED' and publish_state = 'DRAFT' for update
                """).param("id", id).param("version", version).query(UUID.class).optional().isPresent();
    }

    @Override
    public void publish(UUID id, UUID version, UUID actor, long revision) {
        retirePublishedVersion(id);
        jdbc.sql("""
                update intake.document_versions set publish_state = 'PUBLISHED', published_by = :actor, published_at = now()
                where id = :version and document_id = :id
                """).param("id", id).param("version", version).param("actor", actor).update();
        jdbc.sql("""
                update intake.documents set published_version_id = :version, active_index_revision_id = null,
                    row_version = row_version + 1 where id = :id and row_version = :revision
                """).param("id", id).param("version", version).param("revision", revision).update();
    }

    @Override
    public boolean unpublish(UUID id, UUID version, long revision) {
        int updated = jdbc.sql("""
                update intake.documents set published_version_id = null, active_index_revision_id = null,
                    row_version = row_version + 1
                 where id = :id and published_version_id = :version and row_version = :revision
                """).param("id", id).param("version", version).param("revision", revision).update();
        if (updated == 0) {
            return false;
        }
        retirePublishedVersion(id);
        return true;
    }

    @Override
    public void retire(UUID id, UUID actor, String reason, long revision) {
        retirePublishedVersion(id);
        jdbc.sql("""
                update intake.documents set published_version_id = null, active_index_revision_id = null,
                    disposed_at = now(), disposed_by = :actor, disposal_reason = :reason, row_version = row_version + 1
                where id = :id and row_version = :revision
                """).param("id", id).param("actor", actor).param("reason", reason).param("revision", revision).update();
    }

    private void retirePublishedVersion(UUID id) {
        jdbc.sql("""
                update intake.document_versions set publish_state = 'RETIRED'
                where document_id = :id and publish_state = 'PUBLISHED'
                """).param("id", id).update();
    }
}
