package com.ekl.common.support.service;

import java.util.Optional;
import java.util.UUID;


public interface IdempotencyService {
    Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash);
}
