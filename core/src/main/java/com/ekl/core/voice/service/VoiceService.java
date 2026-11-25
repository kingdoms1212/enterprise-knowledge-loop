package com.ekl.core.voice.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;

public interface VoiceService {
    Optional<VoiceSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
