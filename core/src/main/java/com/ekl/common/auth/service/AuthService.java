package com.ekl.common.auth.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;

public interface AuthService {
    List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId);
}
