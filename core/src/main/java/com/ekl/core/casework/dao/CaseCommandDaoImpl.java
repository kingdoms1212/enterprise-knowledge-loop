package com.ekl.core.casework.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.TriagedVoice;
import org.springframework.http.HttpStatus;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;
import org.springframework.web.server.ResponseStatusException;

@Repository
class CaseCommandDaoImpl implements CaseCommandDao {
    private final JdbcClient jdbc;

    CaseCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean handlerInDepartment(UUID organization, UUID department, UUID handler) {
        return jdbc.sql("""
                select exists (
                    select 1 from iam.users u join iam.employments e on e.person_id = u.person_id
                         and e.organization_id = u.organization_id
                     join iam.assignments a on a.employment_id = e.id and a.organization_id = e.organization_id
                    where u.id = :handler and u.organization_id = :org and u.active and u.deactivated_at is null
                      and a.department_id = :dept and a.status = 'ACTIVE' and a.valid_from <= now()
                      and (a.valid_to is null or a.valid_to > now()) and e.status = 'ACTIVE'
                      and e.valid_from <= now() and (e.valid_to is null or e.valid_to > now()))
                """).param("handler", handler).param("org", organization).param("dept", department)
                .query(Boolean.class).single();
    }

    @Override
    public void createFromTriage(SessionContext session, UUID id, TriagedVoice voice) {
        jdbc.sql("""
                insert into casework.cases (id, organization_id, title, handler_id, department_id, type_final,
                    urgency_final, product_code, triage_override_reason)
                values (:id, :org, :title, :handler, :dept, :type, :urgency, :product, :reason)
                """).param("id", id).param("org", session.organizationId()).param("title", voice.title())
                .param("handler", voice.handler()).param("dept", voice.department()).param("type", voice.type())
                .param("urgency", voice.urgency()).param("product", voice.product())
                .param("reason", voice.overrideReason()).update();
        jdbc.sql("""
                insert into casework.case_assignments (case_id, handler_id, assigned_by)
                values (:id, :handler, :actor)
                """).param("id", id).param("handler", voice.handler()).param("actor", session.accountId()).update();
        int linked = jdbc.sql("""
                insert into casework.case_voices (case_id, voice_id, linked_by)
                select :id, v.id, :actor from intake.voices v
                 where v.id = :voice and v.organization_id = :org and v.triage_status = 'TRIAGED'
                 for share of v
                """).param("id", id).param("voice", voice.id()).param("org", session.organizationId())
                .param("actor", session.accountId()).update();
        if (linked != 1) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        jdbc.sql("""
                insert into iam.resource_dependencies (resource_id, depends_on_resource_id, required_action)
                values (:id, :voice, 'READ')
                """).param("id", id).param("voice", voice.id()).update();
    }

    @Override
    public Optional<LockedCase> lock(UUID organization, UUID id) {
        return jdbc.sql("""
                select c.department_id, c.state, c.current_decision_id, c.knowledge_requested, c.row_version
                from casework.cases c join iam.resource_policies p on p.resource_id = c.id
                where c.id = :id and c.organization_id = :org for update of c, p
                """).param("org", organization).param("id", id)
                .query((row, index) -> new LockedCase(row.getObject(1, UUID.class), row.getString(2),
                        row.getObject(3, UUID.class), row.getBoolean(4), row.getLong(5))).optional();
    }

    @Override
    public boolean validAnalysis(UUID id, UUID analysis) {
        return jdbc.sql("""
                select id from casework.ai_analyses where id = :analysis and case_id = :id and status = 'SUCCEEDED'
                """).param("id", id).param("analysis", analysis).query(UUID.class).optional().isPresent();
    }

    @Override
    public boolean unfinishedTasks(UUID id) {
        return jdbc.sql("""
                select exists (select 1 from casework.case_department_tasks
                  where case_id = :id and required and status not in ('COMPLETED', 'CANCELLED'))
                """).param("id", id).query(Boolean.class).single();
    }

    @Override
    public UUID addDecision(UUID id, UUID actor, UUID previous, UUID analysis, String decision, String reason) {
        return jdbc.sql("""
                insert into casework.human_decisions (case_id, revision_no, supersedes_id, analysis_id,
                    decision, reason, decided_by)
                values (:id, (select coalesce(max(revision_no), 0) + 1 from casework.human_decisions where case_id = :id),
                    :previous, :analysis, :decision, :reason, :actor)
                returning id
                """).param("id", id).param("actor", actor).param("previous", previous).param("analysis", analysis)
                .param("decision", decision).param("reason", reason).query(UUID.class).single();
    }

