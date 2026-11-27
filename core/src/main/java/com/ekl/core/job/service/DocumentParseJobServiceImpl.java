package com.ekl.core.job.service;

import java.util.Optional;

import com.ekl.common.document.port.DocumentParsingPort.ParsedDocument;
import com.ekl.core.job.DocumentParseJob;
import com.ekl.core.job.dao.DocumentParseJobDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import tools.jackson.databind.json.JsonMapper;

@Service
class DocumentParseJobServiceImpl implements DocumentParseJobService {
    private final DocumentParseJobDao dao;
    private final JsonMapper json;

    DocumentParseJobServiceImpl(DocumentParseJobDao dao, JsonMapper json) {
        this.dao = dao;
        this.json = json;
    }

    @Override
    @Transactional
    public Optional<DocumentParseJob> claim() {
        return dao.claim();
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<DocumentParseJob.Input> input(DocumentParseJob job) {
        return dao.input(job);
    }

    @Override
    @Transactional
    public void succeed(DocumentParseJob job, ParsedDocument result) {
        if (!dao.lockLease(job)) {
            return;
        }
        if (result != null) {
            dao.updateDocument(job, result.status().name(), result.segments().isEmpty()
                    ? null : json.writeValueAsString(result.segments()));
        }
        dao.finish(job, "SUCCEEDED", null);
    }

    @Override
    @Transactional
    public void fail(DocumentParseJob job, String code, boolean retryable) {
        if (!dao.lockLease(job)) {
            return;
        }
        boolean retry = retryable && job.attempts() < job.maxAttempts();
        if (!retry) {
            dao.updateDocument(job, "FAILED", null);
        }
        dao.finish(job, retry ? "RETRY_WAIT" : "FAILED", code);
    }
}
