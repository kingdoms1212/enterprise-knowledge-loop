package com.ekl.common.document.blo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;
import com.ekl.common.acl.ResourceReadScope;

public interface DocumentBlo {
    List<DocumentVersionSummary> findReadableVersions(UUID id, ResourceReadScope scope);

    Optional<DocumentSummary> findReadable(UUID id, ResourceReadScope scope);
}
