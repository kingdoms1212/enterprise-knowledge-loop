package com.ekl.core.knowledge.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;
import com.ekl.core.knowledge.blo.KnowledgeBlo;
import com.ekl.framework.service.BaseService;
import org.springframework.stereotype.Service;

@Service
class KnowledgeServiceImpl extends BaseService<KnowledgeVersionSummary, ResourceReadScope> implements KnowledgeService {
    private final KnowledgeBlo blo;

    KnowledgeServiceImpl(KnowledgeBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<KnowledgeVersionSummary> read(UUID resourceId, ResourceReadScope scope) {
        return blo.findReadable(resourceId, scope);
    }
}
