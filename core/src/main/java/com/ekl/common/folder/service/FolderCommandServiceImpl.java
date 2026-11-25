package com.ekl.common.folder.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.common.folder.FolderChange;
import com.ekl.common.folder.blo.FolderCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class FolderCommandServiceImpl implements FolderCommandService {
    private final FolderCommandBlo blo;

    FolderCommandServiceImpl(FolderCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public CommandResult create(RequestActor actor, String key, FolderChange.Create input) {
        return blo.create(actor, key, input);
    }

    @Override
    @Transactional
    public CommandResult rename(RequestActor actor, UUID id, FolderChange.Rename input) {
        return blo.rename(actor, id, input);
    }

    @Override
    @Transactional
    public void archive(RequestActor actor, UUID id) {
        blo.archive(actor, id);
    }
}
