package com.ekl.core.job;

import com.ekl.core.job.service.DocumentIndexService;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

@Component
@ConditionalOnProperty(name = "ekl.ai.enabled", havingValue = "true")
class DocumentIndexScheduler {
    private final DocumentIndexService jobs;

    DocumentIndexScheduler(DocumentIndexService jobs) {
        this.jobs = jobs;
    }

    @Scheduled(fixedDelayString = "${ekl.ai.parse-poll-ms}")
    public void poll() {
        process("IndexRetire");
        process("IndexRequested");
    }

    private void process(String eventType) {
        jobs.claim(eventType).ifPresent(job -> {
            try {
                jobs.handle(job, eventType);
            } catch (RuntimeException failure) {
                jobs.retry(job);
            }
        });
    }
}
