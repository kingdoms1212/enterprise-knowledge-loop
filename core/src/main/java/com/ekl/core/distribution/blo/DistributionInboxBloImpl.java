package com.ekl.core.distribution.blo;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.AuthorizedPage;
import com.ekl.common.support.CursorPage;
import com.ekl.core.distribution.DistributionInbox;
import com.ekl.core.distribution.dao.DistributionInboxDao;
import org.springframework.stereotype.Component;

@Component
class DistributionInboxBloImpl implements DistributionInboxBlo {
    private final DistributionInboxDao dao;
    private final AuthorizationService authorization;

    DistributionInboxBloImpl(DistributionInboxDao dao, AuthorizationService authorization) {
        this.dao = dao;
        this.authorization = authorization;
    }

    @Override
    public CursorPage<DistributionInbox.Item> list(SessionContext session, String cursor, int limit) {
        return AuthorizedPage.read(session, "KNOWLEDGE_VERSION", cursor, limit, authorization,
                (after, batch) -> dao.candidates(session, after, batch), scope -> dao.item(session, scope));
    }
}
