package com.ekl.common.document.service;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;
import com.ekl.common.document.blo.DocumentBlo;
import com.ekl.framework.service.BaseService;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DocumentServiceImpl extends BaseService<DocumentSummary, ResourceReadScope> implements DocumentService {
    private final DocumentBlo blo;

    DocumentServiceImpl(DocumentBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<DocumentSummary> read(UUID id, ResourceReadScope scope) {
        return blo.findReadable(id, scope);
    }

    @Override
    @Transactional(readOnly = true)
    public List<DocumentVersionSummary> findReadableVersions(UUID id, ResourceReadScope scope) {
        return blo.findReadableVersions(id, scope);
    }
}
