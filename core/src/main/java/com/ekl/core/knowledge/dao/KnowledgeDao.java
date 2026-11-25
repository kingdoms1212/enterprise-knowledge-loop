package com.ekl.core.knowledge.dao;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeVersionSummary;

public interface KnowledgeDao {
    Optional<KnowledgeVersionSummary> findReadable(ResourceReadScope scope);
}
