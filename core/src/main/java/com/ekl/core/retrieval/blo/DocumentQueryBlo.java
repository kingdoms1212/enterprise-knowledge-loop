package com.ekl.core.retrieval.blo;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.retrieval.DocumentQuery.Request;
import com.ekl.core.retrieval.DocumentQuery.Response;

public interface DocumentQueryBlo {
    Response query(RequestActor actor, Request request);
}
