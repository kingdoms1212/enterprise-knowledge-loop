package com.ekl.common.group.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;

public interface GroupService {
    List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId);
}
