package com.ekl.common.group.blo;

import java.util.List;
import java.util.UUID;

import com.ekl.common.group.GroupSummary;
import com.ekl.common.group.dao.GroupDao;
import org.springframework.stereotype.Component;

@Component
class GroupBloImpl implements GroupBlo {
    private final GroupDao dao;

    GroupBloImpl(GroupDao dao) {
        this.dao = dao;
    }

    @Override
    public List<GroupSummary> findActiveGroups(UUID organizationId, UUID assignmentId) {
        if (!(organizationId != null && assignmentId != null)) {
            return List.of();
        }
        return dao.findActiveGroups(organizationId, assignmentId);
    }
}
