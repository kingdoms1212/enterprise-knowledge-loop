package com.ekl.core.retrieval.blo;

import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.concurrent.TimeUnit;
import java.util.regex.Pattern;

import com.ekl.common.acl.ResourceSearchScope;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.service.CommandService;
import com.ekl.common.support.service.LocalBlobStore;
import com.ekl.core.ai.AiCallFailure;
import com.ekl.core.ai.GenerationPort;
import com.ekl.core.retrieval.DocumentQuery.Hit;
import com.ekl.core.retrieval.DocumentQuery.Request;
import com.ekl.core.retrieval.DocumentQuery.Response;
import com.ekl.core.retrieval.dao.DocumentQueryDao;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

import static java.nio.charset.StandardCharsets.UTF_8;

@Component
class DocumentQueryBloImpl implements DocumentQueryBlo {
    private static final String DOCUMENT = "DOCUMENT";
    private static final Pattern LINKS = Pattern.compile("(?i)(?:[a-z][a-z0-9+.-]*://|www\\.|\\]\\s*(?:\\(|\\[)|!\\[|<[^>]*>)");
    private final LoginService login;
    private final AuthorizationService authorization;
    private final DocumentQueryDao dao;
    private final CommandService commands;
    private final ObjectProvider<GenerationPort> generation;

    DocumentQueryBloImpl(LoginService login, AuthorizationService authorization, DocumentQueryDao dao, CommandService commands,
                         ObjectProvider<GenerationPort> generation) {
        this.login = login;
        this.authorization = authorization;
        this.dao = dao;
        this.commands = commands;
        this.generation = generation;
    }

    @Override
    public Response query(RequestActor actor, Request request) {
        long started = System.nanoTime();
        var id = UUID.randomUUID();
        String question = request.question() == null ? "" : request.question().strip();
        int topK = request.topK() == null ? 5 : request.topK();
        if (question.isBlank() || question.length() > 1000 || question.indexOf(0) >= 0 || topK < 1 || topK > 8) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST);
        }
        var entry = actor.context() != null ? actor.context() : login.current(actor);
        commands.lockOrganizationForQuery(entry.organizationId());
        var session = login.current(actor);
        if (request.caseId() != null) {
            var read = authorization.checkRead(session, request.caseId(), "CASE");
            if (!read.allowed() || read.emergency()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
        }

        var pipeline = dao.pipeline(session.organizationId()).orElse(null);
        if (pipeline == null) {
            return response(id, "AI_UNAVAILABLE", "MODEL_ERROR");
        }
        var scopes = authorization.searchableScopes(session, dao.indexedDocuments(session.organizationId()), DOCUMENT);
        var hits = scopes.isEmpty() ? List.<Hit>of() : dao.search(session.organizationId(), scopes, question, topK);
        var sent = new LinkedHashMap<String, Hit>();
        Response result;
        if (hits.isEmpty()) {
            result = response(id, "NO_EVIDENCE", "NO_EVIDENCE");
        } else if (!stillAllowed(actor, session, hits)) {
            result = response(id, "DENIED", "ACL_CHANGED");
        } else {
            result = generate(id, actor, session, hits, sent);
        }
        var latency = (int) Math.min(Integer.MAX_VALUE, TimeUnit.NANOSECONDS.toMillis(System.nanoTime() - started));
        var auditReason = scopes.isEmpty() ? "ALL_FILTERED" : result.outcomeReason();
        dao.record(session, pipeline, request.caseId(), LocalBlobStore.sha256(question.getBytes(UTF_8)),
                latency, result, auditReason, hits, sent);
        return result;
    }

    private Response generate(UUID id, RequestActor actor, SessionContext session, List<Hit> hits, Map<String, Hit> sent) {
        var adapter = generation.getIfAvailable();
        if (adapter == null) {
            return response(id, "AI_UNAVAILABLE", "MODEL_ERROR");
        }
        var sourceMap = new LinkedHashMap<String, String>();
        for (var hit : hits) {
            var key = "s" + (sent.size() + 1);
            sent.put(key, hit);
            sourceMap.put(key, hit.version().toString());
        }
        try {
            var result = adapter.generate(hits.stream().map(Hit::text).toList(), sourceMap, 256, "document-fts-v1");
            if (!stillAllowed(actor, session, hits)) {
                return response(id, "DENIED", "ACL_CHANGED");
            }
            if (!"DUMMY".equals(result.mode()) || result.answer() == null || result.answer().isBlank()
                    || LINKS.matcher(result.answer()).find()) {
                return response(id, "FAILED", "OUTPUT_BLOCKED");
            }
            var keys = result.citationKeys();
            if (keys == null || keys.isEmpty() || !sourceMap.keySet().containsAll(keys)) {
                return response(id, "CITATION_FAILED", "OUTPUT_BLOCKED");
            }
            var sources = keys.stream().distinct().map(key -> sent.get(key).source(key)).toList();
            return new Response(id, "ANSWERED", null, true, result.mode(), result.answer(), sources);
        } catch (AiCallFailure failure) {
            return "AI_INVALID_RESPONSE".equals(failure.getMessage())
                    ? response(id, "CITATION_FAILED", "OUTPUT_BLOCKED")
                    : response(id, "AI_UNAVAILABLE", "MODEL_ERROR");
        }
    }

    private boolean stillAllowed(RequestActor actor, SessionContext session, List<Hit> hits) {
        var current = login.current(actor.sessionId(), actor.accountId());
        if (!current.equals(session)) {
            return false;
        }
        var ids = hits.stream().map(Hit::document).distinct().toList();
        var scopes = authorization.searchableScopes(current, ids, DOCUMENT);
        return hits.stream().allMatch(hit -> scopes.contains(new ResourceSearchScope(current.organizationId(),
                hit.document(), hit.acl(), hit.policyRevision())) && dao.isCurrent(current.organizationId(), hit));
    }

    private Response response(UUID id, String status, String reason) {
        return new Response(id, status, reason, true, null, null, List.of());
    }
}
