package com.ekl.common.auth.blo;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.dao.AuthDao;
import org.springframework.stereotype.Component;

@Component
class AuthBloImpl implements AuthBlo {
    private final AuthDao dao;

    AuthBloImpl(AuthDao dao) {
        this.dao = dao;
    }

    @Override
    public List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId) {
        if (!(organizationId != null && accountId != null)) {
            return List.of();
        }
        return dao.findActiveAssignments(organizationId, accountId);
    }
}
