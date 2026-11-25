package com.ekl.common.document.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.document.DocumentChange;
import com.ekl.common.support.CommandResult;
import com.ekl.common.document.blo.DocumentCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DocumentCommandServiceImpl implements DocumentCommandService {
    private final DocumentCommandBlo blo;

    DocumentCommandServiceImpl(DocumentCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public CommandResult create(RequestActor actor, String key, DocumentChange.Create input) {
        return blo.create(actor, key, input);
    }

    @Override
    @Transactional
    public CommandResult addVersion(RequestActor actor, UUID id, String key, Long version, DocumentChange.File file) {
        return blo.addVersion(actor, id, key, version, file);
    }

    @Override
    @Transactional
    public CommandResult publish(RequestActor actor, UUID id, UUID revision, String key, Long version) {
        return blo.publish(actor, id, revision, key, version);
    }

    @Override
    @Transactional
    public CommandResult unpublish(RequestActor actor, UUID id, UUID revision, Long expectedVersion) {
        return blo.unpublish(actor, id, revision, expectedVersion);
    }

    @Override
    @Transactional
    public CommandResult retire(RequestActor actor, UUID id, DocumentChange.Retire input) {
        return blo.retire(actor, id, input);
    }
}
