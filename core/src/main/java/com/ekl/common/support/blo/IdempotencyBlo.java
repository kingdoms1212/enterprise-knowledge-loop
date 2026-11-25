package com.ekl.common.support.blo;

import java.util.Optional;
import java.util.UUID;


public interface IdempotencyBlo {
    Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash);
}
