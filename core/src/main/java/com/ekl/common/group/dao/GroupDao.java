package com.ekl.common.group.dao;

import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;

public interface GroupDao {
    List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId);
}
