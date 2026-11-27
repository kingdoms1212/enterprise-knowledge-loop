package com.ekl.core.job.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.DocumentOutboxJob;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DocumentParseJobDaoImpl implements DocumentParseJobDao {
    private final JdbcClient jdbc;

    DocumentParseJobDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<DocumentOutboxJob> claim(String eventType) {
        var lease = UUID.randomUUID();
        return jdbc.sql("""
                with candidate as (
                    select event_id, attempts >= max_attempts as exhausted from ops.outbox
                    where aggregate_type = 'DOCUMENT' and event_type = :eventType
                      and ((state in ('PENDING', 'RETRY_WAIT') and available_at <= now())
                        or (state = 'RUNNING' and lease_until <= now()))
                    order by available_at, created_at, event_id
                    limit 1 for update skip locked
                )
                update ops.outbox o set state = 'RUNNING', lease_owner = :lease,
                    lease_until = now() + interval '60 seconds',
                    attempts = case when c.exhausted then o.attempts else o.attempts + 1 end
                from candidate c where o.event_id = c.event_id
                returning o.event_id, o.aggregate_id, (o.payload ->> 'version_id')::uuid, o.attempts,
                          o.max_attempts, c.exhausted
                """).param("lease", lease.toString()).param("eventType", eventType)
                .query((row, index) -> new DocumentOutboxJob(row.getObject(1, UUID.class),
                        row.getObject(2, UUID.class), row.getObject(3, UUID.class), lease,
                        row.getInt(4), row.getInt(5), row.getBoolean(6))).optional();
    }

    @Override
    public Optional<DocumentOutboxJob.Input> input(DocumentOutboxJob job) {
        return jdbc.sql("""
                select v.blob_key, v.mime, v.sha256 from intake.document_versions v
                join intake.documents d on d.id = v.document_id
                join intake.blobs b on b.blob_key = v.blob_key
                where v.id = :version and d.id = :document and d.disposed_at is null
                  and v.parse_status = 'PENDING' and b.state = 'ACTIVE' and b.zone = 'QUARANTINE'
                """).param("document", job.document()).param("version", job.version())
                .query((row, index) -> new DocumentOutboxJob.Input(row.getString(1), row.getString(2),
                        row.getBytes(3))).optional();
    }

    @Override
    public boolean lockLease(DocumentOutboxJob job) {
        return jdbc.sql("""
                select event_id from ops.outbox
                where event_id = :id and state = 'RUNNING' and lease_owner = :lease and lease_until > now()
                for update
                """).param("id", job.id()).param("lease", job.lease().toString())
                .query(UUID.class).optional().isPresent();
    }

    @Override
    public void updateDocument(DocumentOutboxJob job, String status, String result) {
        var active = jdbc.sql("""
                select id from intake.documents where id = :document and disposed_at is null for update
                """).param("document", job.document()).query(UUID.class).optional();
        if (active.isPresent()) {
            jdbc.sql("""
                    update intake.document_versions set parse_status = :status, parse_result = cast(:result as jsonb)
                    where id = :version and document_id = :document and parse_status = 'PENDING'
                    """).param("status", status).param("result", result).param("version", job.version())
                    .param("document", job.document()).update();
        }
    }

    @Override
    public void finish(DocumentOutboxJob job, String state, String error) {
        jdbc.sql("""
                update ops.outbox set state = :state, last_error_code = :error,
                    lease_owner = null, lease_until = null,
                    finished_at = case when :state = 'RETRY_WAIT' then null else now() end,
                    available_at = case when :state = 'RETRY_WAIT'
                        then now() + make_interval(secs => :delay) else available_at end
                where event_id = :id
                """).param("state", state).param("error", error)
                .param("delay", Math.min(300, 1 << Math.min(job.attempts(), 9)))
                .param("id", job.id()).update();
    }
}
