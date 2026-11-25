package com.ekl.core.job.dao;

import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;
import com.ekl.framework.dao.BaseDao;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class JobDaoImpl extends BaseDao<JobSummary> implements JobDao {
    private static final String SQL = """
            select event_id, aggregate_id, event_type, state, attempts
              from ops.outbox
             where aggregate_id = :aggregateId and event_id = :eventId
            """;

    JobDaoImpl(JdbcClient jdbc) {
        super(jdbc);
    }

    @Override
    public Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId) {
        var parameters = Map.of("aggregateId", aggregateId, "eventId", eventId);
        return queryOne(SQL, parameters, (row, index) -> new JobSummary(row.getObject("event_id", UUID.class), row.getObject("aggregate_id", UUID.class),
                row.getString("event_type"), row.getString("state"), row.getInt("attempts")));
    }
}
