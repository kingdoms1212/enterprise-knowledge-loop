package com.ekl.common.auth.blo;

import java.nio.charset.StandardCharsets;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.LoginIdentity;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.dao.AuthDao;
import com.ekl.common.auth.dao.LoginDao;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class LoginBloImpl implements LoginBlo {
    private final LoginDao dao;
    private final AuthDao assignments;
    private final PasswordEncoder passwords;
    private final String dummyHash;

    LoginBloImpl(LoginDao dao, AuthDao assignments, PasswordEncoder passwords) {
        this.dao = dao;
        this.assignments = assignments;
        this.passwords = passwords;
        this.dummyHash = passwords.encode(UUID.randomUUID().toString());
    }

    @Override
    public Optional<LoginIdentity> authenticate(UUID organizationId, String employeeNumber, String password) {
        if (organizationId == null || employeeNumber == null || employeeNumber.isBlank() || employeeNumber.length() > 100
                || password == null || password.isEmpty() || password.getBytes(StandardCharsets.UTF_8).length > 72) {
            return Optional.empty();
        }
        var credential = dao.findLocalCredential(organizationId, employeeNumber);
        var hash = credential.map(LoginDao.Credential::passwordHash).orElse(dummyHash);
        try {
            if (passwords.matches(password, hash)) {
                return credential.map(LoginDao.Credential::identity);
            }
        } catch (IllegalArgumentException unusableHash) {
            // A malformed or unsupported stored credential cannot authenticate.
        }
        return Optional.empty();
    }

    @Override
    public SessionContext openSession(String sessionId, LoginIdentity identity) {
        var active = assignments.findActiveAssignments(identity.organizationId(), identity.accountId(),
                identity.employmentId());
        var selected = active.size() == 1 ? active.getFirst().id() : null;
        if (!dao.openContext(sessionId, identity, selected)) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return current(sessionId, identity.accountId());
    }

    @Override
    public SessionContext current(String sessionId, UUID accountId) {
        return dao.findContext(sessionId, accountId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED));
    }

    @Override
    public List<AssignmentSummary> assignments(String sessionId, UUID accountId) {
        var context = current(sessionId, accountId);
        return assignments.findActiveAssignments(context.organizationId(), accountId, context.employmentId());
    }

    @Override
    public SessionContext selectAssignment(String sessionId, UUID accountId, UUID assignmentId, long expectedRevision) {
        if (assignmentId == null || expectedRevision < 1) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        var context = current(sessionId, accountId);
        if (context.contextRevision() != expectedRevision) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        if (!dao.selectAssignment(sessionId, accountId, assignmentId, expectedRevision)) {
            if (current(sessionId, accountId).contextRevision() != expectedRevision) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return current(sessionId, accountId);
    }
}
