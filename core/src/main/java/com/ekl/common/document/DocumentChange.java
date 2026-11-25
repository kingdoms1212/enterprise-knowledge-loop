package com.ekl.common.document;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class DocumentChange {
    private DocumentChange() {
    }

    public record File(String name, byte[] bytes) {
    }

    public record Create(String title, UUID department, UUID folder, Integer classification, File file) {
    }

    public record Retire(String reason, @JsonProperty("expected_version") Long expectedVersion) {
    }

    public record Publish(@JsonProperty("expected_version") Long expectedVersion) {
    }
}
