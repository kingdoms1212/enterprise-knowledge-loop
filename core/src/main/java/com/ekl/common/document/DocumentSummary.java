package com.ekl.common.document;

import java.util.UUID;

public record DocumentSummary(UUID id, String title, UUID ownerDepartmentId, UUID folderId,
                              UUID currentVersionId, Integer versionNumber, String parseStatus, long rowVersion) {
}
