package com.ekl.core.job.service;

import java.util.Optional;

import com.ekl.common.support.service.CommandService;
import com.ekl.core.job.DocumentOutboxJob;
import com.ekl.core.job.blo.DocumentIndexBlo;
import com.ekl.core.job.dao.DocumentIndexDao;
import com.ekl.core.job.dao.DocumentOutboxDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DocumentIndexServiceImpl implements DocumentIndexService {
    private final DocumentOutboxDao jobs;
    private final DocumentIndexDao dao;
    private final DocumentIndexBlo index;
    private final CommandService commands;

    DocumentIndexServiceImpl(DocumentOutboxDao jobs, DocumentIndexDao dao, DocumentIndexBlo index,
                             CommandService commands) {
        this.jobs = jobs;
        this.dao = dao;
        this.index = index;
        this.commands = commands;
    }

    @Override
    @Transactional
    public Optional<DocumentOutboxJob> claim(String eventType) {
        return jobs.claim(eventType);
    }

    @Override
    @Transactional
    public void handle(DocumentOutboxJob job, String eventType) {
        if (!jobs.lockLease(job)) {
            return;
        }
        if (job.exhausted()) {
            jobs.finish(job, "FAILED", "LEASE_EXHAUSTED");
            return;
        }
        var organization = dao.organization(job.document());
        if (organization.isEmpty()) {
            jobs.finish(job, "SUCCEEDED", null);
            return;
        }
        commands.lockOrganization(organization.get());
        if ("IndexRetire".equals(eventType)) {
            dao.supersedeInactive(job.document());
            jobs.finish(job, "SUCCEEDED", null);
            return;
        }
        var source = dao.publishedSource(job).orElse(null);
        if (source == null) {
            jobs.finish(job, "SUCCEEDED", null);
        } else if (source.parsedSegments() == null) {
            jobs.finish(job, "FAILED", "PARSE_RESULT_MISSING");
        } else if (source.pipeline() == null) {
            retry(job, "PIPELINE_NOT_CONFIGURED");
        } else {
            index.write(job, source);
            jobs.finish(job, "SUCCEEDED", null);
        }
    }

    @Override
    @Transactional
    public void retry(DocumentOutboxJob job) {
        if (jobs.lockLease(job)) {
            retry(job, "INDEX_WRITE_FAILED");
        }
    }

    private void retry(DocumentOutboxJob job, String code) {
        jobs.finish(job, job.attempts() < job.maxAttempts() ? "RETRY_WAIT" : "FAILED", code);
    }
}
