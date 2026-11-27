package com.ekl.core.job;

import com.ekl.core.job.blo.DocumentParseBlo;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.EnableScheduling;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@EnableScheduling
@ConditionalOnProperty(name = "ekl.ai.enabled", havingValue = "true")
class DocumentParseScheduler {
    private final DocumentParseBlo parser;

    DocumentParseScheduler(DocumentParseBlo parser) {
        this.parser = parser;
    }

    @Scheduled(fixedDelayString = "${ekl.ai.parse-poll-ms}")
    public void poll() {
        parser.processNext();
    }
}
