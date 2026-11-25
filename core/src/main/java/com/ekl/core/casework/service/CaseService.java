package com.ekl.core.casework.service;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;

public interface CaseService {
    Optional<CaseSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
