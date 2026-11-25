package com.ekl.core.voice.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CommandResult;
import com.ekl.core.voice.VoiceChange;
import com.ekl.core.voice.blo.VoiceCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class VoiceCommandServiceImpl implements VoiceCommandService {
    private final VoiceCommandBlo blo;

    VoiceCommandServiceImpl(VoiceCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional
    public CommandResult intake(RequestActor actor, String key, VoiceChange.Intake input) {
        return blo.intake(actor, key, input);
    }

    @Override
    @Transactional
    public CommandResult triage(RequestActor actor, UUID id, String key, VoiceChange.Triage input) {
        return blo.triage(actor, id, key, input);
    }
}
