package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CommandRules;
import com.ekl.core.knowledge.KnowledgeReview.Pending;
import com.ekl.core.knowledge.KnowledgeReview.Version;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class KnowledgeReviewDaoImpl implements KnowledgeReviewDao {
    private static final String STEP = """
            select s.id, l.id, v.knowledge_id, l.version_id, s.department_id, l.drafter_id, s.state, s.row_version,
                   case when s.state in ('RETURNED', 'REJECTED') then d.reason end
            from knowledge.approval_line_steps s join knowledge.approval_lines l on l.id = s.line_id
            join knowledge.knowledge_versions v on v.id = l.version_id
            left join knowledge.approval_step_decisions d on d.step_id = s.id
            where l.organization_id = :org and l.case_id is null and s.step_kind = 'FINAL'
            """;

    private final JdbcClient jdbc;

    KnowledgeReviewDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Version> lockVersion(UUID organization, UUID knowledge, UUID version) {
        return jdbc.sql("""
                select v.id, v.created_by, p.owner_department_id, v.state, v.row_version, v.content_hash,
                       a.canonical_hash, p.effective_policy_hash, v.current_submission_id
                from knowledge.knowledge_versions v join knowledge.knowledge k on k.id = v.knowledge_id
                join iam.resource_policies p on p.resource_id = v.id and p.organization_id = k.organization_id
                join iam.acls a on a.id = p.acl_id
                where v.id = :version and k.id = :knowledge and k.organization_id = :org and not p.blocked
                for update of v, p
                """).param("org", organization).param("knowledge", knowledge).param("version", version)
                .query((r, ix) -> new Version(r.getObject(1, UUID.class), r.getObject(2, UUID.class),
                        r.getObject(3, UUID.class), r.getString(4), r.getLong(5), r.getBytes(6),
                        r.getBytes(7), r.getBytes(8), r.getObject(9, UUID.class))).optional();
    }

    @Override
    public Optional<Pending> step(UUID organization, UUID step) {
        return selectStep(" and s.id = :id for update of s, l", organization, step);
    }

    @Override
    public Optional<Pending> stepForVersion(UUID organization, UUID version) {
        return selectStep(" and l.version_id = :id order by l.line_no desc limit 1", organization, version);
    }

    private Optional<Pending> selectStep(String predicate, UUID organization, UUID id) {
        return jdbc.sql(STEP + predicate).param("org", organization).param("id", id)
                .query((r, ix) -> new Pending(r.getObject(1, UUID.class), r.getObject(2, UUID.class),
                        r.getObject(3, UUID.class), r.getObject(4, UUID.class), r.getObject(5, UUID.class),
                        r.getObject(6, UUID.class), r.getString(7), r.getLong(8), r.getString(9))).optional();
    }

    @Override
    public boolean samePerson(UUID first, UUID second) {
        return jdbc.sql("""
                select exists (
                  select 1 from iam.users a join iam.users b on b.person_id = a.person_id
                  where a.id = :actor and b.id = :author
                )
                """).param("actor", first).param("author", second).query(Boolean.class).single();
    }

    @Override
    public byte[] documentSourceHash(UUID version) {
        var hashes = jdbc.sql("""
                select s.document_version_id, s.source_role, s.source_locator::text, v.sha256,
                       p.effective_policy_hash, p.policy_revision
                from knowledge.knowledge_sources s
                join intake.document_versions v on v.id = s.document_version_id
                join intake.documents d on d.id = v.document_id and d.published_version_id = v.id
                join iam.resource_policies p on p.resource_id = d.id
                where s.version_id = :version and v.publish_state = 'PUBLISHED' and d.disposed_at is null
                  and not p.blocked
                order by s.id for share of v, d, p
                """).param("version", version).query((r, ix) -> CommandRules.digest(
                r.getObject(1, UUID.class), r.getString(2), r.getString(3),
                r.getBytes(4), r.getBytes(5), r.getLong(6))).list();
        return CommandRules.digest(hashes.toArray());
    }

    @Override
    public UUID submit(UUID organization, Version version, UUID author, byte[] sources, byte[] targets) {
        var submission = jdbc.sql("""
                insert into knowledge.submissions (version_id, submission_no, submitted_by, content_hash, acl_hash,
                    effective_policy_hash, source_revisions_hash, distribution_targets_hash)
                select :id, coalesce(max(submission_no), 0) + 1, :author, :content, :acl, :policy, :sources, :targets
                from knowledge.submissions where version_id = :id returning id
                """).param("id", version.id()).param("author", author).param("content", version.contentHash())
                .param("acl", version.aclHash()).param("policy", version.policyHash()).param("sources", sources)
                .param("targets", targets).query(UUID.class).single();
        jdbc.sql("""
                update knowledge.knowledge_versions set state = 'REVIEW', current_submission_id = :submission,
                    submitted_by = :author, submitted_at = now(), row_version = row_version + 1
                where id = :id
                """).param("submission", submission).param("author", author).param("id", version.id()).update();
        var line = jdbc.sql("""
                insert into knowledge.approval_lines (organization_id, version_id, line_no, drafter_id,
                    submission_id, state, submitted_at)
                select :org, :version, coalesce(max(line_no), 0) + 1, :author, :submission, 'IN_PROGRESS', now()
                from knowledge.approval_lines where version_id = :version returning id
                """).param("org", organization).param("version", version.id()).param("author", author)
                .param("submission", submission).query(UUID.class).single();
        return jdbc.sql("""
                insert into knowledge.approval_line_steps (organization_id, line_id, step_order,
                    step_kind, department_id, state) values (:org, :line, 2, 'FINAL', :department, 'OPEN') returning id
                """).param("org", organization).param("line", line).param("department", version.department())
                .query(UUID.class).single();
    }

    @Override
    public boolean matchesSubmission(Version version, byte[] sources, byte[] targets) {
        return jdbc.sql("""
                select exists (select 1 from knowledge.submissions
                 where id = :id and content_hash = :content and acl_hash = :acl and effective_policy_hash = :policy
                 and source_revisions_hash = :sources and distribution_targets_hash = :targets)
                """).param("id", version.submission()).param("content", version.contentHash())
                .param("acl", version.aclHash()).param("policy", version.policyHash())
                .param("sources", sources).param("targets", targets).query(Boolean.class).single();
    }

    @Override
    public void recordDecision(Version version, Pending step, UUID actor, String decision, String reason) {
        var review = jdbc.sql("""
                insert into knowledge.reviews (version_id, submission_id, reviewer_id, decision, reason,
                    content_hash, acl_hash, effective_policy_hash, source_revisions_hash, distribution_targets_hash)
                select version_id, id, :actor, :decision, :reason, content_hash, acl_hash, effective_policy_hash,
                       source_revisions_hash, distribution_targets_hash from knowledge.submissions where id = :submission
                returning id
                """).param("actor", actor).param("decision", decision).param("reason", reason)
                .param("submission", version.submission()).query(UUID.class).single();
        var closed = switch (decision) {
            case "APPROVE" -> "APPROVED";
            case "RETURN" -> "RETURNED";
            default -> "REJECTED";
        };
        jdbc.sql("""
                insert into knowledge.approval_step_decisions (step_id, line_id, decision, reason, decided_by, review_id)
                values (:step, :line, :decision, :reason, :actor, :review)
                """).param("step", step.id()).param("line", step.line()).param("decision", decision)
                .param("reason", reason).param("actor", actor).param("review", review).update();
        jdbc.sql("""
                update knowledge.approval_line_steps set state = :closed, decided_by = :actor,
                    decided_at = now(), row_version = row_version + 1 where id = :step
                """).param("closed", closed).param("actor", actor).param("step", step.id()).update();
        jdbc.sql("""
                update knowledge.approval_lines set state = :closed, closed_at = now(), row_version = row_version + 1
                where id = :line
                """).param("closed", closed).param("line", step.line()).update();
        jdbc.sql("APPROVE".equals(decision) ? """
                update knowledge.knowledge_versions set state = 'PUBLISHED', published_at = now(),
                    row_version = row_version + 1 where id = :id
                """ : """
                update knowledge.knowledge_versions set state = 'DRAFT', current_submission_id = null,
                    submitted_by = null, submitted_at = null, row_version = row_version + 1 where id = :id
                """).param("id", version.id()).update();
    }
}
