package com.ekl.core.audit;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;

public record ResourceAccessAudit(SessionContext session, UUID personId, UUID resourceId, String resourceType,
                                  String action, boolean allowed, String reasonCode, Long policyRevision) {
}
