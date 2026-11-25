package com.ekl.common.acl;

import java.util.UUID;

public record ResourcePolicyRegistration(UUID organizationId, UUID actorId, UUID resourceId, String resourceType,
                                         UUID departmentId, Integer classification, UUID parentId) {
}
