package com.ekl.common.acl;

import java.util.UUID;

public record AclPolicy(UUID id, UUID aclId, long revision, String origin, int classificationLevel) {
}
