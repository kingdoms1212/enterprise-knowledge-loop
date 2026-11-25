package com.ekl.common.auth;

import java.util.UUID;

public record LoginIdentity(UUID organizationId, UUID accountId, UUID employmentId, long authVersion) {
}
