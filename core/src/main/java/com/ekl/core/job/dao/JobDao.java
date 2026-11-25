package com.ekl.core.job.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;

public interface JobDao {
    Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId);
}
