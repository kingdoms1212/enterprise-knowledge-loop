package com.ekl.common.auth.dao;

import java.util.Map;
import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class AuthDaoImpl extends BaseDao<AssignmentSummary> implements AuthDao {
    private static final String SQL = """
            select a.id, a.department_id, d.name, a.assignment_type
              from iam.users u
              join iam.persons p on p.id = u.person_id
              join iam.organizations o on o.id = u.organization_id
              join iam.employments e on e.person_id = p.id and e.organization_id = u.organization_id
              join iam.assignments a on a.employment_id = e.id and a.organization_id = e.organization_id
              join iam.departments d on d.id = a.department_id and d.organization_id = a.organization_id
             where u.organization_id = :organizationId
               and u.id = :accountId and u.active and u.deactivated_at is null
               and p.status = 'ACTIVE' and o.active
               and e.status = 'ACTIVE' and e.valid_from <= now() and (e.valid_to is null or e.valid_to > now())
               and a.status = 'ACTIVE' and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
               and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
            """;
    private static final String ORDER_BY = " order by a.assignment_type desc, d.name, a.id";

    AuthDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId) {
        return findAssignments(SQL, Map.of("organizationId", organizationId, "accountId", accountId));
    }

    @Override
    public List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId, UUID employmentId) {
        return findAssignments(SQL + " and e.id = :employmentId",
                Map.of("organizationId", organizationId, "accountId", accountId, "employmentId", employmentId));
    }

    private List<AssignmentSummary> findAssignments(String query, Map<String, ?> parameters) {
        return queryList(query + ORDER_BY, parameters, (row, index) -> new AssignmentSummary(
                row.getObject("id", UUID.class), row.getObject("department_id", UUID.class),
                row.getString("name"), row.getString("assignment_type")));
    }
}
