package com.ekl.core.job.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.JobSummary;
import com.ekl.core.job.dao.JobDao;
import org.springframework.stereotype.Component;

@Component
class JobBloImpl implements JobBlo {
    private final JobDao dao;

    JobBloImpl(JobDao dao) {
        this.dao = dao;
    }

    @Override
    public Optional<JobSummary> findOutboxJob(UUID aggregateId, UUID eventId) {
        if (!(aggregateId != null && eventId != null)) {
            return Optional.empty();
        }
        return dao.findOutboxJob(aggregateId, eventId);
    }
}
