package com.ekl.common.user.dao;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class UserDaoImpl extends BaseDao<ActiveUser> implements UserDao {
    private static final String SQL = """
            select u.id, u.organization_id, u.person_id, u.display_name
              from iam.users u
              join iam.persons p on p.id = u.person_id
              join iam.organizations o on o.id = u.organization_id
             where u.organization_id = :organizationId and u.id = :accountId
               and u.active and u.deactivated_at is null and p.status = 'ACTIVE' and o.active
            """;

    UserDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId) {
        var parameters = Map.of("organizationId", organizationId, "accountId", accountId);
        return queryOne(SQL, parameters, (row, index) -> new ActiveUser(row.getObject("id", UUID.class), row.getObject("organization_id", UUID.class),
                row.getObject("person_id", UUID.class), row.getString("display_name")));
    }
}
