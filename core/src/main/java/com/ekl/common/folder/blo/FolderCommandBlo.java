package com.ekl.common.folder.blo;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.common.folder.FolderChange;

public interface FolderCommandBlo {
    CommandResult create(RequestActor actor, String key, FolderChange.Create input);

    CommandResult rename(RequestActor actor, UUID id, FolderChange.Rename input);

    void archive(RequestActor actor, UUID id);
}
