package com.ekl.core.distribution.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.auth.SessionContext;
import com.ekl.core.distribution.DistributionInbox;

public interface DistributionInboxDao {
    List<UUID> candidates(SessionContext session, UUID after, int limit);
    Optional<DistributionInbox.Item> item(SessionContext session, ResourceReadScope scope);
}
