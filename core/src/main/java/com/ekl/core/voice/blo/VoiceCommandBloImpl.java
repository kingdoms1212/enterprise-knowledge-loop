package com.ekl.core.voice.blo;

import java.nio.charset.StandardCharsets;
import java.time.ZoneOffset;
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
import com.ekl.core.casework.TriagedVoice;
import com.ekl.core.casework.service.CaseCommandService;
import com.ekl.core.voice.VoiceChange;
import com.ekl.core.voice.dao.VoiceCommandDao;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class VoiceCommandBloImpl implements VoiceCommandBlo {
    private final LoginService login;
    private final AuthorizationService auth;
    private final PolicyRegistrationService policies;
    private final CommandService commands;
    private final LocalBlobStore blobs;
    private final VoiceCommandDao dao;
    private final CaseCommandService cases;

    VoiceCommandBloImpl(LoginService login, AuthorizationService auth, PolicyRegistrationService policies,
                        CommandService commands, LocalBlobStore blobs, VoiceCommandDao dao, CaseCommandService cases) {
        this.login = login;
        this.auth = auth;
        this.policies = policies;
        this.commands = commands;
        this.blobs = blobs;
        this.dao = dao;
        this.cases = cases;
    }

    @Override
    public CommandResult intake(RequestActor actor, String key, VoiceChange.Intake input) {
        var session = login.current(actor);
        var title = CommandRules.required(input.title(), 255);
        CommandRules.required(input.body(), 100_000);
        var channel = input.channel() == null ? "MANUAL" : input.channel();
        if (!("MANUAL".equals(channel) || "INTERNAL_MANUAL".equals(channel)) || input.receivedAt() == null) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var product = CommandRules.required(input.productCode(), 120);
        var urgency = input.urgency() == null ? null : CommandRules.required(input.urgency(), 60);
        var originalExternalId = input.externalId() == null ? null : CommandRules.required(input.externalId(), 255);
        var externalId = originalExternalId == null ? null : session.organizationId() + "/" + originalExternalId;
        if (!auth.hasRole(session, "VOICE_INTAKE_CREATE", null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        commands.lockOrganization(session.organizationId());
        var department = input.departmentId() == null ? dao.primaryDepartment(session)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT)) : input.departmentId();
        if (!auth.hasRole(session, "VOICE_INTAKE_CREATE", department)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (input.customerId() != null && !dao.validCustomer(session.organizationId(), input.customerId())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var raw = input.body().getBytes(StandardCharsets.UTF_8);
        var date = input.receivedAt().withOffsetSameInstant(ZoneOffset.UTC).toLocalDate();
        var fingerprint = CommandRules.digest(department, channel, date, input.body().strip());
        var requestHash = CommandRules.digest(fingerprint, title, input.customerId(), product, input.receivedAt().toInstant(),
                urgency, externalId, raw);
        return commands.once(session, "POST /voices/intake", key, requestHash, 202, () -> {
            if (dao.duplicate(session.organizationId(), fingerprint, channel, externalId).isPresent()) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            var id = UUID.randomUUID();
            policies.register(new ResourcePolicyRegistration(session.organizationId(), actor.accountId(), id, "VOICE",
                    department, 3, null));
            var normalized = new VoiceChange.Intake(title, input.body(), department, input.customerId(), product,
                    input.receivedAt(), channel, urgency, originalExternalId);
            dao.create(session, id, department, channel, externalId, fingerprint, normalized, blobs.store(raw),
                    LocalBlobStore.sha256(raw), raw.length);
            var job = commands.enqueue("VOICE", id, 0, "VoiceIntakeRequested", actor.accountId(), null);
            return new CommandResult(id, job, 0L);
        });
    }

    @Override
    public CommandResult triage(RequestActor actor, UUID id, String key, VoiceChange.Triage input) {
        var session = login.current(actor);
        if (!auth.hasRole(session, "VOICE_TRIAGE", null)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        if (input.department() == null || input.handler() == null || input.existingCase() != null
                || (input.relatedDepartments() != null && !input.relatedDepartments().isEmpty())) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var type = CommandRules.required(input.type(), 120);
        var urgency = CommandRules.required(input.urgency(), 60);
        var reason = input.overrideReason() == null ? null : CommandRules.required(input.overrideReason(), 2000);
        commands.lockOrganization(session.organizationId());
        var voice = dao.lock(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var access = auth.checkRead(session, id, "VOICE");
        if (!access.allowed() || access.emergency()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        var hash = CommandRules.digest(type, urgency, input.department(), input.handler(), reason, input.expectedVersion());
        return commands.once(session, "POST /voices/" + id + "/triage", key, hash, 201, () -> {
            CommandRules.requireVersion(voice.version(), input.expectedVersion());
            if (!"ANALYZED".equals(voice.status()) && !"ANALYSIS_FAILED".equals(voice.status())) {
                throw new ResponseStatusException(HttpStatus.CONFLICT);
            }
            if (reason == null && (changed(voice.proposedType(), type) || changed(voice.proposedUrgency(), urgency)
                    || changed(voice.proposedDepartment(), input.department().toString()))) {
                throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
            }
            dao.markTriaged(id, voice.version());
            var caseId = cases.createFromTriage(session, new TriagedVoice(id, input.department(), input.handler(),
                    voice.title(), voice.product(), voice.classification(), type, urgency, reason));
            return new CommandResult(caseId, null, 0L);
        });
    }

    private boolean changed(String proposal, String confirmed) {
        return proposal != null && !proposal.equals(confirmed);
    }
}
