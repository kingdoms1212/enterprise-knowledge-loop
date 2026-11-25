package com.ekl.core.retrieval.dao;

import java.util.List;
import com.ekl.common.acl.ResourceSearchScope;

import com.ekl.core.retrieval.KeywordHit;

public interface RetrievalDao {
    List<KeywordHit> searchKeywords(ResourceSearchScope scope, String tokens, int limit);
}
