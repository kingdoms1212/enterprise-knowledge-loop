package com.ekl.common.acl.blo;

import java.util.HashSet;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.ekl.common.acl.AccessDecision;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.acl.dao.AuthorizationDao;
import com.ekl.common.acl.dao.AuthorizationDao.DimensionValue;
import com.ekl.common.acl.dao.AuthorizationDao.Policy;
import com.ekl.common.acl.dao.AuthorizationDao.Rule;
import com.ekl.common.auth.SessionContext;
import org.springframework.stereotype.Component;

@Component
class AuthorizationBloImpl implements AuthorizationBlo {
    private static final int MAX_POLICY_DEPTH = 128;
    private final AuthorizationDao dao;

    AuthorizationBloImpl(AuthorizationDao dao) {
        this.dao = dao;
    }

    @Override
    public AccessDecision checkRead(SessionContext session, UUID resourceId, String resourceType) {
        return check(session, resourceId, resourceType, "READ");
    }

    @Override
    public boolean hasRole(SessionContext session, String action, UUID departmentId) {
        return session.assignmentId() != null && dao.loadSubject(session)
                .filter(subject -> departmentId == null || departmentId.equals(subject.departmentId()))
                .filter(subject -> dao.loadActions(session.assignmentId()).contains(action)).isPresent();
    }

    @Override
    public AccessDecision check(SessionContext session, UUID resourceId, String resourceType, String action) {
        if (session.assignmentId() == null) {
            return new AccessDecision(null, "ASSIGNMENT_REQUIRED", null, false);
        }
        var subject = dao.loadSubject(session).orElse(null);
        if (subject == null) {
            return new AccessDecision(null, "ASSIGNMENT_REQUIRED", null, false);
        }
        var actor = new Actor(session.organizationId(), session.accountId(), subject.personId(), subject.clearance(),
                Set.copyOf(dao.loadPrincipals(session, subject)), Set.copyOf(dao.loadActions(session.assignmentId())),
                Set.copyOf(dao.loadSubjectScopes(session)));
        var policy = dao.loadPolicy(actor.organizationId(), resourceId).orElse(null);
        if (policy == null || !policy.resourceType().equals(resourceType)) {
            return new AccessDecision(null, "RESOURCE_NOT_FOUND", actor.personId(), false);
        }
        var result = evaluate(actor, policy, action, new HashSet<>());
        var scope = result.allowed()
                ? new ResourceReadScope(actor.organizationId(), resourceId, policy.aclId(), policy.revision())
                : null;
        return new AccessDecision(scope, result.reason(), actor.personId(), result.emergency());
    }

    private Outcome evaluate(Actor actor, Policy policy, String action, Set<UUID> visited) {
        if (visited.size() >= MAX_POLICY_DEPTH || !visited.add(policy.resourceId())) {
            return Outcome.deny("INVALID_POLICY_PATH");
        }
        try {
            return evaluatePolicy(actor, policy, action, visited);
        } finally {
            visited.remove(policy.resourceId());
        }
    }

    private Outcome evaluatePolicy(Actor actor, Policy policy, String action, Set<UUID> visited) {
        if (!actor.actions().contains(action)) {
            return Outcome.deny("ROLE_FORBIDDEN");
        }
        if (policy.blocked()) {
            return Outcome.deny("POLICY_BLOCKED");
        }
        if (actor.clearance() == null || policy.classification() == null
                || actor.clearance() < policy.classification()) {
            return Outcome.deny("CLEARANCE_REQUIRED");
        }

        var rules = matchingRules(actor, policy, action);
        var denied = pathDenial(actor, policy, action, rules);
        if (denied != null) {
            return Outcome.deny(denied);
        }
        var normalGrant = rules.stream().anyMatch(rule ->
                "ALLOW".equals(rule.effect()) && rule.emergencyGrantId() == null);
        var emergencyGrant = "READ".equals(action) && rules.stream().anyMatch(rule ->
                "ALLOW".equals(rule.effect()) && policy.resourceId().equals(rule.grantedResourceId())
                        && actor.accountId().equals(rule.requesterId()));
        if (!normalGrant && !emergencyGrant) {
            return Outcome.deny("ACL_ALLOW_REQUIRED");
        }
        var inScope = normalGrant && scopesMatch(actor, policy);
        if (!inScope && !emergencyGrant) {
            return Outcome.deny("OUT_OF_SCOPE");
        }

        for (var dependency : dao.loadDependencies(policy.resourceId())) {
            var source = dao.loadPolicy(actor.organizationId(), dependency.resourceId()).orElse(null);
            if (source == null) {
                return Outcome.deny("SOURCE_READ_REQUIRED");
            }
            var sourceRead = evaluate(actor, source, dependency.action(), visited);
            if (!sourceRead.allowed() || sourceRead.emergency()) {
                return Outcome.deny("SOURCE_READ_REQUIRED");
            }
        }
        return new Outcome(true, inScope ? action + "_ALLOWED" : "EMERGENCY_READ_ALLOWED", !inScope);
    }

    private List<Rule> matchingRules(Actor actor, Policy policy, String action) {
        return dao.loadRules(actor.organizationId(), policy.aclId(), action).stream()
                .filter(rule -> actor.principals().contains(rule.principalId()))
                .toList();
    }

    private String pathDenial(Actor actor, Policy root, String action, List<Rule> rules) {
        var current = root;
        var path = new HashSet<UUID>();
        while (true) {
            if (path.size() >= MAX_POLICY_DEPTH || !path.add(current.resourceId())) {
                return "INVALID_POLICY_PATH";
            }
            if (rules.stream().anyMatch(rule -> "DENY".equals(rule.effect()))) {
                return "ACL_DENIED";
            }
            if (current.parentId() == null) {
                return null;
            }
            current = dao.loadPolicy(actor.organizationId(), current.parentId()).orElse(null);
            if (current == null || current.blocked()) {
                return "INVALID_POLICY_PATH";
            }
            rules = matchingRules(actor, current, action);
        }
    }

    private boolean scopesMatch(Actor actor, Policy policy) {
        var required = dao.loadPolicyScopes(policy.resourceId());
        return dimensionMatches(actor.scopes(), required, "DEPARTMENT", policy.departmentMode())
                && dimensionMatches(actor.scopes(), required, "CUSTOMER", policy.customerMode())
                && dimensionMatches(actor.scopes(), required, "PROJECT", policy.projectMode());
    }

    private boolean dimensionMatches(Set<DimensionValue> actorScopes, List<DimensionValue> required,
                                     String dimension, String mode) {
        if ("NOT_APPLICABLE".equals(mode)) {
            return true;
        }
        return "RESTRICTED".equals(mode) && required.stream()
                .anyMatch(value -> value.dimension().equals(dimension) && actorScopes.contains(value));
    }

    private record Actor(UUID organizationId, UUID accountId, UUID personId, Integer clearance,
                         Set<UUID> principals, Set<String> actions, Set<DimensionValue> scopes) {
    }

    private record Outcome(boolean allowed, String reason, boolean emergency) {
        private static Outcome deny(String reason) {
            return new Outcome(false, reason, false);
        }
    }
}
