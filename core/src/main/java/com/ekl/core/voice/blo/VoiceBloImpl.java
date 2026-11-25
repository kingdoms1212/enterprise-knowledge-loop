package com.ekl.core.voice.blo;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.voice.VoiceSummary;
import com.ekl.core.voice.dao.VoiceDao;
import com.ekl.framework.blo.BaseBlo;
import org.springframework.stereotype.Component;

@Component
class VoiceBloImpl extends BaseBlo<VoiceSummary, ResourceReadScope> implements VoiceBlo {
    private final VoiceDao dao;

    VoiceBloImpl(VoiceDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<VoiceSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
