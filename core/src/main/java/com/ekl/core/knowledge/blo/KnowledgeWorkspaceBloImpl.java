package com.ekl.core.knowledge.blo;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.AuthorizedPage;
import com.ekl.common.support.CursorPage;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.knowledge.KnowledgeWorkspace;
import com.ekl.core.knowledge.dao.KnowledgeWorkspaceDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class KnowledgeWorkspaceBloImpl implements KnowledgeWorkspaceBlo {
    private static final String TYPE = "KNOWLEDGE_VERSION";
    private final KnowledgeWorkspaceDao dao;
    private final AuthorizationService authorization;
    private final AuditService audit;
    private final KnowledgeReviewBlo review;

    KnowledgeWorkspaceBloImpl(KnowledgeWorkspaceDao dao, AuthorizationService authorization, AuditService audit,
                              KnowledgeReviewBlo review) {
        this.dao = dao;
        this.authorization = authorization;
        this.audit = audit;
        this.review = review;
    }

    @Override
    public CursorPage<KnowledgeWorkspace.Row> drafts(SessionContext session, String cursor, int limit) {
        return AuthorizedPage.read(session, TYPE, cursor, limit, authorization,
                (after, batch) -> dao.candidates(session.organizationId(), session.accountId(), after, batch),
                scope -> sourcesReadable(session, scope.resourceId(), dao.liveSources(scope.resourceId()))
                        ? dao.row(scope) : Optional.empty());
    }

    @Override
    public CursorPage<KnowledgeWorkspace.Row> reviews(SessionContext session, String cursor, int limit) {
        return AuthorizedPage.read(session, TYPE, cursor, limit, authorization,
                (after, batch) -> dao.reviewCandidates(session.organizationId(), session.assignmentId(), after, batch),
                scope -> {
                    var step = review.step(session, scope.resourceId());
                    return step != null && step.canDecide()
                            && sourcesReadable(session, scope.resourceId(), dao.liveSources(scope.resourceId()))
                            ? dao.row(scope) : Optional.empty();
                });
    }

    @Override
    public KnowledgeWorkspace.Detail detail(SessionContext session, UUID version) {
        var access = authorization.checkRead(session, version, TYPE);
        var scope = access.scope();
        var sources = access.allowed() && !access.emergency() ? dao.liveSources(version) : List.<KnowledgeWorkspace.Source>of();
        var stored = access.allowed() && !access.emergency() && sourcesReadable(session, version, sources)
                ? dao.detail(scope).orElse(null) : null;
        var approval = stored == null ? null : review.step(session, version);
        if (stored != null && List.of("DRAFT", "REVIEW", "APPROVED").contains(stored.version().state())
                && !stored.author().equals(session.accountId()) && (approval == null || !approval.canDecide())) {
            stored = null;
        }
        var reason = access.emergency() ? "EMERGENCY_CONTEXT_REQUIRED"
                : access.allowed() && stored == null ? "SOURCE_READ_REQUIRED" : access.reasonCode();
        audit.recordAccess(new ResourceAccessAudit(session, access.personId(), version, TYPE,
                "READ", stored != null, reason, scope == null ? null : scope.policyRevision()));
        if (stored == null) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        boolean edit = "DRAFT".equals(stored.version().state()) && authorization.check(session, version, TYPE, "WRITE").allowed();
        boolean submit = "DRAFT".equals(stored.version().state()) && session.accountId().equals(stored.author())
                && sources.stream().allMatch(source -> source.documentId() != null)
                && authorization.hasRole(session, "SUBMIT", stored.department())
                && authorization.check(session, version, TYPE, "SUBMIT").allowed();
        return new KnowledgeWorkspace.Detail(stored.version(), stored.body(), stored.rowVersion(), edit, submit, approval, sources);
    }

    private boolean sourcesReadable(SessionContext session, UUID version, List<KnowledgeWorkspace.Source> sources) {
        if (sources.isEmpty() || sources.size() != dao.sourceCount(version)) {
            return false;
        }
        return sources.stream().allMatch(source -> {
            var access = source.documentId() == null
                    ? authorization.checkRead(session, source.caseId(), "CASE")
                    : authorization.checkRead(session, source.documentId(), "DOCUMENT");
            return access.allowed() && !access.emergency();
        });
    }
}
