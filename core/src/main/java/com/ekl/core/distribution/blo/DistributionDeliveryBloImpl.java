package com.ekl.core.distribution.blo;

import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.support.service.CommandService;
import com.ekl.core.distribution.dao.DistributionDeliveryDao;
import org.springframework.stereotype.Component;

@Component
class DistributionDeliveryBloImpl implements DistributionDeliveryBlo {
    private final DistributionDeliveryDao dao;
    private final AuthorizationService authorization;
    private final CommandService commands;

    DistributionDeliveryBloImpl(DistributionDeliveryDao dao, AuthorizationService authorization, CommandService commands) {
        this.dao = dao;
        this.authorization = authorization;
        this.commands = commands;
    }

    @Override
    public boolean deliverNext() {
        var work = dao.nextReady().orElse(null);
        if (work == null) {
            return false;
        }
        commands.lockOrganization(work.organizationId());
        if (!dao.lockReady(work)) {
            return false;
        }
        for (var recipient : dao.candidates(work)) {
            var read = authorization.checkRead(recipient.context(), work.versionId(), "KNOWLEDGE_VERSION");
            if (read.allowed() && !read.emergency()) {
                dao.deliver(work, recipient);
            }
        }
        dao.finish(work);
        return true;
    }
}
