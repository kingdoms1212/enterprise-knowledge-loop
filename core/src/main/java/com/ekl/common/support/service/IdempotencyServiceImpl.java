package com.ekl.common.support.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.blo.IdempotencyBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class IdempotencyServiceImpl implements IdempotencyService {
    private final IdempotencyBlo blo;

    IdempotencyServiceImpl(IdempotencyBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash) {
        return blo.findMatchingResponseStatus(actorId, operation, key, requestHash);
    }
}
