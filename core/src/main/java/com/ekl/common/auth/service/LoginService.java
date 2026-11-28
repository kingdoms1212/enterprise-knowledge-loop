package com.ekl.common.auth.service;

import java.util.List;
import java.util.Objects;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public interface LoginService {
    LoginIdentity authenticate(UUID organizationId, String employeeNumber, String password);

    SessionContext openSession(String sessionId, LoginIdentity identity);

    SessionContext current(String sessionId, UUID accountId);

    default SessionContext current(RequestActor actor) {
        var current = current(actor.sessionId(), actor.accountId());
        var entry = actor.context();
        if (entry != null && (entry.contextRevision() != current.contextRevision()
                || !Objects.equals(entry.assignmentId(), current.assignmentId()))) {
            var failure = new ResponseStatusException(HttpStatus.CONFLICT);
            failure.getBody().setProperty("code", "ASSIGNMENT_CHANGED");
            throw failure;
        }
        return current;
    }

    List<AssignmentSummary> assignments(String sessionId, UUID accountId);

    SessionContext selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision);
}
