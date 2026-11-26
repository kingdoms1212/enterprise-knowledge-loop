package com.ekl.core.casework.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.casework.CaseWorkspace;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.AuthorizedPage;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.casework.dao.CaseWorkspaceDao;
import org.springframework.stereotype.Component;

@Component
class CaseWorkspaceBloImpl implements CaseWorkspaceBlo {
    private final CaseWorkspaceDao dao;
    private final AuthorizationService authorization;
    private final AuditService audit;

    CaseWorkspaceBloImpl(CaseWorkspaceDao dao, AuthorizationService authorization, AuditService audit) {
        this.dao = dao;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Override
    public CursorPage<CaseWorkspace.Row> list(SessionContext session, String cursor, int limit) {
        return AuthorizedPage.read(session, "CASE", cursor, limit, authorization,
                (after, batch) -> dao.candidates(session.organizationId(), after, batch), dao::findRow);
    }

    @Override
    public Optional<CaseWorkspace.Detail> find(SessionContext session, UUID id) {
        var access = authorization.checkRead(session, id, "CASE");
        var scope = access.scope();
        var detail = access.allowed() && !access.emergency()
                ? dao.findDetail(scope).map(row -> new CaseWorkspace.Detail(
                        row.work(), row.department(), row.type(), row.urgency(), row.closeNote(), row.rowVersion(),
                        row.decision(), row.outcome(),
                        !"CLOSED".equals(row.work().state()) && authorization.hasRole(session, "DECIDE", row.departmentId())
                                && authorization.check(session, id, "CASE", "DECIDE").allowed(),
                        row.pendingTasks()))
                : Optional.<CaseWorkspace.Detail>empty();
        var reason = access.emergency() ? "EMERGENCY_CONTEXT_REQUIRED" : access.reasonCode();
        audit.recordAccess(new ResourceAccessAudit(session, access.personId(), id, "CASE", "READ",
                detail.isPresent(), reason, scope == null ? null : scope.policyRevision()));
        return detail;
    }
}
