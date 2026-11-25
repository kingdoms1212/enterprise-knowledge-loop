package com.ekl.common.user.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.user.ActiveUser;

public interface UserBlo {
    Optional<ActiveUser> findActiveUser(UUID organizationId, UUID accountId);
}
