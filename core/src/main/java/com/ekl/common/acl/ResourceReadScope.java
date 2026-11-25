package com.ekl.common.acl;

import java.util.Map;
import java.util.Objects;
import java.util.UUID;

/** A resource and policy revision already allowed for READ by the Core permission layer. */
public record ResourceReadScope(UUID organizationId, UUID resourceId, UUID aclId, long policyRevision) {
    public ResourceReadScope {
        Objects.requireNonNull(organizationId);
        Objects.requireNonNull(resourceId);
        Objects.requireNonNull(aclId);
        if (policyRevision < 1) {
            throw new IllegalArgumentException("policyRevision must be positive");
        }
    }

    public Map<String, ?> sqlParameters() {
        return Map.of("organizationId", organizationId, "resourceId", resourceId,
                "aclId", aclId, "policyRevision", policyRevision);
    }
}
