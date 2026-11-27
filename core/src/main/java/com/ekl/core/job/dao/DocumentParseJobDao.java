package com.ekl.core.job.dao;

import java.util.Optional;

import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentParseJobDao extends DocumentOutboxDao {
    Optional<DocumentOutboxJob.Input> input(DocumentOutboxJob job);
    void updateDocument(DocumentOutboxJob job, String status, String result);
}
