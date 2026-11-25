package com.ekl.common.folder.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.folder.FolderSummary;
import com.ekl.common.folder.blo.FolderBlo;
import com.ekl.framework.service.BaseService;
import com.ekl.common.acl.ResourceReadScope;
import org.springframework.stereotype.Service;

@Service
class FolderServiceImpl extends BaseService<FolderSummary, ResourceReadScope> implements FolderService {
    private final FolderBlo blo;

    FolderServiceImpl(FolderBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<FolderSummary> read(UUID id, ResourceReadScope scope) {
        return blo.findReadable(id, scope);
    }
}
