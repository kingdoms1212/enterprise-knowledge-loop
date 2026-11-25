package com.ekl.common.group.blo;

import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;

public interface GroupBlo {
    List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId);
}
