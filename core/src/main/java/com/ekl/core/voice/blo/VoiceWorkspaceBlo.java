package com.ekl.core.voice.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.voice.VoiceWorkspace;
import com.ekl.common.auth.SessionContext;

public interface VoiceWorkspaceBlo {
    CursorPage<VoiceWorkspace.Row> list(SessionContext session, String cursor, int limit);
    Optional<VoiceWorkspace.Detail> find(SessionContext session, UUID id);
    VoiceWorkspace.Capabilities capabilities(SessionContext session);
}
