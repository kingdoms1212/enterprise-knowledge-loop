package com.ekl.core.casework.blo;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;
import com.ekl.core.casework.dao.CaseDao;
import com.ekl.framework.blo.BaseBlo;
import org.springframework.stereotype.Component;

@Component
class CaseBloImpl extends BaseBlo<CaseSummary, ResourceReadScope> implements CaseBlo {
    private final CaseDao dao;

    CaseBloImpl(CaseDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<CaseSummary> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
