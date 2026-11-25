package com.ekl.core.distribution.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.distribution.DistributionSummary;
import com.ekl.core.distribution.blo.DistributionBlo;
import com.ekl.framework.service.BaseService;
import org.springframework.stereotype.Service;

@Service
class DistributionServiceImpl extends BaseService<DistributionSummary, ResourceReadScope> implements DistributionService {
    private final DistributionBlo blo;

    DistributionServiceImpl(DistributionBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<DistributionSummary> read(UUID resourceId, ResourceReadScope scope) {
        return blo.findReadable(resourceId, scope);
    }
}
