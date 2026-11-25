package com.ekl.common.auth.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.blo.LoginBlo;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
class LoginServiceImpl implements LoginService {
    private final LoginBlo blo;

    LoginServiceImpl(LoginBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public LoginIdentity authenticate(UUID organizationId, String employeeNumber, String password) {
        return blo.authenticate(organizationId, employeeNumber, password)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @Override
    @Transactional
    public SessionContext openSession(String sessionId, LoginIdentity identity) {
        return blo.openSession(sessionId, identity);
    }

    @Override
    @Transactional(readOnly = true)
    public SessionContext current(String sessionId, UUID accountId) {
        return blo.current(sessionId, accountId);
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentSummary> assignments(String sessionId, UUID accountId) {
        return blo.assignments(sessionId, accountId);
    }

    @Override
    @Transactional
    public SessionContext selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision) {
        return blo.selectAssignment(sessionId, accountId, assignmentId, expectedRevision);
    }
}
