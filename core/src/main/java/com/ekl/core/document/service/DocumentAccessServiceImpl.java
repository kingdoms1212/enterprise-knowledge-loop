package com.ekl.core.document.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.service.AclService;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.document.DocumentSummary;
import com.ekl.common.document.service.DocumentService;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.document.DocumentDetail;
import com.ekl.core.document.dao.DocumentLibraryDao;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
class DocumentAccessServiceImpl implements DocumentAccessService {
    private final LoginService login;
    private final AuthorizationService authorization;
    private final DocumentService documents;
    private final AclService policies;
    private final AuditService audit;
    private final DocumentLibraryDao library;

    DocumentAccessServiceImpl(LoginService login, AuthorizationService authorization, DocumentService documents,
                              AclService policies, AuditService audit, DocumentLibraryDao library) {
        this.login = login;
        this.authorization = authorization;
        this.documents = documents;
        this.policies = policies;
        this.audit = audit;
        this.library = library;
    }

    @Override
    @Transactional(isolation = Isolation.REPEATABLE_READ)
    public Optional<DocumentDetail> findDocument(String sessionId, UUID accountId, UUID documentId) {
        var session = login.current(sessionId, accountId);
        var decision = authorization.checkRead(session, documentId, "DOCUMENT");
        var scope = decision.scope();
        var detail = decision.allowed() ? documents.findReadable(documentId, scope).flatMap(document ->
                policies.findReadable(documentId, scope).map(policy -> new DocumentDetail(document,
                        documents.findReadableVersions(documentId, scope),
                        new DocumentDetail.PolicySummary(policy.origin(), policy.classificationLevel()),
                        actions(session, document, decision.emergency()))))
                : Optional.<DocumentDetail>empty();
        var action = detail.isPresent() && decision.emergency() ? "EMERGENCY_READ" : "READ";
        var reason = decision.allowed() && detail.isEmpty() ? "RESOURCE_NOT_FOUND" : decision.reasonCode();
        audit.recordAccess(new ResourceAccessAudit(session, decision.personId(), documentId, "DOCUMENT",
                action, detail.isPresent(), reason, scope == null ? null : scope.policyRevision()));
        return detail;
    }

    private DocumentDetail.Actions actions(SessionContext session, DocumentSummary document, boolean emergency) {
        if (emergency) {
            return new DocumentDetail.Actions(false, false, false);
        }
        var department = document.ownerDepartmentId();
        var manager = authorization.hasRole(session, "DOCUMENT_MANAGE", department);
        var upload = authorization.hasRole(session, "DOCUMENT_UPLOAD", department)
                && authorization.check(session, document.id(), "DOCUMENT", "WRITE").allowed();
        var retire = manager && authorization.check(session, document.id(), "DOCUMENT", "DOCUMENT_MANAGE").allowed();
        return new DocumentDetail.Actions(upload, manager || library.ownsDocument(session, document.id()), retire);
    }
}
