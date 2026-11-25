package com.ekl.core.voice.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;

public interface VoiceBlo {
    Optional<VoiceSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
