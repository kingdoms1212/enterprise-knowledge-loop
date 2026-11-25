package com.ekl.common.user.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;
import com.ekl.common.user.dao.UserDao;
import org.springframework.stereotype.Component;

@Component
class UserBloImpl implements UserBlo {
    private final UserDao dao;

    UserBloImpl(UserDao dao) {
        this.dao = dao;
    }

    @Override
    public Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId) {
        if (!(organizationId != null && accountId != null)) {
            return Optional.empty();
        }
        return dao.findActiveUser(organizationId, accountId);
    }
}
