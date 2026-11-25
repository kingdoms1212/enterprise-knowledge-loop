package com.ekl.core.knowledge.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;

public interface KnowledgeService {
    Optional<KnowledgeVersionSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
