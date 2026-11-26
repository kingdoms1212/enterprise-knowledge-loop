package com.ekl.common.acl.service;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.RegistrationPolicyPreview;

public interface PolicyRegistrationService {
    RegistrationPolicyPreview preview(ResourcePolicyRegistration registration);
    void register(ResourcePolicyRegistration registration);
}
