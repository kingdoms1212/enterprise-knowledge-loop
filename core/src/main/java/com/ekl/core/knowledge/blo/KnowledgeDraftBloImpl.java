package com.ekl.core.knowledge.blo;

import java.nio.charset.StandardCharsets;
import java.util.HashSet;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Set;
import java.util.UUID;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.acl.service.PolicyRegistrationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.common.support.service.LocalBlobStore;
import com.ekl.core.knowledge.NewKnowledge;
import com.ekl.core.knowledge.dao.KnowledgeDraftDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class KnowledgeDraftBloImpl implements KnowledgeDraftBlo {
    private static final Set<String> KINDS = Set.of("SOLUTION", "LESSON", "REFERENCE");
    private final LoginService login;
    private final AuthorizationService auth;
    private final PolicyRegistrationService policies;
    private final CommandService commands;
    private final KnowledgeDraftDao dao;

    KnowledgeDraftBloImpl(LoginService login, AuthorizationService auth, PolicyRegistrationService policies,
                         CommandService commands, KnowledgeDraftDao dao) {
        this.login = login;
        this.auth = auth;
        this.policies = policies;
        this.commands = commands;
        this.dao = dao;
    }

    @Override
    public NewKnowledge.Created create(RequestActor actor, String key, NewKnowledge input) {
        var session = login.current(actor);
        if (!auth.hasRole(session, "CREATE", null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        var title = CommandRules.required(input.title(), 255);
        var body = CommandRules.required(input.body(), 100_000);
        var kind = input.kind() == null ? "REFERENCE" : input.kind();
        if (!KINDS.contains(kind) || input.sources() == null || input.sources().isEmpty()
                || input.sources().size() > 30) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var sources = normalizeSources(input.sources());
        commands.lockOrganization(session.organizationId());
        var sourcePolicies = new LinkedHashMap<NewKnowledge.Source, KnowledgeDraftDao.SourcePolicy>();
        var departments = new HashSet<UUID>();
        var highestClassification = 0;
        for (var source : sources) {
            var policy = dao.lockSource(session.organizationId(), source)
                    .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
            var access = auth.checkRead(session, policy.resourceId(), policy.type());
            if (!access.allowed() || access.emergency()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
            sourcePolicies.put(source, policy);
            highestClassification = Math.max(highestClassification, policy.classification());
            if ("PRIMARY".equals(source.role())) {
                departments.add(policy.ownerDepartment());
            }
        }
        if (departments.size() != 1 || departments.contains(null)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var department = departments.iterator().next();
        if (!auth.hasRole(session, "CREATE", department)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        var level = input.classification() == null ? highestClassification : input.classification();
        if (level < highestClassification || level > 3) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var sourceHash = CommandRules.digest(sources.stream().map(source -> CommandRules.digest(source.role(),
                source.document(), source.caseId(), source.outcome(), source.locator())).toArray());
        var requestHash = CommandRules.digest(title, kind, body, sourceHash, level, input.acl(), input.sharing());
        var result = commands.once(session, "POST /knowledge", key, requestHash, 201, () -> {
            var knowledge = UUID.randomUUID();
            var version = UUID.randomUUID();
            policies.register(new ResourcePolicyRegistration(session.organizationId(), actor.accountId(), version,
                    "KNOWLEDGE_VERSION", department, level, null));
            if (!dao.matchesRequestedPolicy(version, input.acl(), input.sharing())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
            }
            var normalized = new NewKnowledge(title, kind, body, sources, level, input.acl(), input.sharing());
            dao.insert(session, knowledge, version, normalized,
                    LocalBlobStore.sha256(body.getBytes(StandardCharsets.UTF_8)));
            sourcePolicies.forEach((source, policy) -> dao.addSource(version, source, policy));
            return new CommandResult(knowledge, null, 0L);
        });
        return new NewKnowledge.Created(result.id(), dao.initialVersion(result.id()));
    }

    private List<NewKnowledge.Source> normalizeSources(List<NewKnowledge.Source> sources) {
        var identities = new HashSet<UUID>();
        return sources.stream().map(source -> {
            if (source == null || !("PRIMARY".equals(source.role()) || "RELATED".equals(source.role()))
                    || (source.document() == null && (source.caseId() == null || source.outcome() == null))
                    || (source.document() != null && (source.caseId() != null || source.outcome() != null))
                    || !identities.add(source.document() == null ? source.outcome() : source.document())) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
            }
            return new NewKnowledge.Source(source.role(), source.document(), source.caseId(), source.outcome(),
                    CommandRules.required(source.locator(), 2000));
        }).toList();
    }
}
