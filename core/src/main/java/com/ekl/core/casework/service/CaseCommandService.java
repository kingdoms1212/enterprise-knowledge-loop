package com.ekl.core.casework.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CommandResult;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.TriagedVoice;

public interface CaseCommandService {
    UUID createFromTriage(SessionContext session, TriagedVoice voice);

    CommandResult decide(RequestActor actor, UUID id, CaseChange.Decide input);

    CommandResult close(RequestActor actor, UUID id, String key, CaseChange.Close input);
}
