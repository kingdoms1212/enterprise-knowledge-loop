package com.ekl.core.job.service;

import java.util.Optional;

import com.ekl.common.document.port.DocumentParsingPort.ParsedDocument;
import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentParseJobService {
    Optional<DocumentOutboxJob> claim();
    Optional<DocumentOutboxJob.Input> input(DocumentOutboxJob job);
    void succeed(DocumentOutboxJob job, ParsedDocument result);
    void fail(DocumentOutboxJob job, String code, boolean retryable);
}
