package com.ekl.common.user.dao;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;

public interface UserDao {
    Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId);
}
