package com.ekl.common.auth.controller;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.fasterxml.jackson.annotation.JsonProperty;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.security.web.authentication.logout.SecurityContextLogoutHandler;
import org.springframework.security.web.context.SecurityContextRepository;
import org.springframework.security.web.csrf.CsrfToken;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1")
class SessionController {
    private final LoginService service;
    private final SecurityContextRepository securityContexts;
    private final SecurityContextLogoutHandler logoutHandler = new SecurityContextLogoutHandler();

    SessionController(LoginService service, SecurityContextRepository securityContexts) {
        this.service = service;
        this.securityContexts = securityContexts;
        this.logoutHandler.setSecurityContextRepository(securityContexts);
    }

    @GetMapping("/authentication/providers")
    List<Provider> providers() {
        return List.of(new Provider("LOCAL"));
    }

    @GetMapping("/authentication/csrf")
    CsrfToken csrf(CsrfToken token) {
        return token;
    }

    @PostMapping("/sessions")
    SessionContext login(@RequestBody LoginRequest body, HttpServletRequest request, HttpServletResponse response) {
        var identity = service.authenticate(body.organizationId(), body.employeeNumber(), body.password());
        var previous = request.getSession(false);
        if (previous != null) {
            previous.invalidate();
        }
        var session = request.getSession(true);
        try {
            var context = service.openSession(session.getId(), identity);
            var security = SecurityContextHolder.createEmptyContext();
            security.setAuthentication(UsernamePasswordAuthenticationToken.authenticated(
                    identity.accountId().toString(), null, List.of()));
            securityContexts.saveContext(security, request, response);
            SecurityContextHolder.setContext(security);
            return context;
        } catch (RuntimeException failure) {
            session.invalidate();
            throw failure;
        }
    }

    @GetMapping("/me")
    SessionContext me(HttpServletRequest request, Authentication authentication) {
        var actor = RequestActor.from(request, authentication);
        return actor.context() == null ? service.current(actor.sessionId(), actor.accountId()) : actor.context();
    }

    @GetMapping("/me/assignments")
    List<AssignmentSummary> assignments(HttpServletRequest request, Authentication authentication) {
        return service.assignments(sessionId(request), accountId(authentication));
    }

    @PutMapping("/sessions/current/assignment")
    SessionContext selectAssignment(@RequestBody AssignmentRequest body, HttpServletRequest request,
                                    Authentication authentication) {
        return service.selectAssignment(sessionId(request), accountId(authentication),
                body.assignmentId(), body.expectedRevision());
    }

    @DeleteMapping("/sessions/current")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    void logout(HttpServletRequest request, HttpServletResponse response, Authentication authentication) {
        logoutHandler.logout(request, response, authentication);
    }

    private static String sessionId(HttpServletRequest request) {
        var session = request.getSession(false);
        if (session == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return session.getId();
    }

    private static UUID accountId(Authentication authentication) {
        return UUID.fromString(authentication.getName());
    }

    record Provider(String code) {
    }

    record LoginRequest(@JsonProperty("organization_id") UUID organizationId,
                        @JsonProperty("employee_number") String employeeNumber, String password) {
    }

    record AssignmentRequest(@JsonProperty("assignment_id") UUID assignmentId,
                             @JsonProperty("expected_revision") long expectedRevision) {
    }
}
