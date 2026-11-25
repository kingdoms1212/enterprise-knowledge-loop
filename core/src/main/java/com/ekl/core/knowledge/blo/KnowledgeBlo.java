package com.ekl.core.knowledge.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;

public interface KnowledgeBlo {
    Optional<KnowledgeVersionSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
