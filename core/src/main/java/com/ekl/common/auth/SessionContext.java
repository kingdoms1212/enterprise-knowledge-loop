package com.ekl.common.auth;

import java.util.UUID;

public record SessionContext(UUID organizationId, UUID accountId, UUID employmentId, String employeeNumber,
                             String displayName, UUID assignmentId, long contextRevision) {
}
