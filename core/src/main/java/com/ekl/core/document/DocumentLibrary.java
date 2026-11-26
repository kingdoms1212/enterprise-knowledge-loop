package com.ekl.core.document;

import java.time.OffsetDateTime;
import java.util.UUID;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.folder.FolderSummary;

public final class DocumentLibrary {
    private DocumentLibrary() {
    }

    public enum View {
        MY_DEPARTMENT, UPLOADED_BY_ME, SHARED, RECENT
    }

    public record DocumentRow(DocumentSummary document, int classificationLevel, String policyOrigin,
                              OffsetDateTime updatedAt) {
    }

    public record FolderRow(FolderSummary folder, long rowVersion, boolean manage) {
    }

    public record Capabilities(boolean upload, boolean manageFolders) {
    }
}
