package com.ekl.core.document.controller;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.document.DocumentLibrary;
import com.ekl.core.document.LibraryPage;
import com.ekl.core.document.service.DocumentLibraryService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1")
class DocumentLibraryController {
    private final DocumentLibraryService library;

    DocumentLibraryController(DocumentLibraryService library) {
        this.library = library;
    }

    @GetMapping("/documents")
    @PreAuthorize("isAuthenticated()")
    public LibraryPage<DocumentLibrary.DocumentRow> documents(HttpServletRequest request, Authentication auth,
            @RequestParam(name = "view", defaultValue = "MY_DEPARTMENT") DocumentLibrary.View view,
            @RequestParam(name = "folder_id", required = false) UUID folder,
            @RequestParam(name = "cursor", required = false) String cursor,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        return library.listDocuments(RequestActor.from(request, auth), view, folder, cursor, limit);
    }

    @GetMapping("/document-folders")
    @PreAuthorize("isAuthenticated()")
    public LibraryPage<DocumentLibrary.FolderRow> folders(HttpServletRequest request, Authentication auth,
            @RequestParam(name = "owner_department_id") UUID department,
            @RequestParam(name = "parent_id", required = false) UUID parent,
            @RequestParam(name = "cursor", required = false) String cursor,
            @RequestParam(name = "limit", defaultValue = "20") int limit) {
        return library.listFolders(RequestActor.from(request, auth), department, parent, cursor, limit);
    }

    @GetMapping("/document-library/capabilities")
    @PreAuthorize("isAuthenticated()")
    public DocumentLibrary.Capabilities capabilities(HttpServletRequest request, Authentication auth) {
        return library.capabilities(RequestActor.from(request, auth));
    }
}
