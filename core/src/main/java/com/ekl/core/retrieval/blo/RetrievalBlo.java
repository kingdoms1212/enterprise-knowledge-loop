package com.ekl.core.retrieval.blo;

import java.util.List;
import com.ekl.common.acl.ResourceSearchScope;

import com.ekl.core.retrieval.KeywordHit;

public interface RetrievalBlo {
    List<KeywordHit> searchKeywords(ResourceSearchScope scope, String tokens, int limit);
}
