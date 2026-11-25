package com.ekl.common.support.dao;

import java.util.Optional;
import java.util.UUID;


public interface IdempotencyDao {
    Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash);
}
