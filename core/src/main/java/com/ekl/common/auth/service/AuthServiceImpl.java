package com.ekl.common.auth.service;

import java.util.List;
import java.util.UUID;

import com.ekl.common.auth.AssignmentSummary;
import com.ekl.common.auth.blo.AuthBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class AuthServiceImpl implements AuthService {
    private final AuthBlo blo;

    AuthServiceImpl(AuthBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<AssignmentSummary> findActiveAssignments(UUID organizationId, UUID accountId) {
        return blo.findActiveAssignments(organizationId, accountId);
    }
}
