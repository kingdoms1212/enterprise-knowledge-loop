package com.ekl.core.retrieval.service;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.retrieval.DocumentQuery.Request;
import com.ekl.core.retrieval.DocumentQuery.Response;

public interface DocumentQueryService {
    Response query(RequestActor actor, Request request);
}
