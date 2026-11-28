package com.ekl.common.auth.filter;

import java.io.IOException;
import java.util.Set;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.service.LoginService;
import jakarta.servlet.FilterChain;
import jakarta.servlet.ServletException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.filter.OncePerRequestFilter;
import org.springframework.web.server.ResponseStatusException;

public final class SessionContextFilter extends OncePerRequestFilter {
    private static final Set<String> PUBLIC = Set.of(
            "GET /api/v1/authentication/csrf", "GET /api/v1/authentication/providers", "POST /api/v1/sessions");
    private static final Set<String> WITHOUT_ASSIGNMENT = Set.of(
            "GET /api/v1/me", "GET /api/v1/me/assignments", "PUT /api/v1/sessions/current/assignment");
    private final LoginService login;

    public SessionContextFilter(LoginService login) {
        this.login = login;
    }

    @Override
    protected boolean shouldNotFilter(HttpServletRequest request) {
        var path = request.getServletPath();
        var route = request.getMethod() + " " + path;
        return !path.startsWith("/api/v1/") || PUBLIC.contains(route) || "DELETE /api/v1/sessions/current".equals(route);
    }

    @Override
    protected void doFilterInternal(HttpServletRequest request, HttpServletResponse response, FilterChain chain)
            throws ServletException, IOException {
        RequestActor actor;
        try {
            var principal = RequestActor.from(request, SecurityContextHolder.getContext().getAuthentication());
            actor = new RequestActor(principal.sessionId(), principal.accountId(),
                    login.current(principal.sessionId(), principal.accountId()));
        } catch (ResponseStatusException failure) {
            if (failure.getStatusCode() != HttpStatus.UNAUTHORIZED) {
                throw failure;
            }
            unauthorized(response);
            return;
        }
        if (actor.context().assignmentId() == null
                && !WITHOUT_ASSIGNMENT.contains(request.getMethod() + " " + request.getServletPath())) {
            forbidden(response, "ASSIGNMENT_REQUIRED");
            return;
        }
        request.setAttribute(RequestActor.class.getName(), actor);
        chain.doFilter(request, response);
    }

    public static void unauthorized(HttpServletResponse response) throws IOException {
        problem(response, HttpStatus.UNAUTHORIZED, "SESSION_REQUIRED");
    }

    public static void forbidden(HttpServletResponse response, String code) throws IOException {
        problem(response, HttpStatus.FORBIDDEN, code);
    }

    private static void problem(HttpServletResponse response, HttpStatus status, String code) throws IOException {
        response.setStatus(status.value());
        response.setContentType("application/problem+json");
        response.getWriter().write("{\"status\":" + status.value() + ",\"code\":\"" + code + "\"}");
    }
}
