package com.ekl.core.knowledge.blo;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;
import com.ekl.core.knowledge.dao.KnowledgeDao;
import com.ekl.framework.blo.BaseBlo;
import org.springframework.stereotype.Component;

@Component
class KnowledgeBloImpl extends BaseBlo<KnowledgeVersionSummary, ResourceReadScope> implements KnowledgeBlo {
    private final KnowledgeDao dao;

    KnowledgeBloImpl(KnowledgeDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<KnowledgeVersionSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
