package com.ekl.common.folder;

import java.util.UUID;

import com.fasterxml.jackson.annotation.JsonProperty;

public final class FolderChange {
    private FolderChange() {
    }

    public record Create(@JsonProperty("owner_department_id") UUID department,
                         @JsonProperty("parent_id") UUID parent, String name,
                         @JsonProperty("classification_level") Integer classification) {
    }

    public record Rename(String name, @JsonProperty("expected_version") Long expectedVersion) {
    }
}
