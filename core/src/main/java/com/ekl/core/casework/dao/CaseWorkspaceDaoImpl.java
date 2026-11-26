package com.ekl.core.casework.dao;

import java.sql.ResultSet;
import java.sql.SQLException;
import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseWorkspace;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class CaseWorkspaceDaoImpl implements CaseWorkspaceDao {
    private static final String FILTER = """
             where c.organization_id = :organizationId and c.id = :resourceId and p.organization_id = :organizationId
               and p.acl_id = :aclId and p.policy_revision = :policyRevision and not p.blocked
            """;
    private final JdbcClient jdbc;

    CaseWorkspaceDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public List<UUID> candidates(UUID organization, UUID after, int limit) {
        return jdbc.sql("""
                select id from casework.cases where organization_id = :org
                   and (cast(:after as uuid) is null or id > :after)
                 order by id limit :limit
                """).param("org", organization).param("after", after).param("limit", limit).query(UUID.class).list();
    }

    @Override
    public Optional<CaseWorkspace.Row> findRow(ResourceReadScope scope) {
        return jdbc.sql("""
                select c.id, c.title, c.state, c.close_type, c.created_at
                  from casework.cases c join iam.resource_policies p on p.resource_id = c.id
                """ + FILTER).params(scope.sqlParameters()).query((result, index) -> row(result)).optional();
    }

    @Override
    public Optional<DetailRow> findDetail(ResourceReadScope scope) {
        return jdbc.sql("""
                select c.id, c.title, c.state, c.close_type, c.created_at, c.type_final, c.urgency_final, c.close_note,
                       c.row_version, c.department_id, dept.name as department_name, d.decision, d.reason, d.decided_at,
                       o.result, o.summary, o.state as outcome_state,
                       exists (select 1 from casework.case_department_tasks t where t.case_id = c.id and t.required
                                  and t.status not in ('COMPLETED','CANCELLED')) as pending_tasks
                  from casework.cases c
                  join iam.resource_policies p on p.resource_id = c.id
                  join iam.departments dept on dept.id = c.department_id and dept.organization_id = c.organization_id
                  left join casework.human_decisions d on d.id = c.current_decision_id and d.case_id = c.id
                  left join lateral (
                    select result, summary, state from casework.outcomes
                     where case_id = c.id and decision_id = d.id and state <> 'INVALIDATED'
                     order by row_version desc, id desc limit 1
                  ) o on true
                """ + FILTER).params(scope.sqlParameters()).query((rs, index) -> {
                    var decisionTime = rs.getObject("decided_at", OffsetDateTime.class);
                    var decision = decisionTime == null ? null : new CaseWorkspace.Decision(rs.getString("decision"),
                            rs.getString("reason"), decisionTime);
                    var result = rs.getString("result");
                    var outcome = result == null ? null : new CaseWorkspace.Outcome(result, rs.getString("summary"),
                            rs.getString("outcome_state"));
                    return new DetailRow(row(rs), rs.getObject("department_id", UUID.class), rs.getString("department_name"),
                            rs.getString("type_final"), rs.getString("urgency_final"), rs.getString("close_note"),
                            rs.getLong("row_version"), decision, outcome, rs.getBoolean("pending_tasks"));
                }).optional();
    }

    private CaseWorkspace.Row row(ResultSet rs) throws SQLException {
        return new CaseWorkspace.Row(rs.getObject("id", UUID.class), rs.getString("title"), rs.getString("state"),
                rs.getString("close_type"), rs.getObject("created_at", OffsetDateTime.class));
    }
}
