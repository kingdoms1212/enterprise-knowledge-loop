package com.ekl.core.casework.blo;

import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;

public interface CaseBlo {
    Optional<CaseSummary> findReadable(UUID resourceId, ResourceReadScope scope);
}
