package com.ekl.common.folder.blo;

import java.util.Optional;

import com.ekl.common.folder.FolderSummary;
import com.ekl.common.folder.dao.FolderDao;
import com.ekl.framework.blo.BaseBlo;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.stereotype.Component;

@Component
class FolderBloImpl extends BaseBlo<FolderSummary, ResourceReadScope> implements FolderBlo {
    private final FolderDao dao;

    FolderBloImpl(FolderDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<FolderSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
