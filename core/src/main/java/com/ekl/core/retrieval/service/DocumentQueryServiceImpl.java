package com.ekl.core.retrieval.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.retrieval.DocumentQuery.Request;
import com.ekl.core.retrieval.DocumentQuery.Response;
import com.ekl.core.retrieval.blo.DocumentQueryBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
class DocumentQueryServiceImpl implements DocumentQueryService {
    private final DocumentQueryBlo blo;

    DocumentQueryServiceImpl(DocumentQueryBlo blo) {
        this.blo = blo;
    }

    @Override
    @Transactional(isolation = Isolation.READ_COMMITTED)
    public Response query(RequestActor actor, Request request) {
        return blo.query(actor, request);
    }
}
