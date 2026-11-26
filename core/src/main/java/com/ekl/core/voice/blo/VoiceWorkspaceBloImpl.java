package com.ekl.core.voice.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.support.CursorPage;
import com.ekl.core.voice.VoiceWorkspace;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.AuthorizedPage;
import com.ekl.core.audit.ResourceAccessAudit;
import com.ekl.core.audit.service.AuditService;
import com.ekl.core.voice.dao.VoiceWorkspaceDao;
import org.springframework.stereotype.Component;

@Component
class VoiceWorkspaceBloImpl implements VoiceWorkspaceBlo {
    private final VoiceWorkspaceDao dao;
    private final AuthorizationService authorization;
    private final AuditService audit;

    VoiceWorkspaceBloImpl(VoiceWorkspaceDao dao, AuthorizationService authorization, AuditService audit) {
        this.dao = dao;
        this.authorization = authorization;
        this.audit = audit;
    }

    @Override
    public CursorPage<VoiceWorkspace.Row> list(SessionContext session, String cursor, int limit) {
        return AuthorizedPage.read(session, "VOICE", cursor, limit, authorization,
                (after, batch) -> dao.candidates(session.organizationId(), after, batch), dao::findRow);
    }

    @Override
    public Optional<VoiceWorkspace.Detail> find(SessionContext session, UUID id) {
        var access = authorization.checkRead(session, id, "VOICE");
        var scope = access.scope();
        var detail = access.allowed() && !access.emergency()
                ? dao.findDetail(scope, authorization.hasRole(session, "VOICE_TRIAGE", null))
                : Optional.<VoiceWorkspace.Detail>empty();
        var reason = access.emergency() ? "EMERGENCY_CONTEXT_REQUIRED" : access.reasonCode();
        audit.recordAccess(new ResourceAccessAudit(session, access.personId(), id, "VOICE", "READ",
                detail.isPresent(), reason, scope == null ? null : scope.policyRevision()));
        return detail;
    }

    @Override
    public VoiceWorkspace.Capabilities capabilities(SessionContext session) {
        return new VoiceWorkspace.Capabilities(authorization.hasRole(session, "VOICE_INTAKE_CREATE", null));
    }
}
