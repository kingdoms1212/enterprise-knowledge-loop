package com.ekl.common.user.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;

public interface UserService {
    Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId);
}
