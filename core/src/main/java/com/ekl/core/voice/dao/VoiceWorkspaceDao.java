package com.ekl.core.voice.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceWorkspace;

public interface VoiceWorkspaceDao {
    List<UUID> candidates(UUID organization, UUID after, int limit);
    Optional<VoiceWorkspace.Row> findRow(ResourceReadScope scope);
    Optional<VoiceWorkspace.Detail> findDetail(ResourceReadScope scope, boolean canTriage);
}
