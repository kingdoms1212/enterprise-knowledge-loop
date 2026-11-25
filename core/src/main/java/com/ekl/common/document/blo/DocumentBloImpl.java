package com.ekl.common.document.blo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;
import com.ekl.common.document.dao.DocumentDao;
import com.ekl.framework.blo.BaseBlo;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.stereotype.Component;

@Component
class DocumentBloImpl extends BaseBlo<DocumentSummary, ResourceReadScope> implements DocumentBlo {
    private final DocumentDao dao;

    DocumentBloImpl(DocumentDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<DocumentSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }

    @Override
    public List<DocumentVersionSummary> findReadableVersions(UUID id, ResourceReadScope scope) {
        if (scope == null || !scope.resourceId().equals(id)) {
            return List.of();
        }
        return dao.findReadableVersions(scope);
    }
}
