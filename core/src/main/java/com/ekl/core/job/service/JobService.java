package com.ekl.core.job.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;

public interface JobService {
    Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId);
}
