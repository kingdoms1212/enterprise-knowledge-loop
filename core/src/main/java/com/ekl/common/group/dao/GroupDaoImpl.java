package com.ekl.common.group.dao;

import java.util.Map;
import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class GroupDaoImpl extends BaseDao<GroupSummary> implements GroupDao {
    private static final String SQL = """
            select g.id, g.name, g.group_type
              from iam.group_memberships m
              join iam.groups g on g.id = m.group_id and g.organization_id = m.organization_id
              join iam.assignments a on a.id = m.assignment_id and a.organization_id = m.organization_id
              join iam.employments e on e.id = a.employment_id and e.organization_id = a.organization_id
              join iam.departments d on d.id = a.department_id and d.organization_id = a.organization_id
              join iam.persons p on p.id = e.person_id
              join iam.organizations o on o.id = e.organization_id
             where m.organization_id = :organizationId and m.assignment_id = :assignmentId
               and m.valid_from <= now() and (m.valid_to is null or m.valid_to > now())
               and a.status = 'ACTIVE' and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
               and e.status = 'ACTIVE' and e.valid_from <= now() and (e.valid_to is null or e.valid_to > now())
               and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
               and p.status = 'ACTIVE' and o.active
             order by g.name, g.id
            """;

    GroupDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId) {
        var parameters = Map.of("organizationId", organizationId, "assignmentId", assignmentId);
        return queryList(SQL, parameters, (row, index) -> new GroupSummary(row.getObject("id", UUID.class), row.getString("name"), row.getString("group_type")));
    }
}