    @Override
    public void recordDecision(UUID id, LockedCase row, UUID decision, UUID actor) {
        var next = "IN_ACTION".equals(row.state()) ? "IN_ACTION" : "DECIDED";
        jdbc.sql("""
                update casework.cases set current_decision_id = :decision, state = :state, row_version = row_version + 1
                 where id = :id and row_version = :version
                """).param("id", id).param("decision", decision).param("state", next)
                .param("version", row.version()).update();
        if (!next.equals(row.state())) {
            transition(id, row.state(), next, actor, null);
        }
    }

    @Override
    public void addOutcome(UUID id, UUID decision, CaseChange.Outcome outcome) {
        jdbc.sql("""
                insert into casework.outcomes (case_id, decision_id, result, summary, applicability, limitations)
                values (:id, :decision, :result, :summary, :applicability, :limitations)
                """).param("id", id).param("decision", decision).param("result", outcome.result())
                .param("summary", outcome.summary()).param("applicability", outcome.applicability())
                .param("limitations", outcome.limitations()).update();
    }

    @Override
    public Optional<PublishedSource> publishedSource(UUID organization, CaseChange.Reference reference) {
        var sql = reference.document() != null ? """
                select d.id, 'DOCUMENT', p.effective_policy_hash from intake.document_versions v
                  join intake.documents d on d.id = v.document_id and d.published_version_id = v.id
                  join iam.resource_policies p on p.resource_id = d.id
                 where v.id = :version and p.organization_id = :org and v.publish_state = 'PUBLISHED'
                   and d.disposed_at is null for share of d, v, p
                """ : """
                select v.id, 'KNOWLEDGE_VERSION', p.effective_policy_hash from knowledge.knowledge_versions v
                  join iam.resource_policies p on p.resource_id = v.id
                 where v.id = :version and p.organization_id = :org and v.state = 'PUBLISHED'
                   and (v.effective_from is null or v.effective_from <= now())
                   and (v.expires_at is null or v.expires_at > now()) for share of v, p
                """;
        return jdbc.sql(sql).param("org", organization)
                .param("version", reference.document() == null ? reference.knowledge() : reference.document())
                .query((row, index) -> new PublishedSource(row.getObject(1, UUID.class), row.getString(2),
                        row.getBytes(3))).optional();
    }

    @Override
    public void recordReference(UUID id, UUID actor, UUID decision, CaseChange.Reference reference,
                                PublishedSource source) {
        jdbc.sql("""
                insert into casework.case_references (case_id, reference_type, document_version_id, knowledge_version_id,
                    selection_origin, usage_type, reason, added_by, policy_hash_at_use)
                values (:id, :type, :document, :knowledge, 'USER_SELECTED', 'APPLIED', :reason, :actor, :hash)
                on conflict do nothing
                """).param("id", id).param("type", reference.document() == null ? "KNOWLEDGE_VERSION" : "DOCUMENT_VERSION")
                .param("document", reference.document()).param("knowledge", reference.knowledge())
                .param("reason", reference.reason()).param("actor", actor).param("hash", source.policyHash()).update();
        if (reference.knowledge() != null) {
            jdbc.sql("""
                    insert into knowledge.knowledge_reuse (knowledge_version_id, target_case_id, target_decision_id,
                        use_type, reason, recorded_by, idempotency_key)
                    values (:knowledge, :id, :decision, 'APPLIED', :reason, :actor, :key)
                    """).param("knowledge", reference.knowledge()).param("id", id).param("decision", decision)
                    .param("reason", reference.reason()).param("actor", actor).param("key", id + "/close").update();
        }
    }

    @Override
    public void close(UUID id, LockedCase row, UUID actor, UUID decision, String type, String note) {
        jdbc.sql("""
                update casework.cases set state = 'CLOSED', closed_reason = 'COMPLETED',
                    close_type = :type, close_note = :note, current_decision_id = :decision, row_version = row_version + 1
                 where id = :id and row_version = :version
                """).param("id", id).param("type", type).param("note", note).param("decision", decision)
                .param("version", row.version()).update();
        transition(id, row.state(), "CLOSED", actor, note);
    }

    private void transition(UUID id, String from, String to, UUID actor, String reason) {
        jdbc.sql("""
                insert into casework.case_state_transitions (case_id, from_state, to_state, actor_id, reason)
                values (:id, :from, :to, :actor, :reason)
                """).param("id", id).param("from", from).param("to", to)
                .param("actor", actor).param("reason", reason).update();
    }
}
