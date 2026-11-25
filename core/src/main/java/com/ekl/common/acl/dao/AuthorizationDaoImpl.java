package com.ekl.common.acl.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class AuthorizationDaoImpl implements AuthorizationDao {
    private final JdbcClient jdbc;

    AuthorizationDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Subject> loadSubject(SessionContext session) {
        return jdbc.sql("""
                select e.person_id, a.department_id, e.clearance_level
                  from iam.assignments a
                  join iam.employments e on e.id = a.employment_id and e.organization_id = a.organization_id
                  join iam.departments d on d.id = a.department_id and d.organization_id = a.organization_id
                  join iam.users u on u.id = :accountId and u.person_id = e.person_id
                                   and u.organization_id = e.organization_id
                 where a.id = :assignmentId and a.employment_id = :employmentId and a.organization_id = :orgId
                   and u.active and u.deactivated_at is null
                   and a.status = 'ACTIVE' and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
                   and e.status = 'ACTIVE' and e.valid_from <= now() and (e.valid_to is null or e.valid_to > now())
                   and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
                """)
                .param("assignmentId", session.assignmentId()).param("employmentId", session.employmentId())
                .param("orgId", session.organizationId()).param("accountId", session.accountId())
                .query((row, index) -> new Subject(row.getObject("person_id", UUID.class),
                        row.getObject("department_id", UUID.class), row.getObject("clearance_level", Integer.class)))
                .optional();
    }

    @Override
    public List<UUID> loadPrincipals(SessionContext session, Subject subject) {
        return jdbc.sql("""
                select p.id
                  from iam.principals p
                 where p.organization_id = :orgId
                   and (p.kind = 'EVERYONE'
                        or (p.kind = 'USER' and p.person_id = :personId)
                        or (p.kind = 'DEPARTMENT' and p.department_id = :departmentId)
                        or (p.kind = 'GROUP' and exists (
                            select 1 from iam.group_memberships m
                             where m.assignment_id = :assignmentId and m.organization_id = p.organization_id
                               and m.group_id = p.group_id and m.valid_from <= now()
                               and (m.valid_to is null or m.valid_to > now())))
                        or (p.kind = 'ROLE' and exists (
                            select 1 from iam.role_bindings rb
                             where rb.assignment_id = :assignmentId and rb.role_id = p.role_id
                               and rb.status = 'ACTIVE' and rb.valid_from <= now()
                               and (rb.valid_to is null or rb.valid_to > now()))))
                """)
                .param("orgId", session.organizationId()).param("personId", subject.personId())
                .param("departmentId", subject.departmentId()).param("assignmentId", session.assignmentId())
                .query(UUID.class).list();
    }

    @Override
    public List<String> loadActions(UUID assignmentId) {
        return jdbc.sql("""
                select distinct rp.permission_code
                  from iam.role_bindings rb
                  join iam.role_permissions rp on rp.role_id = rb.role_id
                 where rb.assignment_id = :assignmentId and rb.status = 'ACTIVE' and rb.valid_from <= now()
                   and (rb.valid_to is null or rb.valid_to > now())
                """).param("assignmentId", assignmentId).query(String.class).list();
    }

    @Override
    public List<DimensionValue> loadSubjectScopes(SessionContext session) {
        return jdbc.sql("""
                select dimension, coalesce(department_id, customer_id, project_id) as value_id
                  from iam.assignment_scope_grants
                 where assignment_id = :assignmentId and organization_id = :orgId and status = 'ACTIVE'
                   and valid_from <= now() and (valid_to is null or valid_to > now())
                """).param("assignmentId", session.assignmentId()).param("orgId", session.organizationId())
                .query((row, index) -> new DimensionValue(row.getString("dimension"),
                        row.getObject("value_id", UUID.class))).list();
    }

    @Override
    public Optional<Policy> loadPolicy(UUID organizationId, UUID resourceId) {
        return jdbc.sql("""
                select rp.resource_id, rp.acl_id, rp.policy_revision, rp.classification_level, rp.blocked,
                       rp.parent_resource_id, sr.resource_type, rp.department_scope_mode, rp.customer_scope_mode,
                       rp.project_scope_mode
                  from iam.resource_policies rp
                  join iam.secured_resources sr on sr.id = rp.resource_id and sr.organization_id = rp.organization_id
                  join iam.acls acl on acl.id = rp.acl_id and acl.organization_id = rp.organization_id
                 where rp.organization_id = :orgId and rp.resource_id = :resourceId
                   and not exists (select 1 from intake.documents d
                                    where d.id = sr.id and d.disposed_at is not null)
                   and not exists (select 1 from intake.document_folders f
                                    where f.id = sr.id and f.archived_at is not null)
                """).param("orgId", organizationId).param("resourceId", resourceId)
                .query((row, index) -> new Policy(row.getObject("resource_id", UUID.class),
                        row.getObject("acl_id", UUID.class), row.getLong("policy_revision"),
                        row.getObject("classification_level", Integer.class), row.getBoolean("blocked"),
                        row.getObject("parent_resource_id", UUID.class), row.getString("resource_type"),
                        row.getString("department_scope_mode"), row.getString("customer_scope_mode"),
                        row.getString("project_scope_mode"))).optional();
    }

    @Override
    public List<Rule> loadRules(UUID organizationId, UUID aclId, String action) {
        return jdbc.sql("""
                select a.principal_id, a.effect, a.emergency_grant_id, eg.resource_id, eg.requester_id
                  from iam.aces a
                  join iam.principals p on p.id = a.principal_id and p.organization_id = :orgId
                  left join iam.emergency_access_grants eg on eg.id = a.emergency_grant_id
                       and eg.organization_id = :orgId and eg.state = 'APPROVED'
                       and eg.valid_from <= now() and eg.expires_at > now()
                 where a.acl_id = :aclId and a.action = :action and a.valid_from <= now()
                   and (a.expires_at is null or a.expires_at > now())
                """).param("orgId", organizationId).param("aclId", aclId).param("action", action)
                .query((row, index) -> new Rule(row.getObject("principal_id", UUID.class), row.getString("effect"),
                        row.getObject("emergency_grant_id", UUID.class), row.getObject("resource_id", UUID.class),
                        row.getObject("requester_id", UUID.class))).list();
    }

    @Override
    public List<DimensionValue> loadPolicyScopes(UUID resourceId) {
        return jdbc.sql("""
                select dimension, coalesce(department_id, customer_id, project_id) as value_id
                  from iam.resource_scope_values where resource_id = :resourceId
                """).param("resourceId", resourceId)
                .query((row, index) -> new DimensionValue(row.getString("dimension"),
                        row.getObject("value_id", UUID.class))).list();
    }

    @Override
    public List<Dependency> loadDependencies(UUID resourceId) {
        return jdbc.sql("""
                select depends_on_resource_id, required_action
                  from iam.resource_dependencies
                 where resource_id = :resourceId and released_by_review_id is null
                """).param("resourceId", resourceId)
                .query((row, index) -> new Dependency(row.getObject("depends_on_resource_id", UUID.class),
                        row.getString("required_action"))).list();
    }
}
