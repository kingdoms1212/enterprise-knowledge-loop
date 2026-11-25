package com.ekl.common.support.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.dao.IdempotencyDao;
import org.springframework.stereotype.Component;

@Component
class IdempotencyBloImpl implements IdempotencyBlo {
    private final IdempotencyDao dao;

    IdempotencyBloImpl(IdempotencyDao dao) {
        this.dao = dao;
    }

    @Override
    public Optional<Integer> findMatchingResponseStatus(UUID actorId, String operation, String key, byte[] requestHash) {
        if (!(actorId != null && operation != null && key != null && requestHash != null && !operation.isBlank() && !key.isBlank() && requestHash.length > 0)) {
            return Optional.empty();
        }
        return dao.findMatchingResponseStatus(actorId, operation, key, requestHash);
    }
}
