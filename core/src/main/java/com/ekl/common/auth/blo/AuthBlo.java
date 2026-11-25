package com.ekl.common.auth.blo;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;

public interface AuthBlo {
    List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId);
}
