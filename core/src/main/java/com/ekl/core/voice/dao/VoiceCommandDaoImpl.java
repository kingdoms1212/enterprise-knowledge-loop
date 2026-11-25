package com.ekl.core.voice.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.voice.VoiceChange;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class VoiceCommandDaoImpl implements VoiceCommandDao {
    private final JdbcClient jdbc;

    VoiceCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<UUID> primaryDepartment(SessionContext session) {
        return jdbc.sql("""
                select a.department_id from iam.assignments a
                  join iam.departments d on d.id = a.department_id and d.organization_id = a.organization_id
                 where a.employment_id = :employment and a.organization_id = :org
                   and a.assignment_type = 'PRIMARY' and a.status = 'ACTIVE'
                   and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
                   and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
                """).param("employment", session.employmentId()).param("org", session.organizationId())
                .query(UUID.class).optional();
    }

    @Override
    public boolean validCustomer(UUID organization, UUID customer) {
        return jdbc.sql("select id from iam.customers where id = :id and organization_id = :org")
                .param("id", customer).param("org", organization).query(UUID.class).optional().isPresent();
    }

    @Override
    public Optional<UUID> duplicate(UUID organization, byte[] hash, String channel, String externalId) {
        return jdbc.sql("""
                select id from intake.voices where organization_id = :org and
                  (dedup_key = :hash or (channel = :channel and external_id = :externalId))
                order by created_at limit 1
                """).param("org", organization).param("hash", hash).param("channel", channel)
                .param("externalId", externalId).query(UUID.class).optional();
    }

    @Override
    public void create(SessionContext s, UUID id, UUID department, String channel, String externalId,
                       byte[] hash, VoiceChange.Intake input, String blob, byte[] blobHash, int size) {
        var datasetName = "Manual intake " + s.organizationId();
        var dataset = jdbc.sql("""
                select id from intake.source_datasets where source_type = 'INTERNAL' and name = :name limit 1
                """).param("name", datasetName).query(UUID.class).optional().orElseGet(() -> jdbc.sql("""
                insert into intake.source_datasets (source_type, name, license_or_usage_basis, allowed_uses)
                values ('INTERNAL', :name, 'Internal VOC processing', array['OPERATIONS'])
                returning id
                """).param("name", datasetName).query(UUID.class).single());
        jdbc.sql("""
                insert into intake.blobs (blob_key, sha256, size_bytes, mime, zone, state, created_by)
                values (:blob, :hash, :size, 'text/plain; charset=utf-8', 'RAW_SENSITIVE', 'ACTIVE', :actor)
                """).param("blob", blob).param("hash", blobHash).param("size", size).param("actor", s.accountId()).update();
        jdbc.sql("""
                insert into intake.voices (id, organization_id, title, kind, channel, external_id, dedup_key, raw_blob_key,
                    received_department_id, customer_id, product_code, received_at, urgency_hint, raw_classification,
                    triage_status, created_by, dataset_id)
                values (:id, :org, :title, :kind, :channel, :externalId, :hash, :blob, :dept, :customer, :product,
                    :received, :urgency, 3, 'RECEIVED', :actor, :dataset)
                """).param("id", id).param("org", s.organizationId()).param("title", input.title()).param("kind",
                        "INTERNAL_MANUAL".equals(channel) ? "INTERNAL_PROPOSAL" : "EXTERNAL_VOC")
                .param("channel", channel).param("externalId", externalId).param("hash", hash).param("blob", blob)
                .param("dept", department).param("customer", input.customerId()).param("product", input.productCode())
                .param("received", input.receivedAt()).param("urgency", input.urgency()).param("actor", s.accountId())
                .param("dataset", dataset).update();
        jdbc.sql("""
                insert into intake.data_provenance (dataset_id, voice_id, source_record_key, review_status)
                values (:dataset, :voice, :externalId, 'PENDING')
                """).param("dataset", dataset).param("voice", id).param("externalId", input.externalId()).update();
    }

    @Override
    public Optional<LockedVoice> lock(UUID organization, UUID id) {
        return jdbc.sql("""
                select v.title, v.product_code, v.triage_status, v.row_version, p.classification_level,
                       a.output_json ->> 'type_suggested', a.output_json ->> 'urgency_suggested',
                       a.output_json ->> 'primary_department_id'
                  from intake.voices v join iam.resource_policies p on p.resource_id = v.id
                  left join lateral (select output_json from casework.ai_analyses where voice_id = v.id
                       and task = 'CLASSIFY' and status = 'SUCCEEDED' order by created_at desc, id desc limit 1) a on true
                 where v.organization_id = :org and v.id = :id and p.classification_level is not null for update of v, p
                """).param("org", organization).param("id", id)
                .query((row, index) -> new LockedVoice(row.getString(1), row.getString(2), row.getString(3),
                        row.getLong(4), row.getInt(5), row.getString(6), row.getString(7), row.getString(8))).optional();
    }

    @Override
    public void markTriaged(UUID id, long version) {
        jdbc.sql("""
                update intake.voices set triage_status = 'TRIAGED', row_version = row_version + 1
                 where id = :id and row_version = :version
                """).param("id", id).param("version", version).update();
    }

}
