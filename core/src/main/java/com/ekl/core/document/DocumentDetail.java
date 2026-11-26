package com.ekl.core.document;

import java.util.List;

import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.DocumentVersionSummary;

public record DocumentDetail(DocumentSummary document, List<DocumentVersionSummary> versions, PolicySummary policy,
                             Actions actions) {
    public DocumentDetail {
        versions = List.copyOf(versions);
    }

    public record PolicySummary(String origin, int classificationLevel) {
    }

    public record Actions(boolean uploadVersion, boolean publish, boolean retire) {
    }
}
