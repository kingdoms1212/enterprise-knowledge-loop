package com.ekl.core.retrieval.dao;

import java.util.List;
import java.util.Map;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceSearchScope;
import com.ekl.common.auth.SessionContext;
import com.ekl.core.retrieval.DocumentQuery.Hit;
import com.ekl.core.retrieval.DocumentQuery.Pipeline;
import com.ekl.core.retrieval.DocumentQuery.Response;

public interface DocumentQueryDao {
    void lockOrganizationForQuery(UUID organization);
    Optional<Pipeline> pipeline(UUID organization);
    List<UUID> indexedDocuments(UUID organization);
    List<Hit> search(UUID organization, List<ResourceSearchScope> scopes, String question, int limit);
    boolean isCurrent(UUID organization, Hit hit);
    void record(SessionContext session, Pipeline pipeline, UUID caseId, byte[] questionHash, int latency,
                Response response, String auditReason, List<Hit> retrieved, Map<String, Hit> context);
}
