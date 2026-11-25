package com.ekl.core.voice.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class VoiceDaoImpl extends BaseDao<VoiceSummary> implements VoiceDao {
    private static final String READ_SQL = """
            select v.id, v.kind, v.channel, v.pii_status, v.triage_status
               from intake.voices v
               join iam.resource_policies p on p.resource_id = v.id
              where v.id = :resourceId
                and p.organization_id = :organizationId
                and p.acl_id = :aclId
                and p.policy_revision = :policyRevision
                and not p.blocked
                and p.classification_level is not null
            """;

    VoiceDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<VoiceSummary> findReadable(ResourceReadScope scope) {
        return queryOne(READ_SQL, scope.sqlParameters(), (row, index) -> new VoiceSummary(
                row.getObject("id", UUID.class), row.getString("kind"), row.getString("channel"),
                row.getString("pii_status"), row.getString("triage_status")));
    }
}
