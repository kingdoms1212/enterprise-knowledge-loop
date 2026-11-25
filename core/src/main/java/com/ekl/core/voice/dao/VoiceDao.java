package com.ekl.core.voice.dao;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;

public interface VoiceDao {
    Optional<VoiceSummary> findReadable(ResourceReadScope scope);
}
