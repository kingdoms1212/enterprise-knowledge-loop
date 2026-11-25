package com.ekl.core.job.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;

public interface JobBlo {
    Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId);
}
