package com.ekl.common.user;

import java.util.UUID;

public record ActiveUser(UUID id, UUID organizationId, UUID personId, String displayName) {
}
