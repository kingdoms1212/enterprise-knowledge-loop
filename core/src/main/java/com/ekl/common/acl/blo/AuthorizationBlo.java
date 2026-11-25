package com.ekl.common.acl.blo;

import java.util.UUID;

import com.ekl.common.acl.AccessDecision;
import com.ekl.common.auth.SessionContext;

public interface AuthorizationBlo {
    AccessDecision checkRead(SessionContext session, UUID resourceId, String resourceType);
    AccessDecision check(SessionContext session, UUID resourceId, String resourceType, String action);
    boolean hasRole(SessionContext session, String action, UUID departmentId);
}
