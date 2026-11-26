package com.ekl.common.support;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.UUID;
import java.util.function.BiFunction;
import java.util.function.Function;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import org.springframework.http.HttpStatus;
import org.springframework.web.server.ResponseStatusException;

public final class AuthorizedPage {
    private static final int BATCH_SIZE = 64;

    private AuthorizedPage() {
    }

    public static <T> CursorPage<T> read(SessionContext session, String resourceType, String cursor, int limit,
                                        AuthorizationService authorization,
                                        BiFunction<UUID, Integer, List<UUID>> candidates,
                                        Function<ResourceReadScope, Optional<T>> load) {
        if (limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        UUID after = decode(cursor);
        if (!authorization.hasRole(session, "READ", null)) {
            return new CursorPage<>(List.of(), null);
        }
        var items = new ArrayList<T>();
        UUID lastVisible = null;
        while (true) {
            var batch = candidates.apply(after, BATCH_SIZE);
            var scopes = authorization.readableScopes(session, batch, resourceType);
            for (var id : batch) {
                var scope = scopes.get(id);
                if (scope == null) {
                    continue;
                }
                var row = load.apply(scope);
                if (row.isPresent()) {
                    if (items.size() == limit) {
                        return new CursorPage<>(items, lastVisible.toString());
                    }
                    items.add(row.orElseThrow());
                    lastVisible = id;
                }
            }
            if (batch.size() < BATCH_SIZE) {
                return new CursorPage<>(items, null);
            }
            after = batch.getLast();
        }
    }

    private static UUID decode(String cursor) {
        try {
            return cursor == null ? null : UUID.fromString(cursor);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
    }
}
