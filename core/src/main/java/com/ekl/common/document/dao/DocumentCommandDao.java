package com.ekl.common.document.dao;

import java.util.Optional;
import java.util.UUID;

public interface DocumentCommandDao {
    Optional<LockedDocument> lock(UUID organization, UUID id);
    void create(UUID id, UUID department, UUID folder, String title);
    void addVersion(UUID id, UUID version, String blob, byte[] hash, int bytes, String mime, UUID actor);
    void replaceCurrent(UUID id, UUID version, long revision);
    boolean publishable(UUID id, UUID version);
    void publish(UUID id, UUID version, UUID actor, long revision);
    boolean unpublish(UUID id, UUID version, long revision);
    void retire(UUID id, UUID actor, String reason, long revision);

    record LockedDocument(UUID department, UUID owner, long revision) {
    }
}
