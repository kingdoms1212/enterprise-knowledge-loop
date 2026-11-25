package com.ekl.core.knowledge.controller;

import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.KnowledgeDraftEdit;
import com.ekl.core.knowledge.KnowledgeRetirement;
import com.ekl.core.knowledge.service.KnowledgeCommandService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge")
class KnowledgeCommandController {
    private final KnowledgeCommandService knowledge;

    KnowledgeCommandController(KnowledgeCommandService knowledge) {
        this.knowledge = knowledge;
    }

    @PatchMapping("/{id}/versions/{version}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> editDraft(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                         @PathVariable("version") UUID version, @RequestBody KnowledgeDraftEdit input) {
        var result = knowledge.editDraft(RequestActor.from(request, auth), id, version, input);
        return Map.of("version_id", result.id(), "row_version", result.rowVersion());
    }

    @PostMapping("/{id}/versions/{version}/retire")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> retire(HttpServletRequest request, Authentication auth, @PathVariable("id") UUID id,
                                      @PathVariable("version") UUID version, @RequestBody KnowledgeRetirement input) {
        var result = knowledge.retire(RequestActor.from(request, auth), id, version, input);
        return Map.of("version_id", result.id(), "row_version", result.rowVersion());
    }
}
