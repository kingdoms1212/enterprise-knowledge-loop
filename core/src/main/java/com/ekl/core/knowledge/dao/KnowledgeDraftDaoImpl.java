package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.knowledge.NewKnowledge;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class KnowledgeDraftDaoImpl implements KnowledgeDraftDao {
    private final JdbcClient jdbc;

    KnowledgeDraftDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<SourcePolicy> lockSource(UUID organization, NewKnowledge.Source source) {
        var query = source.document() != null ? """
                select d.id, 'DOCUMENT', p.owner_department_id, p.classification_level
                from intake.document_versions v join intake.documents d on d.id = v.document_id
                join iam.resource_policies p on p.resource_id = d.id
                where v.id = :source and v.publish_state = 'PUBLISHED' and d.published_version_id = v.id
                  and d.disposed_at is null and p.organization_id = :org and p.classification_level is not null
                for share of d, v, p
                """ : """
                select c.id, 'CASE', p.owner_department_id, p.classification_level
                from casework.outcomes o join casework.cases c on c.id = o.case_id
                join iam.resource_policies p on p.resource_id = c.id
                where o.id = :source and c.id = :caseId and o.state = 'VERIFIED' and c.state = 'CLOSED'
                  and p.organization_id = :org and p.classification_level is not null
                for share of c, o, p
                """;
        var statement = jdbc.sql(query).param("org", organization)
                .param("source", source.document() != null ? source.document() : source.outcome());
        if (source.caseId() != null) {
            statement.param("caseId", source.caseId());
        }
        return statement.query((row, index) -> new SourcePolicy(row.getObject(1, UUID.class), row.getString(2),
                row.getObject(3, UUID.class), row.getInt(4))).optional();
    }

    @Override
    public void insert(SessionContext session, UUID knowledge, UUID version, NewKnowledge input, byte[] contentHash) {
        jdbc.sql("""
                insert into knowledge.knowledge (id, organization_id, title, owner_id)
                values (:id, :org, :title, :actor)
                """).param("id", knowledge).param("org", session.organizationId()).param("title", input.title())
                .param("actor", session.accountId()).update();
        jdbc.sql("""
                insert into knowledge.knowledge_versions (id, knowledge_id, version_no, kind, body, content_hash,
                    created_by)
                values (:version, :id, 1, :kind, :body, :hash, :actor)
                """).param("version", version).param("id", knowledge).param("kind", input.kind())
                .param("body", input.body()).param("hash", contentHash).param("actor", session.accountId()).update();
    }

    @Override
    public void addSource(UUID version, NewKnowledge.Source source, SourcePolicy policy) {
        jdbc.sql("""
                insert into knowledge.knowledge_sources (version_id, document_version_id, case_id,
                    outcome_id, source_locator, source_role)
                values (:version, :document, :case, :outcome, jsonb_build_object('location', cast(:locator as text)), :role)
                """).param("version", version).param("document", source.document()).param("case", source.caseId())
                .param("outcome", source.outcome()).param("locator", source.locator()).param("role", source.role()).update();
        jdbc.sql("""
                insert into iam.resource_dependencies (resource_id, depends_on_resource_id, required_action)
                values (:version, :source, 'READ') on conflict do nothing
                """).param("version", version).param("source", policy.resourceId()).update();
    }

    @Override
    public boolean matchesRequestedPolicy(UUID version, UUID acl, String sharing) {
        return jdbc.sql("""
                select id from (select resource_id as id, acl_id, sharing_scope from iam.resource_policies
                                  where resource_id = :version) p
                 where (cast(:acl as uuid) is null or p.acl_id = :acl)
                   and (cast(:sharing as text) is null or p.sharing_scope = :sharing)
                """).param("version", version).param("acl", acl).param("sharing", sharing)
                .query(UUID.class).optional().isPresent();
    }

    @Override
    public UUID initialVersion(UUID knowledge) {
        return jdbc.sql("select id from knowledge.knowledge_versions where knowledge_id = :id and version_no = 1")
                .param("id", knowledge).query(UUID.class).single();
    }
}
