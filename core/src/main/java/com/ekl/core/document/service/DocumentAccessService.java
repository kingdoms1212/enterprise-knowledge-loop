package com.ekl.core.document.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.core.document.DocumentDetail;

public interface DocumentAccessService {
    Optional<DocumentDetail> findDocument(String sessionId, UUID accountId, UUID documentId);
}
