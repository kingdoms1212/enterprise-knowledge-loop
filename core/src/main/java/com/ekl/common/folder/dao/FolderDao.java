package com.ekl.common.folder.dao;

import java.util.Optional;

import com.ekl.common.folder.FolderSummary;
import com.ekl.common.acl.ResourceReadScope;

public interface FolderDao {
    Optional<FolderSummary> findReadable(ResourceReadScope scope);
}
