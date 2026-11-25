package com.ekl.core.job.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;
import com.ekl.core.job.blo.JobBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class JobServiceImpl implements JobService {
    private final JobBlo blo;

    JobServiceImpl(JobBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId) {
        return blo.findOutboxJob(aggregateId, eventId);
    }
}
