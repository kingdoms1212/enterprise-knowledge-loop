package com.ekl.core.distribution.blo;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.distribution.DistributionSummary;
import com.ekl.core.distribution.dao.DistributionDao;
import com.ekl.framework.blo.BaseBlo;
import org.springframework.stereotype.Component;

@Component
class DistributionBloImpl extends BaseBlo<DistributionSummary, ResourceReadScope> implements DistributionBlo {
    private final DistributionDao dao;

    DistributionBloImpl(DistributionDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<DistributionSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
