package com.ekl.core.document.controller;

import java.util.UUID;

import com.ekl.core.document.DocumentDetail;
import com.ekl.core.document.service.DocumentAccessService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/documents")
class DocumentController {
    private final DocumentAccessService documents;

    DocumentController(DocumentAccessService documents) {
        this.documents = documents;
    }

    @GetMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public ResponseEntity<DocumentDetail> detail(@PathVariable("id") UUID id, HttpServletRequest request,
                                                 Authentication authentication) {
        var session = request.getSession(false);
        if (session == null) {
            return ResponseEntity.status(401).build();
        }
        return ResponseEntity.of(documents.findDocument(session.getId(),
                UUID.fromString(authentication.getName()), id));
    }
}
