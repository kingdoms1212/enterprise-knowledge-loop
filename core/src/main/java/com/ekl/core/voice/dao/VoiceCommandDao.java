package com.ekl.core.voice.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.voice.VoiceChange;

public interface VoiceCommandDao {
    Optional<UUID> primaryDepartment(SessionContext session);
    boolean validCustomer(UUID organization, UUID customer);
    Optional<UUID> duplicate(UUID organization, byte[] hash, String channel, String externalId);
    void create(SessionContext session, UUID id, UUID department, String channel, String externalId,
                byte[] hash, VoiceChange.Intake input, String blob, byte[] blobHash, int size);
    Optional<LockedVoice> lock(UUID organization, UUID id);
    void markTriaged(UUID id, long version);

    record LockedVoice(String title, String product, String status, long version, int classification,
                       String proposedType, String proposedUrgency, String proposedDepartment) {
    }
}
