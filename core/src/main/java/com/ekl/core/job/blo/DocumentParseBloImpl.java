package com.ekl.core.job.blo;

import java.io.IOException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.UUID;

import com.ekl.common.document.port.DocumentParsingPort;
import com.ekl.common.document.port.DocumentParsingPort.ParseRequest;
import com.ekl.common.document.port.DocumentParsingPort.ParsedDocument;
import com.ekl.common.support.service.LocalBlobStore;
import com.ekl.core.ai.AiCallFailure;
import com.ekl.core.job.DocumentOutboxJob;
import com.ekl.core.job.service.DocumentParseJobService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "ekl.ai.enabled", havingValue = "true")
class DocumentParseBloImpl implements DocumentParseBlo {
    private final DocumentParseJobService jobs;
    private final DocumentParsingPort parser;
    private final LocalBlobStore blobs;

    DocumentParseBloImpl(DocumentParseJobService jobs, DocumentParsingPort parser, LocalBlobStore blobs) {
        this.jobs = jobs;
        this.parser = parser;
        this.blobs = blobs;
    }

    @Override
    public void processNext() {
        jobs.claim().ifPresent(this::process);
    }

    private void process(DocumentOutboxJob job) {
        var input = jobs.input(job);
        if (input.isEmpty()) {
            jobs.succeed(job, null);
            return;
        }
        if (job.exhausted()) {
            jobs.fail(job, "LEASE_EXHAUSTED", false);
            return;
        }
        var source = input.get();
        ParsedDocument result;
        try {
            var content = blobs.read(source.blob(), 10 * 1024 * 1024);
            if (!MessageDigest.isEqual(source.hash(), LocalBlobStore.sha256(content))) {
                jobs.fail(job, "BLOB_HASH_MISMATCH", false);
                return;
            }
            result = parser.parse(new ParseRequest(UUID.randomUUID(), "1", Instant.now().plusSeconds(20),
                    UUID.randomUUID(), job.id(), "document-parser-v1", job.version(), source.mime(), content));
        } catch (IOException failure) {
            jobs.fail(job, "BLOB_READ_FAILED", true);
            return;
        } catch (AiCallFailure failure) {
            jobs.fail(job, failure.getMessage(), failure.retryable());
            return;
        }
        jobs.succeed(job, result);
    }
}
