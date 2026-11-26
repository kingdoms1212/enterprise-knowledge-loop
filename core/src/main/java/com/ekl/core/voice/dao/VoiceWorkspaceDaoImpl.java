package com.ekl.core.voice.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceWorkspace;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class VoiceWorkspaceDaoImpl implements VoiceWorkspaceDao {
    private static final String READABLE = """
              from intake.voices v join iam.resource_policies p on p.resource_id = v.id
             where v.organization_id = :organizationId and v.id = :resourceId and p.organization_id = :organizationId
               and p.acl_id = :aclId and p.policy_revision = :policyRevision and not p.blocked
            """;
    private final JdbcClient jdbc;

    VoiceWorkspaceDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> candidates(UUID organization, UUID after, int limit) {
        return jdbc.sql("""
                select id from intake.voices where organization_id = :org
                   and (cast(:after as uuid) is null or id > :after)
                 order by id limit :limit
                """).param("org", organization).param("after", after).param("limit", limit).query(UUID.class).list();
    }

    @Override
    public Optional<VoiceWorkspace.Row> findRow(ResourceReadScope scope) {
        return jdbc.sql("select v.id, v.title, v.channel, v.pii_status, v.triage_status, v.received_at " + READABLE)
                .params(scope.sqlParameters()).query((result, index) -> row(result)).optional();
    }

    @Override
    public Optional<VoiceWorkspace.Detail> findDetail(ResourceReadScope scope, boolean canTriage) {
        return jdbc.sql("""
                select v.id, v.title, v.channel, v.pii_status, v.triage_status, v.received_at,
                       case when v.pii_status = 'CLEANED' then v.clean_text end as clean_text,
                       v.product_code, v.urgency_hint, v.row_version
                """ + READABLE).params(scope.sqlParameters())
                .query((result, index) -> new VoiceWorkspace.Detail(row(result), result.getString("clean_text"),
                        result.getString("product_code"), result.getString("urgency_hint"), result.getLong("row_version"),
                        canTriage && ("ANALYZED".equals(result.getString("triage_status"))
                                || "ANALYSIS_FAILED".equals(result.getString("triage_status"))))).optional();
    }

    private VoiceWorkspace.Row row(ResultSet rs) throws SQLException {
        return new VoiceWorkspace.Row(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("channel"),
                rs.getString("pii_status"), rs.getString("triage_status"), rs.getObject("received_at", OffsetDateTime.class));
    }
}
