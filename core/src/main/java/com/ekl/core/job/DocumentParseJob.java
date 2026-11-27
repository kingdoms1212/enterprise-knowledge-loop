package com.ekl.core.job;

import java.util.UUID;

public record DocumentParseJob(UUID id, UUID document, UUID version, UUID lease, int attempts,
                               int maxAttempts, boolean exhausted) {
    public record Input(String blob, String mime, byte[] hash) {
    }
}
