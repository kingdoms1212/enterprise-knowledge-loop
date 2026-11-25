package com.ekl.common.folder.dao;

import java.util.Optional;
import java.util.UUID;

public interface FolderCommandDao {
    Optional<LockedFolder> lock(UUID organization, UUID folder);
    void add(UUID organization, UUID id, UUID department, UUID parent, String name, UUID actor);
    void rename(UUID id, String name, long version);
    boolean archiveEmpty(UUID id, UUID actor);

    record LockedFolder(UUID department, long version) {
    }
}
