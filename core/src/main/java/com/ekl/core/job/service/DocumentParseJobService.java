package com.ekl.core.job.service;

import java.util.Optional;

import com.ekl.common.document.port.DocumentParsingPort.ParsedDocument;
import com.ekl.core.job.DocumentParseJob;

public interface DocumentParseJobService {
    Optional<DocumentParseJob> claim();
    Optional<DocumentParseJob.Input> input(DocumentParseJob job);
    void succeed(DocumentParseJob job, ParsedDocument result);
    void fail(DocumentParseJob job, String code, boolean retryable);
}
