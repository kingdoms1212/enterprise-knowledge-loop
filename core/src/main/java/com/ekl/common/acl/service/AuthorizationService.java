package com.ekl.common.acl.service;

import java.util.List;
import java.util.Map;
import java.util.UUID;

import com.ekl.common.acl.AccessDecision;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.auth.SessionContext;

public interface AuthorizationService {
    Map<UUID, ResourceReadScope> readableScopes(SessionContext session, List<UUID> resourceIds, String resourceType);
    AccessDecision checkRead(SessionContext session, UUID resourceId, String resourceType);
    AccessDecision check(SessionContext session, UUID resourceId, String resourceType, String action);
    boolean hasRole(SessionContext session, String action, UUID departmentId);
}
