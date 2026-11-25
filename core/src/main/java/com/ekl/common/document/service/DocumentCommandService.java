package com.ekl.common.document.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.document.DocumentChange;
import com.ekl.common.support.CommandResult;

public interface DocumentCommandService {
    CommandResult create(RequestActor actor, String key, DocumentChange.Create input);

    CommandResult addVersion(RequestActor actor, UUID id, String key, Long version, DocumentChange.File file);

    CommandResult publish(RequestActor actor, UUID id, UUID revision, String key, Long version);

    CommandResult unpublish(RequestActor actor, UUID id, UUID revision, Long expectedVersion);

    CommandResult retire(RequestActor actor, UUID id, DocumentChange.Retire input);
}
