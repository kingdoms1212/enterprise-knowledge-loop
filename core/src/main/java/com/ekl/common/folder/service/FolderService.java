package com.ekl.common.folder.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.folder.FolderSummary;
import com.ekl.common.acl.ResourceReadScope;

public interface FolderService {
    Optional<FolderSummary> findReadable(UUID id, ResourceReadScope scope);
}
