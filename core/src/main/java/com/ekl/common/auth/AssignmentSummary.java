package com.ekl.common.auth;

import java.util.UUID;

public record AssignmentSummary(UUID id, UUID departmentId, String departmentName, String assignmentType) {
}
