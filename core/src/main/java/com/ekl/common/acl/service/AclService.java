package com.ekl.common.acl.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.AclPolicy;
import com.ekl.common.acl.ResourceReadScope;

public interface AclService {
    Optional<AclPolicy> findReadable(UUID resourceId, ResourceReadScope scope);
}
