package com.ekl.common.acl.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.AclPolicy;
import com.ekl.common.acl.ResourceReadScope;
import com.ekl.common.acl.blo.AclBlo;
import com.ekl.framework.service.BaseService;
import org.springframework.stereotype.Service;

@Service
class AclServiceImpl extends BaseService<AclPolicy, ResourceReadScope> implements AclService {
    private final AclBlo blo;

    AclServiceImpl(AclBlo blo) {
        this.blo = blo;
    }

    @Override
    protected Optional<AclPolicy> read(UUID resourceId, ResourceReadScope scope) {
        return blo.findReadable(resourceId, scope);
    }
}
