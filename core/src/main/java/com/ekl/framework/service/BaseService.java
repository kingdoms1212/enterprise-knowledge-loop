package com.ekl.framework.service;

import java.util.Optional;
import java.util.UUID;

import org.springframework.transaction.annotation.Transactional;

public abstract class BaseService<T, S> {
    @Transactional(readOnly = true)
    public Optional<T> findReadable(UUID id, S scope) {
        return read(id, scope);
    }

    protected abstract Optional<T> read(UUID id, S scope);
}
