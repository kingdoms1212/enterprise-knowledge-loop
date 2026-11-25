package com.ekl.common.acl;

import java.util.Objects;
import java.util.UUID;

/** A current resource policy already granted SEARCH by the Core permission layer. */
public record ResourceSearchScope(UUID organizationId, UUID resourceId, UUID aclId, long policyRevision) {
    public ResourceSearchScope {
        Objects.requireNonNull(organizationId);
        Objects.requireNonNull(resourceId);
        Objects.requireNonNull(aclId);
        if (policyRevision < 1) {
            throw new IllegalArgumentException("policyRevision must be positive");
        }
    }
}
