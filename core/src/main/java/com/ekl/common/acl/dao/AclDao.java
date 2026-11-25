package com.ekl.common.acl.dao;

import java.util.Optional;

import com.ekl.common.acl.AclPolicy;
import com.ekl.common.acl.ResourceReadScope;

public interface AclDao {
    Optional<AclPolicy> findReadable(ResourceReadScope scope);
}
