package com.ekl.framework.blo;

import java.util.Optional;
import java.util.UUID;
import java.util.function.Function;

public abstract class BaseBlo<T, S> {
    private final Function<S, UUID> resourceId;

    protected BaseBlo(Function<S, UUID> resourceId) {
        this.resourceId = resourceId;
    }

    public Optional<T> findReadable(UUID id, S scope) {
        if (scope == null || !resourceId.apply(scope).equals(id)) {
            return Optional.empty();
        }
        return load(scope);
    }

    protected abstract Optional<T> load(S scope);
}
