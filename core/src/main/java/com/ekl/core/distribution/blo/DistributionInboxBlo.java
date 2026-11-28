package com.ekl.core.distribution.blo;

import com.ekl.common.auth.SessionContext;
import com.ekl.common.support.CursorPage;
import com.ekl.core.distribution.DistributionInbox;

public interface DistributionInboxBlo {
    CursorPage<DistributionInbox.Item> list(SessionContext session, String cursor, int limit);
}
