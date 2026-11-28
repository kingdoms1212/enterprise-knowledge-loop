package com.ekl.core.distribution.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.support.CursorPage;
import com.ekl.core.distribution.DistributionInbox;

public interface DistributionInboxService {
    CursorPage<DistributionInbox.Item> list(RequestActor actor, String cursor, int limit);
}
