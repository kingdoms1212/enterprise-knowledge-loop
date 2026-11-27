package com.ekl.common.document.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DocumentParsingPort {
    ParsedDocument parse(ParseRequest request);

    record ParseRequest(UUID requestId, String schemaVersion, Instant deadline, UUID nonce,
                        UUID taskId, String configVersion, UUID artifactId, String mime, byte[] content) {
    }

    record ParsedDocument(ParseStatus status, List<ParsedSegment> segments) {
        public ParsedDocument {
            segments = List.copyOf(segments);
            if (status == null || (status == ParseStatus.PARSED) != !segments.isEmpty()) {
                throw new IllegalArgumentException("Invalid parser response");
            }
        }
    }

    enum ParseStatus { PARSED, OCR_REQUIRED, QUALITY_FAILED }

    record ParsedSegment(Integer page, Integer paragraph, String text) {
    }
}
