package com.ekl.core.voice.blo;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.core.voice.VoiceChange;

public interface VoiceCommandBlo {
    CommandResult intake(RequestActor actor, String key, VoiceChange.Intake input);

    CommandResult triage(RequestActor actor, UUID id, String key, VoiceChange.Triage input);
}
