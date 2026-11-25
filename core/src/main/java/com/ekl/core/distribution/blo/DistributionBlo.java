package com.ekl.core.distribution.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.distribution.DistributionSummary;

public interface DistributionBlo {
    Optional<DistributionSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
