package com.ekl.core.retrieval.controller;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.retrieval.DocumentQuery.Request;
import com.ekl.core.retrieval.DocumentQuery.Response;
import com.ekl.core.retrieval.service.DocumentQueryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/rag/queries")
class DocumentQueryController {
    private final DocumentQueryService queries;

    DocumentQueryController(DocumentQueryService queries) {
        this.queries = queries;
    }

    @PostMapping
    @PreAuthorize("isAuthenticated()")
    public Response query(@RequestBody Request input, HttpServletRequest request, Authentication authentication) {
        return queries.query(RequestActor.from(request, authentication), input);
    }
}
