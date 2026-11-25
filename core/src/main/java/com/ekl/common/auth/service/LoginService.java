package com.ekl.common.auth.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.SessionContext;

public interface LoginService {
    LoginIdentity authenticate(UUID organizationId, String employeeNumber, String password);

    SessionContext openSession(String sessionId, LoginIdentity identity);

    SessionContext current(String sessionId, UUID accountId);

    List<AssignmentSummary> assignments(String sessionId, UUID accountId);

    SessionContext selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision);
}
