package com.ekl.core.distribution.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CursorPage;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.distribution.DistributionInbox;
import com.ekl.core.distribution.blo.DistributionInboxBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
class DistributionInboxServiceImpl implements DistributionInboxService {
    private final LoginService login;
    private final CommandService commands;
    private final DistributionInboxBlo inbox;

    DistributionInboxServiceImpl(LoginService login, CommandService commands, DistributionInboxBlo inbox) {
        this.login = login;
        this.commands = commands;
        this.inbox = inbox;
    }

    @Override
    @Transactional(readOnly = true)
    public CursorPage<DistributionInbox.Item> list(RequestActor actor, String cursor, int limit) {
        var entry = actor.context() == null ? login.current(actor) : actor.context();
        commands.lockOrganizationForQuery(entry.organizationId());
        return inbox.list(login.current(actor), cursor, limit);
    }
}
