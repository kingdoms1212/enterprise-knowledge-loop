package com.ekl.core.retrieval.blo;

import java.util.List;
import com.ekl.common.acl.ResourceSearchScope;

import com.ekl.core.retrieval.KeywordHit;
import com.ekl.core.retrieval.dao.RetrievalDao;
import org.springframework.stereotype.Component;

@Component
class RetrievalBloImpl implements RetrievalBlo {
    private final RetrievalDao dao;

    RetrievalBloImpl(RetrievalDao dao) {
        this.dao = dao;
    }

    @Override
    public List<KeywordHit> searchKeywords(ResourceSearchScope scope, String tokens, int limit) {
        if (!(scope != null && tokens != null && !tokens.isBlank() && limit >= 1 && limit <= 100)) {
            return List.of();
        }
        return dao.searchKeywords(scope, tokens, limit);
    }
}
