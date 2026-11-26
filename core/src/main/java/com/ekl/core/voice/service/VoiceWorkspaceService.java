package com.ekl.core.voice.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.voice.VoiceWorkspace;
import com.ekl.common.auth.RequestActor;

public interface VoiceWorkspaceService {
    CursorPage<VoiceWorkspace.Row> list(RequestActor actor, String cursor, int limit);
    Optional<VoiceWorkspace.Detail> find(RequestActor actor, UUID id);
    VoiceWorkspace.Capabilities capabilities(RequestActor actor);
}
