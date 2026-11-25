package com.ekl.core.voice.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;
import com.ekl.core.voice.blo.VoiceBlo;
import com.ekl.framework.service.BaseService;
import org.springframework.stereotype.Service;

@Service
class VoiceServiceImpl extends BaseService<VoiceSummary, ResourceReadScope> implements VoiceService {
    private final VoiceBlo blo;

    VoiceServiceImpl(VoiceBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<VoiceSummary> read(UUID resourceId, ResourceReadScope scope) {
        return blo.findReadable(resourceId, scope);
    }
}
