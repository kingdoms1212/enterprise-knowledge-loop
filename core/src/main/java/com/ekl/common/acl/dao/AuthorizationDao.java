package com.ekl.common.acl.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;

public interface AuthorizationDao {
    Optional<Subject> loadSubject(SessionContext session);

    List<UUID> loadPrincipals(SessionContext session, Subject subject);

    List<String> loadActions(UUID assignmentId);

    List<DimensionValue> loadSubjectScopes(SessionContext session);

    Optional<Policy> loadPolicy(UUID organizationId, UUID resourceId);

    List<Rule> loadRules(UUID organizationId, UUID aclId, String action);

    List<DimensionValue> loadPolicyScopes(UUID resourceId);

    List<Dependency> loadDependencies(UUID resourceId);

    record Subject(UUID personId, UUID departmentId, Integer clearance) {
    }

    record Policy(UUID resourceId, UUID aclId, long revision, Integer classification, boolean blocked,
                  UUID parentId, String resourceType, String departmentMode, String customerMode, String projectMode) {
    }

    record Rule(UUID principalId, String effect, UUID emergencyGrantId, UUID grantedResourceId, UUID requesterId) {
    }

    record DimensionValue(String dimension, UUID id) {
    }

    record Dependency(UUID resourceId, String action) {
    }
}
