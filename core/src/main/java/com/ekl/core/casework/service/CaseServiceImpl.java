package com.ekl.core.casework.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;
import com.ekl.core.casework.blo.CaseBlo;
import com.ekl.framework.service.BaseService;
import org.springframework.stereotype.Service;

@Service
class CaseServiceImpl extends BaseService<CaseSummary, ResourceReadScope> implements CaseService {
    private final CaseBlo blo;

    CaseServiceImpl(CaseBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<CaseSummary> read(UUID resourceId, ResourceReadScope scope) {
        return blo.findReadable(resourceId, scope);
    }
}
