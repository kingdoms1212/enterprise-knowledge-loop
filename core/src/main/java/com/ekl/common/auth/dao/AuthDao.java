package com.ekl.common.auth.dao;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;

public interface AuthDao {
    List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId);

    List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId, UUID employmentId);
}
