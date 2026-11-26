package com.ekl.core.document.blo;

import java.nio.charset.StandardCharsets;
import java.time.OffsetDateTime;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.service.AclService;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.document.service.DocumentService;
import com.ekl.common.folder.service.FolderService;
import com.ekl.core.document.DocumentLibrary;
import com.ekl.core.document.LibraryPage;
import com.ekl.core.document.dao.DocumentLibraryDao;
import com.ekl.core.document.dao.DocumentLibraryDao.Candidate;
import com.ekl.core.document.dao.DocumentLibraryDao.FolderCandidate;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class DocumentLibraryBloImpl implements DocumentLibraryBlo {
    private static final int CANDIDATE_BATCH = 64;
    private final DocumentLibraryDao dao;
    private final AuthorizationService authorization;
    private final DocumentService documents;
    private final FolderService folders;
    private final AclService policies;

    DocumentLibraryBloImpl(DocumentLibraryDao dao, AuthorizationService authorization, DocumentService documents,
                           FolderService folders, AclService policies) {
        this.dao = dao;
        this.authorization = authorization;
        this.documents = documents;
        this.folders = folders;
        this.policies = policies;
    }

    @Override
    public LibraryPage<DocumentLibrary.DocumentRow> listDocuments(SessionContext session, DocumentLibrary.View view,
                                                                   UUID folder, String cursor, int limit) {
        validateLimit(limit);
        var after = decodeDocumentCursor(cursor);
        var department = dao.department(session).orElse(null);
        if (department == null || !authorization.hasRole(session, "READ", department) || !readableFolder(session, folder)) {
            return new LibraryPage<>(List.of(), null);
        }
        var items = new ArrayList<DocumentLibrary.DocumentRow>();
        String next = null;
        while (true) {
            var batch = dao.documentCandidates(session, department, view, folder, after, CANDIDATE_BATCH);
            var allowed = authorization.readableScopes(session, batch.stream().map(Candidate::id).toList(), "DOCUMENT");
            for (var candidate : batch) {
                var scope = allowed.get(candidate.id());
                if (scope == null) {
                    continue;
                }
                Optional<DocumentLibrary.DocumentRow> row = documents.findReadable(candidate.id(), scope).flatMap(document ->
                        policies.findReadable(candidate.id(), scope).map(policy -> new DocumentLibrary.DocumentRow(
                                document, policy.classificationLevel(), policy.origin(), candidate.updatedAt())));
                if (row.isPresent()) {
                    if (items.size() == limit) {
                        return new LibraryPage<>(items, next);
                    }
                    items.add(row.orElseThrow());
                    next = encodeDocumentCursor(candidate);
                }
            }
            if (batch.size() < CANDIDATE_BATCH) {
                return new LibraryPage<>(items, null);
            }
            after = batch.getLast();
        }
    }

    @Override
    public LibraryPage<DocumentLibrary.FolderRow> listFolders(SessionContext session, UUID department, UUID parent,
                                                               String cursor, int limit) {
        validateLimit(limit);
        UUID after = cursor == null ? null : parseUuid(cursor);
        if (department == null || !authorization.hasRole(session, "READ", null) || !readableFolder(session, parent)) {
            return new LibraryPage<>(List.of(), null);
        }
        var items = new ArrayList<DocumentLibrary.FolderRow>();
        var managesDepartment = authorization.hasRole(session, "DOCUMENT_MANAGE", department);
        while (true) {
            var batch = dao.folderCandidates(session.organizationId(), department, parent, after, CANDIDATE_BATCH);
            var allowed = authorization.readableScopes(session, batch.stream().map(FolderCandidate::id).toList(), "FOLDER");
            for (var candidate : batch) {
                var scope = allowed.get(candidate.id());
                if (scope == null) {
                    continue;
                }
                var folder = folders.findReadable(candidate.id(), scope);
                if (folder.isPresent()) {
                    if (items.size() == limit) {
                        return new LibraryPage<>(items, items.getLast().folder().id().toString());
                    }
                    boolean manage = managesDepartment
                            && authorization.check(session, candidate.id(), "FOLDER", "DOCUMENT_MANAGE").allowed();
                    items.add(new DocumentLibrary.FolderRow(folder.orElseThrow(), candidate.rowVersion(), manage));
                }
            }
            if (batch.size() < CANDIDATE_BATCH) {
                return new LibraryPage<>(items, null);
            }
            after = batch.getLast().id();
        }
    }

    @Override
    public DocumentLibrary.Capabilities capabilities(SessionContext session) {
        var department = dao.department(session).orElse(null);
        return new DocumentLibrary.Capabilities(department != null && authorization.hasRole(session, "DOCUMENT_UPLOAD", department),
                department != null && authorization.hasRole(session, "DOCUMENT_MANAGE", department));
    }

    private boolean readableFolder(SessionContext session, UUID id) {
        if (id == null) {
            return true;
        }
        var result = authorization.checkRead(session, id, "FOLDER");
        return result.allowed() && !result.emergency();
    }

    private void validateLimit(int limit) {
        if (limit < 1 || limit > 100) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
    }

    private String encodeDocumentCursor(Candidate candidate) {
        var value = candidate.orderTime() + "|" + candidate.id();
        return Base64.getUrlEncoder().withoutPadding().encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private Candidate decodeDocumentCursor(String cursor) {
        if (cursor == null) {
            return null;
        }
        try {
            if (cursor.length() > 128) {
                throw new IllegalArgumentException();
            }
            var value = new String(Base64.getUrlDecoder().decode(cursor), StandardCharsets.UTF_8).split("\\|", -1);
            if (value.length != 2) {
                throw new IllegalArgumentException();
            }
            return new Candidate(UUID.fromString(value[1]), OffsetDateTime.parse(value[0]), null);
        } catch (IllegalArgumentException | java.time.DateTimeException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
    }

    private UUID parseUuid(String value) {
        try {
            return UUID.fromString(value);
        } catch (IllegalArgumentException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
    }
}
