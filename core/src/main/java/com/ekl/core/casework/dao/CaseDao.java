package com.ekl.core.casework.dao;

import java.util.Optional;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseSummary;

public interface CaseDao {
    Optional<CaseSummary> findReadable(ResourceReadScope scope);
}
