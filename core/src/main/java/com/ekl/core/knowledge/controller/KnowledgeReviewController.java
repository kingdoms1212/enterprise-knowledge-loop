package com.ekl.core.knowledge.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.KnowledgeReview;
import com.ekl.core.knowledge.service.KnowledgeReviewService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
@PreAuthorize("isAuthenticated()")
class KnowledgeReviewController {
    private final KnowledgeReviewService review;

    KnowledgeReviewController(KnowledgeReviewService review) {
        this.review = review;
    }

    @PostMapping("/knowledge/{knowledge}/versions/{version}/submit")
    Map<String, UUID> submit(HttpServletRequest request, Authentication authentication,
                             @PathVariable UUID knowledge, @PathVariable UUID version,
                             @RequestBody KnowledgeReview.Submit input) {
        return Map.of("step_id", review.submit(RequestActor.from(request, authentication), knowledge, version, input));
    }

    @PostMapping("/approval-steps/{step}/decision")
    ResponseEntity<Map<String, Object>> decide(HttpServletRequest request, Authentication authentication,
                                               @PathVariable UUID step,
                                               @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                               @RequestBody KnowledgeReview.Decision input) {
        var result = review.decide(RequestActor.from(request, authentication), step, key, input);
        var body = new LinkedHashMap<String, Object>();
        body.put("version_id", result.id());
        body.put("row_version", result.rowVersion());
        if (result.jobId() != null) {
            body.put("job_id", result.jobId());
        }
        return ResponseEntity.status(result.jobId() != null ? HttpStatus.ACCEPTED : HttpStatus.OK).body(body);
    }
}
