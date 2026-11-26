package com.ekl.common.document.controller;

import java.io.IOException;
import java.util.Map;
import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.acl.RegistrationPolicyPreview;
import com.ekl.common.document.DocumentChange;
import com.ekl.common.document.service.DocumentCommandService;
import com.ekl.common.support.CommandResult;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestHeader;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/v1/documents")
class DocumentCommandController {
    private final DocumentCommandService documents;

    DocumentCommandController(DocumentCommandService documents) {
        this.documents = documents;
    }

    @PostMapping("/policy-preview")
    @PreAuthorize("isAuthenticated()")
    public RegistrationPolicyPreview preview(HttpServletRequest request, Authentication authentication,
                                             @RequestBody DocumentChange.PolicyPreview input) {
        return documents.preview(RequestActor.from(request, authentication), input);
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> create(HttpServletRequest request, Authentication authentication,
                                      @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                      @RequestParam("title") String title,
                                      @RequestParam("owner_department_id") UUID department,
                                      @RequestParam(value = "folder_id", required = false) UUID folder,
                                      @RequestParam("classification_level") Integer classification,
                                      @RequestParam("file") MultipartFile content) throws IOException {
        var input = new DocumentChange.Create(title, department, folder, classification, file(content));
        return response(documents.create(RequestActor.from(request, authentication), key, input));
    }

    @PostMapping(value = "/{id}/versions", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> addVersion(HttpServletRequest request, Authentication authentication,
                                          @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                          @PathVariable("id") UUID id, @RequestParam("expected_version") Long version,
                                          @RequestParam("file") MultipartFile content) throws IOException {
        return response(documents.addVersion(RequestActor.from(request, authentication), id, key, version, file(content)));
    }

    @PostMapping("/{id}/versions/{version}/publish")
    @ResponseStatus(HttpStatus.ACCEPTED)
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> publish(HttpServletRequest request, Authentication authentication,
                                       @RequestHeader(value = "Idempotency-Key", required = false) String key,
                                       @PathVariable("id") UUID id, @PathVariable("version") UUID version,
                                       @RequestBody DocumentChange.Publish input) {
        return response(documents.publish(RequestActor.from(request, authentication), id, version, key,
                input.expectedVersion()));
    }

    @PostMapping("/{id}/retire")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> retire(HttpServletRequest request, Authentication authentication,
                                      @PathVariable("id") UUID id, @RequestBody DocumentChange.Retire input) {
        return response(documents.retire(RequestActor.from(request, authentication), id, input));
    }

    @PostMapping("/{id}/versions/{version}/unpublish")
    @PreAuthorize("isAuthenticated()")
    public Map<String, Object> unpublish(HttpServletRequest request, Authentication authentication,
                                         @PathVariable("id") UUID id, @PathVariable("version") UUID version,
                                         @RequestBody DocumentChange.Publish input) {
        return response(documents.unpublish(RequestActor.from(request, authentication), id, version,
                input.expectedVersion()));
    }

    private DocumentChange.File file(MultipartFile content) throws IOException {
        if (content.isEmpty() || content.getSize() > 10L * 1024 * 1024) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        return new DocumentChange.File(content.getOriginalFilename(), content.getBytes());
    }

    private Map<String, Object> response(CommandResult result) {
        return Map.of("document_id", result.id(), "job_id", result.jobId(), "row_version", result.rowVersion());
    }
}
