package com.ekl.common.auth.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.SessionContext;

public interface LoginDao {
    Optional<Credential> findLocalCredential(UUID organizationId, String employeeNumber);

    boolean openContext(String sessionId, LoginIdentity identity, UUID assignmentId);

    Optional<SessionContext> findContext(String sessionId, UUID accountId);

    boolean selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision);

    record Credential(LoginIdentity identity, String passwordHash) {
        @Override
        public String toString() {
            return "Credential[redacted]";
        }
    }
}
