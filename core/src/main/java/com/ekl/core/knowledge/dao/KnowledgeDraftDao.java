package com.ekl.core.knowledge.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.knowledge.NewKnowledge;

public interface KnowledgeDraftDao {
    Optional<SourcePolicy> lockSource(UUID organization, NewKnowledge.Source source);
    void insert(SessionContext session, UUID knowledge, UUID version, NewKnowledge input, byte[] contentHash);
    void addSource(UUID version, NewKnowledge.Source source, SourcePolicy policy);
    boolean matchesRequestedPolicy(UUID version, UUID acl, String sharing);
    UUID initialVersion(UUID knowledge);

    record SourcePolicy(UUID resourceId, String type, UUID ownerDepartment, int classification) {
    }
}
