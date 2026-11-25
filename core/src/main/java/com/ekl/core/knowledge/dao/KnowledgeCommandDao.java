package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

public interface KnowledgeCommandDao {
    Optional<LockedVersion> lock(UUID organization, UUID id, UUID version);
    void retire(UUID id, UUID version, long revision, String reason);
    void editDraft(UUID version, long revision, UUID actor, String body, byte[] hash);

    record LockedVersion(String state, long revision, UUID acl) {
    }
}
