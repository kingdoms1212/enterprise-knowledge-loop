package com.ekl.core.retrieval.service;

import java.util.List;
import com.ekl.common.acl.ResourceSearchScope;

import com.ekl.core.retrieval.KeywordHit;
import com.ekl.core.retrieval.blo.RetrievalBlo;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.stereotype.Service;

@Service
class RetrievalServiceImpl implements RetrievalService {
    private final RetrievalBlo blo;

    RetrievalServiceImpl(RetrievalBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(readOnly = true)
    public List<KeywordHit> searchKeywords(ResourceSearchScope scope, String tokens, int limit) {
        return blo.searchKeywords(scope, tokens, limit);
    }
}
