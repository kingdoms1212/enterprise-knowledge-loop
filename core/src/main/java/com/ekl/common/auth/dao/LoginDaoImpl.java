package com.ekl.common.auth.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.SessionContext;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class LoginDaoImpl implements LoginDao {
    private static final String VALID_IDENTITY = """
            join iam.persons p on p.id = u.person_id and p.status = 'ACTIVE'
            join iam.organizations o on o.id = u.organization_id and o.active
            join iam.employments e on e.organization_id = u.organization_id and e.person_id = p.id
                                  and e.status = 'ACTIVE' and e.valid_from <= now()
                                  and (e.valid_to is null or e.valid_to > now())
            """;
    private static final String VALID_ASSIGNMENT = """
            select a.id, a.employment_id
              from iam.assignments a
              join iam.departments d on d.id = a.department_id and d.organization_id = a.organization_id
             where a.status = 'ACTIVE' and a.valid_from <= now() and (a.valid_to is null or a.valid_to > now())
               and d.active and d.valid_from <= now() and (d.valid_to is null or d.valid_to > now())
            """;
    private final JdbcClient jdbc;

    LoginDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<Credential> findLocalCredential(UUID organizationId, String employeeNumber) {
        return jdbc.sql("""
                select u.organization_id, u.id, e.id as employment_id, u.auth_version, c.password_hash
                  from iam.users u
                """ + VALID_IDENTITY + """
                  join iam.account_credentials c on c.account_id = u.id and c.credential_type = 'LOCAL_PASSWORD'
                 where u.organization_id = :organizationId and u.active and u.deactivated_at is null
                   and e.employee_no = :employeeNumber and u.login = e.employee_no
                """)
                .param("organizationId", organizationId)
                .param("employeeNumber", employeeNumber)
                .query((row, index) -> new Credential(new LoginIdentity(row.getObject("organization_id", UUID.class),
                        row.getObject("id", UUID.class), row.getObject("employment_id", UUID.class),
                        row.getLong("auth_version")), row.getString("password_hash")))
                .optional();
    }

    @Override
    public boolean openContext(String sessionId, LoginIdentity identity, UUID assignmentId) {
        return jdbc.sql("""
                insert into iam.session_contexts
                       (session_id, account_id, employment_id, auth_version, assignment_id, policy_epoch, selected_at)
                select h.primary_id, u.id, e.id, u.auth_version, a.id, pe.revision,
                       case when a.id is not null then now() end
                  from iam.users u
                """ + VALID_IDENTITY + """
                  join iam.http_sessions h on h.session_id = :sessionId
                  left join iam.policy_epoch pe on pe.organization_id = u.organization_id
                  left join (
                """ + VALID_ASSIGNMENT + """
                  ) a on a.id = :assignmentId and a.employment_id = e.id
                 where u.id = :accountId and u.organization_id = :organizationId and e.id = :employmentId
                   and u.active and u.deactivated_at is null and u.auth_version = :authVersion
                """)
                .param("sessionId", sessionId)
                .param("accountId", identity.accountId())
                .param("organizationId", identity.organizationId())
                .param("employmentId", identity.employmentId())
                .param("authVersion", identity.authVersion())
                .param("assignmentId", assignmentId)
                .update() == 1;
    }

    @Override
    public Optional<SessionContext> findContext(String sessionId, UUID accountId) {
        return jdbc.sql("""
                select u.organization_id, u.id, e.id as employment_id, e.employee_no, u.display_name,
                       a.id as assignment_id, c.context_revision
                  from iam.users u
                """ + VALID_IDENTITY + """
                  join iam.session_contexts c on c.account_id = u.id and c.employment_id = e.id
                                             and c.auth_version = u.auth_version
                  join iam.http_sessions h on h.primary_id = c.session_id
                  left join (
                """ + VALID_ASSIGNMENT + """
                  ) a on a.id = c.assignment_id and a.employment_id = e.id
                 where h.session_id = :sessionId and h.expiry_time > extract(epoch from now()) * 1000
                   and u.id = :accountId and u.active and u.deactivated_at is null
                """)
                .param("sessionId", sessionId)
                .param("accountId", accountId)
                .query((row, index) -> new SessionContext(row.getObject("organization_id", UUID.class),
                        row.getObject("id", UUID.class), row.getObject("employment_id", UUID.class),
                        row.getString("employee_no"), row.getString("display_name"),
                        row.getObject("assignment_id", UUID.class), row.getLong("context_revision")))
                .optional();
    }

    @Override
    public boolean selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision) {
        return jdbc.sql("""
                update iam.session_contexts c
                   set assignment_id = a.id, context_revision = c.context_revision + 1,
                       selected_at = now(), updated_at = now(), policy_epoch = pe.revision
                  from iam.users u
                """ + VALID_IDENTITY + """
                  join iam.http_sessions h on h.session_id = :sessionId
                  left join iam.policy_epoch pe on pe.organization_id = u.organization_id
                  join (
                """ + VALID_ASSIGNMENT + """
                  ) a on a.id = :assignmentId and a.employment_id = e.id
                 where c.session_id = h.primary_id and c.account_id = u.id and c.employment_id = e.id
                   and h.expiry_time > extract(epoch from now()) * 1000
                   and u.id = :accountId and u.active and u.deactivated_at is null
                   and c.auth_version = u.auth_version and c.context_revision = :expectedRevision
                """)
                .param("sessionId", sessionId)
                .param("accountId", accountId)
                .param("assignmentId", assignmentId)
                .param("expectedRevision", expectedRevision)
                .update() == 1;
    }
}
