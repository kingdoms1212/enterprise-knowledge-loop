package com.ekl.core.knowledge.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.knowledge.KnowledgeWorkspace;

public interface KnowledgeWorkspaceDao {
    List<UUID> candidates(UUID organization, UUID account, UUID after, int limit);
    List<UUID> reviewCandidates(UUID organization, UUID assignment, UUID after, int limit);

    Optional<KnowledgeWorkspace.Row> row(ResourceReadScope scope);

    Optional<StoredDetail> detail(ResourceReadScope scope);

    List<KnowledgeWorkspace.Source> liveSources(UUID version);

    int sourceCount(UUID version);

    record StoredDetail(KnowledgeWorkspace.Row version, String body, long rowVersion, UUID author, UUID department) {
    }
}
