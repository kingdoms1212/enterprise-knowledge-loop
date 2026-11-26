package com.ekl.common.acl.blo;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.RegistrationPolicyPreview;

public interface PolicyRegistrationBlo {
    RegistrationPolicyPreview preview(ResourcePolicyRegistration registration);
    void register(ResourcePolicyRegistration registration);
}
