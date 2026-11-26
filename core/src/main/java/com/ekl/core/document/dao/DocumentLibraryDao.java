package com.ekl.core.document.dao;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.document.DocumentLibrary;

public interface DocumentLibraryDao {
    Optional<UUID> department(SessionContext session);
    boolean ownsDocument(SessionContext session, UUID document);

    List<Candidate> documentCandidates(SessionContext session, UUID department, DocumentLibrary.View view,
                                       UUID folder, Candidate after, int limit);

    List<FolderCandidate> folderCandidates(UUID organization, UUID department, UUID parent, UUID after, int limit);

    record Candidate(UUID id, OffsetDateTime orderTime, OffsetDateTime updatedAt) {
    }

    record FolderCandidate(UUID id, long rowVersion) {
    }
}
