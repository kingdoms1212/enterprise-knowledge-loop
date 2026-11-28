package com.ekl.core.knowledge.controller;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CursorPage;
import com.ekl.core.knowledge.KnowledgeWorkspace;
import com.ekl.core.knowledge.service.KnowledgeWorkspaceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge")
@PreAuthorize("isAuthenticated()")
class KnowledgeWorkspaceController {
    private final KnowledgeWorkspaceService workspace;

    KnowledgeWorkspaceController(KnowledgeWorkspaceService workspace) {
        this.workspace = workspace;
    }

    @GetMapping("/drafts")
    CursorPage<KnowledgeWorkspace.Row> drafts(HttpServletRequest request, Authentication authentication,
                                             @RequestParam(required = false) String cursor,
                                             @RequestParam(defaultValue = "20") int limit) {
        return workspace.drafts(RequestActor.from(request, authentication), cursor, limit);
    }

    @GetMapping("/versions/{version}")
    KnowledgeWorkspace.Detail detail(HttpServletRequest request, Authentication authentication,
                                     @PathVariable UUID version) {
        return workspace.detail(RequestActor.from(request, authentication), version);
    }

    @GetMapping("/reviews")
    CursorPage<KnowledgeWorkspace.Row> reviews(HttpServletRequest request, Authentication authentication,
                                              @RequestParam(required = false) String cursor,
                                              @RequestParam(defaultValue = "20") int limit) {
        return workspace.reviews(RequestActor.from(request, authentication), cursor, limit);
    }
}
