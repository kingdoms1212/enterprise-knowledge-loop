package com.ekl.core.voice.controller;

import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.voice.VoiceChange;
import com.ekl.core.voice.service.VoiceCommandService;
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
@RequestMapping("/api/v1/voices")
class VoiceCommandController {
    private final VoiceCommandService voices;

    VoiceCommandController(VoiceCommandService voices) {
        this.voices = voices;
    }

    @PostMapping("/intake")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> intake(HttpServletRequest request, Authentication auth,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestBody VoiceChange.Intake input) {
        var result = voices.intake(RequestActor.from(request, auth), key, input);
        return Map.of("voice_id", result.id(), "job_id", result.jobId(), "row_version", result.rowVersion());
    }

    @PostMapping("/{id}/triage")
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> triage(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestBody VoiceChange.Triage input) {
        var result = voices.triage(RequestActor.from(request, auth), id, key, input);
        return Map.of("case_id", result.id(), "row_version", result.rowVersion());
    }
}
