package com.ekl.core.job.service;

import java.util.Optional;

import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentIndexService {
    Optional<DocumentOutboxJob> claim(String eventType);
    void handle(DocumentOutboxJob job, String eventType);
    void retry(DocumentOutboxJob job);
}
