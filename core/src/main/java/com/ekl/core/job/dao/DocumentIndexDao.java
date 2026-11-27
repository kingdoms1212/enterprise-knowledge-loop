package com.ekl.core.job.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.core.job.DocumentIndexJob.Chunk;
import com.ekl.core.job.DocumentIndexJob.Source;
import com.ekl.core.job.DocumentOutboxJob;

public interface DocumentIndexDao {
    Optional<UUID> organization(UUID document);
    Optional<Source> publishedSource(DocumentOutboxJob job);
    UUID createRevision(UUID document, Source source);
    void writeKeywordIndex(DocumentOutboxJob job, Source source, UUID revision, List<Chunk> chunks);
    void supersedeInactive(UUID document);
}
