package com.ekl.core.voice.controller;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CursorPage;
import com.ekl.core.voice.VoiceWorkspace;
import com.ekl.core.voice.service.VoiceWorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/voices")
class VoiceWorkspaceController {
    private final VoiceWorkspaceService workspace;

    VoiceWorkspaceController(VoiceWorkspaceService workspace) {
        this.workspace = workspace;
    }

    @GetMapping
    @PreAuthorize("isAuthenticated()")
    public CursorPage<VoiceWorkspace.Row> list(HttpServletRequest request, Authentication auth,
            @RequestParam(name = "cursor", required = false) String cursor,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        return workspace.list(RequestActor.from(request, auth), cursor, limit);
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<VoiceWorkspace.Detail> detail(HttpServletRequest request, Authentication auth,
                                                           @PathVariable("id") UUID id) {
        return ResponseEntity.of(workspace.find(RequestActor.from(request, auth), id));
    }

    @GetMapping("/capabilities")
    @PreAuthorize("isAuthenticated()")
    public VoiceWorkspace.Capabilities capabilities(HttpServletRequest request, Authentication auth) {
        return workspace.capabilities(RequestActor.from(request, auth));
    }
}
