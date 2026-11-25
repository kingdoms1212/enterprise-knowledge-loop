package com.ekl.core.distribution.dao;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.distribution.DistributionSummary;

public interface DistributionDao {
    Optional<DistributionSummary> findReadable(ResourceReadScope scope);
}
