package com.ekl.common.acl.service;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.RegistrationPolicyPreview;
import com.ekl.common.acl.blo.PolicyRegistrationBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

@Service
class PolicyRegistrationServiceImpl implements PolicyRegistrationService {
    private final PolicyRegistrationBlo blo;

    PolicyRegistrationServiceImpl(PolicyRegistrationBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public RegistrationPolicyPreview preview(ResourcePolicyRegistration registration) {
        return blo.preview(registration);
    }

    @Override
    @Transactional(propagation = Propagation.MANDATORY)
    public void register(ResourcePolicyRegistration registration) {
        blo.register(registration);
    }
}
