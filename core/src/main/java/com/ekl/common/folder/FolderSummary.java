package com.ekl.common.folder;

import java.util.UUID;

public record FolderSummary(UUID id, String name, UUID ownerDepartmentId, UUID parentId) {
}
