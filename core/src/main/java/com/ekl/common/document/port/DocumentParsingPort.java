package com.ekl.common.document.port;

import java.time.Instant;
import java.util.List;
import java.util.UUID;

public interface DocumentParsingPort {
    ParsedDocument parse(ParseRequest request);

    record ParseRequest(UUID requestId, String schemaVersion, Instant deadline, UUID nonce,
                        UUID taskId, String configVersion, UUID artifactId) {
    }

    record ParsedDocument(List<ParsedPage> pages) {
        public ParsedDocument {
            pages = List.copyOf(pages);
        }
    }

    record ParsedPage(int pageNumber, String text) {
    }
}
