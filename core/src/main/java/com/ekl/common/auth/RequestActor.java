package com.ekl.common.auth;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

public record RequestActor(String sessionId, UUID accountId, SessionContext context) {
    public RequestActor(String sessionId, UUID accountId) {
        this(sessionId, accountId, null);
    }

    public static RequestActor from(HttpServletRequest request, Authentication authentication) {
        if (request.getAttribute(RequestActor.class.getName()) instanceof RequestActor actor) {
            return actor;
        }
        var session = request.getSession(false);
        if (session == null || authentication == null || !authentication.isAuthenticated()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        try {
            return new RequestActor(session.getId(), UUID.fromString(authentication.getName()));
        } catch (IllegalArgumentException failure) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
    }
}
