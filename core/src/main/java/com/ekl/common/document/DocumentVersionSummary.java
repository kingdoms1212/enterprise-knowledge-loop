package com.ekl.common.document;

import java.time.OffsetDateTime;
import java.util.UUID;

public record DocumentVersionSummary(UUID id, int versionNumber, String parseStatus, String publishState,
                                     OffsetDateTime createdAt) {
}
