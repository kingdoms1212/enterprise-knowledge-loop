package com.ekl.common.support.dao;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class IdempotencyDaoImpl extends BaseDao<Integer> implements IdempotencyDao {
    private static final String SQL = """
            select response_status
              from ops.idempotency_keys
             where actor_id = :actorId and operation = :operation and idem_key = :key
               and request_hash = :requestHash and state = 'COMPLETED'
               and expires_at > now() and response_status is not null
            """;

    IdempotencyDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash) {
        var parameters = Map.of("actorId", actorId, "operation", operation, "key", key, "requestHash", requestHash);
        return queryOne(SQL, parameters, (row, index) -> row.getInt("response_status"));
    }
}
