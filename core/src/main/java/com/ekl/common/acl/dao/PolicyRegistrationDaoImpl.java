package com.ekl.common.acl.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourcePolicyRegistration;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class PolicyRegistrationDaoImpl implements PolicyRegistrationDao {
    private final JdbcClient jdbc;

    PolicyRegistrationDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public boolean activeDepartment(UUID organizationId, UUID departmentId) {
        return jdbc.sql("""
                select id from iam.departments where id = :department and organization_id = :org
                  and active and valid_from <= now() and (valid_to is null or valid_to > now())
                for share
                """).param("org", organizationId).param("department", departmentId).query(UUID.class)
                .optional().isPresent();
    }

    @Override
    public boolean denyEnabled(UUID organizationId) {
        return jdbc.sql("""
                select deny_rules_enabled from iam.policy_settings where organization_id = :org for share
                """).param("org", organizationId).query(Boolean.class).optional().orElse(false);
    }

    @Override
    public Optional<UUID> departmentPrincipal(UUID organizationId, UUID departmentId) {
        return jdbc.sql("""
                select id from iam.principals where organization_id = :org and kind = 'DEPARTMENT'
                 and department_id = :dept
                """).param("org", organizationId).param("dept", departmentId).query(UUID.class).optional();
    }

    @Override
    public Optional<Template> template(ResourcePolicyRegistration r) {
        return jdbc.sql("""
                select id, revision, sharing_scope, department_scope_mode, customer_scope_mode,
                       project_scope_mode, inherit_acl, name
                  from iam.policy_templates t
                 where organization_id = :org and resource_type = :type and classification_level = :level
                   and (department_id = :dept or department_id is null) and status = 'ACTIVE'
                   and exists (select 1 from iam.policy_change_requests c
                                where c.id = t.policy_change_id and c.organization_id = t.organization_id
                                  and c.state = 'APPLIED' and c.change_type = 'POLICY_TEMPLATE')
                 order by department_id nulls last limit 1 for share
                """).param("org", r.organizationId()).param("type", r.resourceType())
                .param("level", r.classification()).param("dept", r.departmentId())
                .query((row, index) -> new Template(row.getObject(1, UUID.class), row.getLong(2), row.getString(3),
                        row.getString(4), row.getString(5), row.getString(6), row.getBoolean(7), row.getString(8))).optional();
    }

    @Override
    public List<Rule> rules(ResourcePolicyRegistration r, UUID template) {
        return jdbc.sql("""
                with recursive department_path(entrance_id, id) as (
                    select id, id from iam.departments where organization_id = :org and active
                    union
                    select dp.entrance_id, d.id from department_path dp join iam.departments d
                      on d.parent_id = dp.id and d.organization_id = :org and d.active
                )
                select distinct p.id, e.action, e.effect
                  from iam.policy_template_entries e
                  join iam.principals p on p.organization_id = :org and (
                       (e.subject_kind in ('OWNER_DEPARTMENT','RECEIVED_DEPARTMENT','PRIMARY_DEPARTMENT')
                           and p.kind = 'DEPARTMENT' and p.department_id = :dept)
                        or (e.subject_kind = 'PRINCIPAL' and p.id = e.principal_id)
                        or (e.subject_kind = 'PRINCIPAL' and e.include_descendants and p.kind = 'DEPARTMENT'
                            and exists (select 1 from iam.principals src
                                        join department_path dp on dp.entrance_id = src.department_id
                                       where src.id = e.principal_id and dp.id = p.department_id))
                        or (e.subject_kind in ('OWNER_DEPARTMENT','RECEIVED_DEPARTMENT','PRIMARY_DEPARTMENT')
                            and e.include_descendants and p.kind = 'DEPARTMENT'
                            and exists (select 1 from department_path dp
                                        where dp.entrance_id = :dept and dp.id = p.department_id)))
                 where e.template_id = :template
                 order by p.id, e.action, e.effect
                """).param("org", r.organizationId()).param("dept", r.departmentId()).param("template", template)
                .query((row, index) -> new Rule(row.getObject(1, UUID.class), row.getString(2), row.getString(3))).list();
    }

    @Override
    public Optional<FolderPolicy> inheritedPolicy(ResourcePolicyRegistration r) {
        return jdbc.sql("""
                select p.acl_id, f.name, coalesce(:level, p.classification_level), p.sharing_scope
                  from iam.resource_policies p join intake.document_folders f on f.id = p.resource_id
                 where p.resource_id = :parent and p.organization_id = :org and p.owner_department_id = :dept
                   and f.archived_at is null and not p.blocked and p.classification_level is not null
                   and coalesce(:level, p.classification_level) <= p.classification_level
                """).param("level", r.classification()).param("parent", r.parentId()).param("org", r.organizationId())
                .param("dept", r.departmentId()).query((row, index) ->
                        new FolderPolicy(row.getObject(1, UUID.class), row.getString(2), row.getInt(3), row.getString(4))).optional();
    }

    @Override
    public List<Rule> currentRules(UUID acl) {
        return jdbc.sql("""
                select principal_id, action, effect from iam.aces
                 where acl_id = :acl and emergency_grant_id is null and valid_from <= now()
                   and (expires_at is null or expires_at > now())
                 order by action, effect, principal_id
                """).param("acl", acl).query((row, index) ->
                        new Rule(row.getObject(1, UUID.class), row.getString(2), row.getString(3))).list();
    }

    @Override
    public UUID acl(ResourcePolicyRegistration r, String canonical, byte[] hash) {
        jdbc.sql("""
                insert into iam.acls (organization_id, canonical_hash, canonical_json, policy_version, created_by)
                values (:org, :hash, cast(:json as jsonb), 1, :actor)
                on conflict (organization_id, canonical_hash) do nothing
                """).param("org", r.organizationId()).param("hash", hash).param("json", canonical)
                .param("actor", r.actorId()).update();
        return jdbc.sql("select id from iam.acls where organization_id = :org and canonical_hash = :hash")
                .param("org", r.organizationId()).param("hash", hash).query(UUID.class).single();
    }

    @Override
    public void insertRule(ResourcePolicyRegistration r, UUID acl, Rule rule) {
        jdbc.sql("""
                insert into iam.aces (acl_id, principal_id, action, effect, valid_from, created_by)
                values (:acl, :principal, :action, :effect, timestamp with time zone '1970-01-01 00:00:00+00', :actor)
                on conflict do nothing
                """).param("acl", acl).param("principal", rule.principal()).param("action", rule.action())
                .param("effect", rule.effect()).param("actor", r.actorId()).update();
    }

    @Override
    public void registerResource(ResourcePolicyRegistration r) {
        jdbc.sql("""
                insert into iam.secured_resources (id, organization_id, resource_type, owner_id)
                values (:id, :org, :type, :actor)
                """).param("id", r.resourceId()).param("org", r.organizationId())
                .param("type", r.resourceType()).param("actor", r.actorId()).update();
    }

    @Override
    public boolean inherit(ResourcePolicyRegistration r) {
        int inserted = jdbc.sql("""
                insert into iam.resource_policies (resource_id, organization_id, owner_department_id, acl_id,
                    classification_level, sharing_scope, parent_resource_id, inherit_acl, department_scope_mode,
                    customer_scope_mode, project_scope_mode, effective_policy_hash, acl_origin)
                select :id, p.organization_id, p.owner_department_id, acl_id, coalesce(:level, classification_level),
                       sharing_scope, resource_id, true, department_scope_mode, customer_scope_mode, project_scope_mode,
                       sha256(convert_to(encode(effective_policy_hash, 'hex') || ':' ||
                             coalesce(cast(:level as text), classification_level::text), 'UTF8')), 'INHERITED'
                  from iam.resource_policies p join intake.document_folders f on f.id = p.resource_id
                 where p.resource_id = :parent and p.organization_id = :org and p.owner_department_id = :dept
                   and f.archived_at is null and not p.blocked and p.classification_level is not null
                   and coalesce(:level, p.classification_level) <= p.classification_level
                """)
                .param("id", r.resourceId()).param("level", r.classification())
                .param("parent", r.parentId()).param("org", r.organizationId()).param("dept", r.departmentId()).update();
        if (inserted == 1) {
            jdbc.sql("""
                    insert into iam.resource_scope_values (resource_id, dimension, department_id, customer_id, project_id)
                    select :id, dimension, department_id, customer_id, project_id
                      from iam.resource_scope_values where resource_id = :parent
                    """).param("id", r.resourceId()).param("parent", r.parentId()).update();
        }
        return inserted == 1;
    }

    @Override
    public void assignTemplate(ResourcePolicyRegistration r, Template t, UUID acl, byte[] hash) {
        jdbc.sql("""
                insert into iam.resource_policies (resource_id, organization_id, owner_department_id, acl_id,
                    classification_level, sharing_scope, inherit_acl, department_scope_mode, customer_scope_mode,
                    project_scope_mode, effective_policy_hash, acl_origin, template_id, template_revision)
                values (:id, :org, :dept, :acl, :level, :sharing, :inherit, :deptMode, :customerMode,
                        :projectMode, :hash, 'TEMPLATE', :template, :revision)
                """).param("id", r.resourceId()).param("org", r.organizationId()).param("dept", r.departmentId())
                .param("acl", acl).param("level", r.classification()).param("sharing", t.sharing())
                .param("inherit", t.inherit()).param("deptMode", t.departmentMode()).param("customerMode", t.customerMode())
                .param("projectMode", t.projectMode()).param("hash", hash).param("template", t.id())
                .param("revision", t.revision()).update();
        if ("RESTRICTED".equals(t.departmentMode())) {
            jdbc.sql("""
                    insert into iam.resource_scope_values (resource_id, dimension, department_id)
                    values (:id, 'DEPARTMENT', :dept)
                    """).param("id", r.resourceId()).param("dept", r.departmentId()).update();
        }
    }
}
