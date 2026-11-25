package com.ekl.core.distribution.controller;

import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.distribution.DistributionPlan;
import com.ekl.core.distribution.service.DistributionCommandService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/distributions")
class DistributionCommandController {
    private final DistributionCommandService distributions;

    DistributionCommandController(DistributionCommandService distributions) {
        this.distributions = distributions;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> create(HttpServletRequest request, Authentication auth,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestBody DistributionPlan input) {
        var result = distributions.create(RequestActor.from(request, auth), key, input);
        return Map.of("distribution_id", result.id(), "job_id", result.jobId(), "row_version", result.rowVersion());
    }

    @PostMapping("/{id}/acknowledgements")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> acknowledge(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id) {
        var timestamp = distributions.acknowledge(RequestActor.from(request, auth), id);
        return Map.of("distribution_id", id, "acknowledged_at", timestamp);
    }

    @PostMapping("/{id}/redeliver")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> redeliver(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                         @RequestHeader(value = "Idempotency-Key", required = false) String key) {
        var result = distributions.redeliver(RequestActor.from(request, auth), id, key);
        return Map.of("distribution_id", result.id(), "job_id", result.jobId(), "row_version", result.rowVersion());
    }
}
