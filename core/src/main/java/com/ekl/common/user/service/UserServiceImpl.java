package com.ekl.common.user.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;
import com.ekl.common.user.blo.UserBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class UserServiceImpl implements UserService {
    private final UserBlo blo;

    UserServiceImpl(UserBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId) {
        return blo.findActiveUser(organizationId, accountId);
    }
}
