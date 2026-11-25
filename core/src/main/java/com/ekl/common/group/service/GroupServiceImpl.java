package com.ekl.common.group.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;
import com.ekl.common.group.blo.GroupBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class GroupServiceImpl implements GroupService {
    private final GroupBlo blo;

    GroupServiceImpl(GroupBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId) {
        return blo.findActiveGroups(organizationId, assignmentId);
    }
}
