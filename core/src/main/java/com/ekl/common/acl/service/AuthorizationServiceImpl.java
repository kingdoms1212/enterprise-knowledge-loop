package com.ekl.common.acl.service;

import java.util.UUID;

import com.ekl.common.acl.AccessDecision;
import com.ekl.common.acl.blo.AuthorizationBlo;
import com.ekl.common.auth.SessionContext;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
class AuthorizationServiceImpl implements AuthorizationService {
    private final AuthorizationBlo blo;

    AuthorizationServiceImpl(AuthorizationBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
    public AccessDecision checkRead(SessionContext session, UUID resourceId, String resourceType) {
        return blo.checkRead(session, resourceId, resourceType);
    }

    @Override
    @Transactional(readOnly = true)
    public AccessDecision check(SessionContext session, UUID resourceId, String resourceType, String action) {
        return blo.check(session, resourceId, resourceType, action);
    }

    @Override
    @Transactional(readOnly = true)
    public boolean hasRole(SessionContext session, String action, UUID departmentId) {
        return blo.hasRole(session, action, departmentId);
    }
}
