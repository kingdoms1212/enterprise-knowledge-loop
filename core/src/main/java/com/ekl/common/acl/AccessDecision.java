package com.ekl.common.acl;

import java.util.UUID;

public record AccessDecision(ResourceReadScope scope, String reasonCode, UUID personId, boolean emergency) {
    public boolean allowed() {
        return scope != null;
    }
}
