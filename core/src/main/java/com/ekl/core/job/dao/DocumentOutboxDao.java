package com.ekl.core.job.dao;

import java.util.Optional;

import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentOutboxDao {
    Optional<DocumentOutboxJob> claim(String eventType);
    boolean lockLease(DocumentOutboxJob job);
    void finish(DocumentOutboxJob job, String state, String error);
}
