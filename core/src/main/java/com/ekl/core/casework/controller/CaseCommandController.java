package com.ekl.core.casework.controller;

import java.util.LinkedHashMap;
import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.casework.CaseChange;
import com.ekl.core.casework.service.CaseCommandService;
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
@RequestMapping("/api/v1/cases")
class CaseCommandController {
    private final CaseCommandService cases;

    CaseCommandController(CaseCommandService cases) {
        this.cases = cases;
    }

    @PostMapping("/{id}/decisions")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> decide(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                      @RequestBody CaseChange.Decide input) {
        var result = cases.decide(RequestActor.from(request, auth), id, input);
        return Map.of("decision_id", result.id(), "row_version", result.rowVersion());
    }

    @PostMapping("/{id}/close")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> close(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                     @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                     @RequestBody CaseChange.Close input) {
        var result = cases.close(RequestActor.from(request, auth), id, key, input);
        Map<String, Object> response = new LinkedHashMap<>();
        response.put("case_id", result.id());
        response.put("row_version", result.rowVersion());
        if (result.jobId() != null) {
            response.put("job_id", result.jobId());
        }
        return response;
    }
}
