package com.ekl.core.casework.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.TriagedVoice;
import com.ekl.core.casework.blo.CaseCommandBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class CaseCommandServiceImpl implements CaseCommandService {
    private final CaseCommandBlo blo;

    CaseCommandServiceImpl(CaseCommandBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public UUID createFromTriage(SessionContext session, TriagedVoice voice) {
        return blo.createFromTriage(session, voice);
    }

    @Override
    @Transactional
    public CommandResult decide(RequestActor actor, UUID id, CaseChange.Decide input) {
        return blo.decide(actor, id, input);
    }

    @Override
    @Transactional
    public CommandResult close(RequestActor actor, UUID id, String key, CaseChange.Close input) {
        return blo.close(actor, id, key, input);
    }
}
