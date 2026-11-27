package com.ekl.core.job.dao;

import java.util.Optional;

import com.ekl.core.job.DocumentParseJob;

public interface DocumentParseJobDao {
    Optional<DocumentParseJob> claim();
    Optional<DocumentParseJob.Input> input(DocumentParseJob job);
    boolean lockLease(DocumentParseJob job);
    void updateDocument(DocumentParseJob job, String status, String result);
    void finish(DocumentParseJob job, String state, String error);
}
