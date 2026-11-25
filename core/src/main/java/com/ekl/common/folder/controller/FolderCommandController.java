package com.ekl.common.folder.controller;

import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.folder.FolderChange;
import com.ekl.common.folder.service.FolderCommandService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/document-folders")
class FolderCommandController {
    private final FolderCommandService folders;

    FolderCommandController(FolderCommandService folders) {
        this.folders = folders;
    }

    @PostMapping
    @ResponseStatus(HttpStatus.CREATED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> create(HttpServletRequest request, Authentication authentication,
                                     @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                     @RequestBody FolderChange.Create input) {
        var result = folders.create(RequestActor.from(request, authentication), key, input);
        return Map.of("folder_id", result.id(), "row_version", result.rowVersion());
    }

    @PatchMapping("/{id}")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> rename(HttpServletRequest request, Authentication authentication,
                                     @PathVariable("id") UUID id, @RequestBody FolderChange.Rename input) {
        var result = folders.rename(RequestActor.from(request, authentication), id, input);
        return Map.of("folder_id", result.id(), "row_version", result.rowVersion());
    }

    @DeleteMapping("/{id}")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    @PreAuthorize("isAuthenticated()")
    public void archive(HttpServletRequest request, Authentication authentication, @PathVariable("id") UUID id) {
        folders.archive(RequestActor.from(request, authentication), id);
    }
}
