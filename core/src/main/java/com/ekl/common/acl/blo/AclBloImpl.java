package com.ekl.common.acl.blo;

import java.util.Optional;

import com.ekl.common.acl.AclPolicy;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.acl.dao.AclDao;
import com.ekl.framework.blo.BaseBlo;
import org.springframework.stereotype.Component;

@Component
class AclBloImpl extends BaseBlo<AclPolicy, ResourceReadScope> implements AclBlo {
    private final AclDao dao;

    AclBloImpl(AclDao dao) {
        super(ResourceReadScope::resourceId);
        this.dao = dao;
    }

    @Override
    protected Optional<AclPolicy> load(ResourceReadScope scope) {
        return dao.findReadable(scope);
    }
}
