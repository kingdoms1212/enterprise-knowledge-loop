package com.ekl.core.knowledge;

import java.util.List;
import java.util.UUID;

public final class KnowledgeWorkspace {
    private KnowledgeWorkspace() {
    }

    public record Row(UUID id, UUID knowledgeId, String title, int versionNumber, String kind, String state) {
    }

    public record Source(UUID documentId, UUID caseId, String title, Integer versionNumber, String locator) {
    }

    public record Detail(Row version, String body, long rowVersion, boolean canEdit, boolean canSubmit,
                         KnowledgeReview.Step approval, List<Source> sources) {
    }
}
