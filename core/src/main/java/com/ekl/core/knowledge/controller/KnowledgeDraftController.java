package com.ekl.core.knowledge.controller;

import java.util.Map;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.knowledge.NewKnowledge;
import com.ekl.core.knowledge.service.KnowledgeDraftService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/knowledge")
class KnowledgeDraftController {
    private final KnowledgeDraftService knowledge;

    KnowledgeDraftController(KnowledgeDraftService knowledge) {
        this.knowledge = knowledge;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> create(HttpServletRequest request, Authentication auth,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestBody NewKnowledge input) {
        var draft = knowledge.create(RequestActor.from(request, auth), key, input);
        return Map.of("knowledge_id", draft.knowledgeId(), "version_id", draft.versionId(), "row_version", 0);
    }
}
