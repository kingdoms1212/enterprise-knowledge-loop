package com.ekl.common.auth;

import java.util.UUID;

import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.server.ResponseStatusException;

public record RequestActor(String sessionId, UUID accountId) {
    public static RequestActor from(HttpServletRequest request, Authentication authentication) {
        var session = request.getSession(false);
        if (session == null || authentication == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED);
        }
        return new RequestActor(session.getId(), UUID.fromString(authentication.getName()));
    }
}
