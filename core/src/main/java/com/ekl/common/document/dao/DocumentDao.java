package com.ekl.common.document.dao;

import java.util.List;
import java.util.Optional;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;
import com.ekl.common.acl.ResourceReadScope;

public interface DocumentDao {
    List<DocumentVersionSummary> findReadableVersions(ResourceReadScope scope);

    Optional<DocumentSummary> findReadable(ResourceReadScope scope);
}
