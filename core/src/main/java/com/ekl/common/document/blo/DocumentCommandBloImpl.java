package com.ekl.common.document.blo;

import java.io.IOException;
import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.UUID;
import java.nio.file.Files;
import java.util.zip.ZipFile;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.RegistrationPolicyPreview;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.acl.service.PolicyRegistrationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.document.DocumentChange;
import com.ekl.common.document.dao.DocumentCommandDao;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import com.ekl.common.support.service.LocalBlobStore;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class DocumentCommandBloImpl implements DocumentCommandBlo {
    private static final int MAX_BYTES = 10 * 1024 * 1024;
    private final LoginService login;
    private final AuthorizationService auth;
    private final PolicyRegistrationService policies;
    private final CommandService commands;
    private final LocalBlobStore blobs;
    private final DocumentCommandDao dao;

    DocumentCommandBloImpl(LoginService login, AuthorizationService auth, PolicyRegistrationService policies,
                           CommandService commands, LocalBlobStore blobs, DocumentCommandDao dao) {
        this.login = login;
        this.auth = auth;
        this.policies = policies;
        this.commands = commands;
        this.blobs = blobs;
        this.dao = dao;
    }

    @Override
    public RegistrationPolicyPreview preview(RequestActor actor, DocumentChange.PolicyPreview input) {
        var session = login.current(actor);
        requireUploadTarget(session, input.department(), input.classification());
        if (input.folder() != null) {
            var read = auth.checkRead(session, input.folder(), "FOLDER");
            if (!read.allowed() || read.emergency()) {
                throw new ResponseStatusException(HttpStatus.NOT_FOUND);
            }
            requireFolderWrite(session, input.folder());
        }
        return policies.preview(new ResourcePolicyRegistration(session.organizationId(), actor.accountId(), null,
                "DOCUMENT", input.department(), input.classification(), input.folder()));
    }

    @Override
    public CommandResult create(RequestActor actor, String key, DocumentChange.Create input) {
        var session = login.current(actor);
        var title = CommandRules.required(input.title(), 255);
        requireUploadTarget(session, input.department(), input.classification());
        commands.lockOrganization(session.organizationId());
        requireFolderWrite(session, input.folder());
        var file = validatedFile(input.file());
        return commands.once(session, "POST /documents", key,
                CommandRules.digest(title, input.department(), input.folder(), input.classification(), file.mime(), file.hash()),
                202, () -> {
                    var id = UUID.randomUUID();
                    policies.register(new ResourcePolicyRegistration(session.organizationId(), actor.accountId(), id,
                            "DOCUMENT", input.department(), input.classification(), input.folder()));
                    dao.create(id, input.department(), input.folder(), title);
                    return append(session, id, 0, file);
                });
    }

    @Override
    public CommandResult addVersion(RequestActor actor, UUID id, String key, Long version, DocumentChange.File file) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        var document = locked(session, id, "WRITE");
        requireUpload(session, document.department());
        var content = validatedFile(file);
        return commands.once(session, "POST /documents/" + id + "/versions", key,
                CommandRules.digest(version, content.mime(), content.hash()), 202, () -> {
                    CommandRules.requireVersion(document.revision(), version);
                    return append(session, id, document.revision(), content);
                });
    }

    @Override
    public CommandResult publish(RequestActor actor, UUID id, UUID revision, String key, Long version) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        var document = locked(session, id, "READ");
        requirePublisher(session, document);
        return commands.once(session, "POST /documents/" + id + "/versions/" + revision + "/publish", key,
                CommandRules.digest(version), 202, () -> {
                    CommandRules.requireVersion(document.revision(), version);
                    if (!dao.publishable(id, revision)) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT);
                    }
                    dao.publish(id, revision, actor.accountId(), document.revision());
                    commands.bumpPolicyEpoch(session.organizationId());
                    var job = commands.enqueue("DOCUMENT", id, document.revision() + 1, "IndexRequested",
                            actor.accountId(), revision);
                    return new CommandResult(id, job, document.revision() + 1);
                });
    }

    @Override
    public CommandResult unpublish(RequestActor actor, UUID id, UUID version, Long expectedVersion) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        var document = locked(session, id, "READ");
        requirePublisher(session, document);
        CommandRules.requireVersion(document.revision(), expectedVersion);
        if (!dao.unpublish(id, version, document.revision())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        var next = document.revision() + 1;
        commands.bumpPolicyEpoch(session.organizationId());
        var job = commands.enqueue("DOCUMENT", id, next, "IndexRetire", actor.accountId(), version);
        return new CommandResult(id, job, next);
    }

    @Override
    public CommandResult retire(RequestActor actor, UUID id, DocumentChange.Retire input) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        var document = locked(session, id, "DOCUMENT_MANAGE");
        if (!auth.hasRole(session, "DOCUMENT_MANAGE", document.department())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        CommandRules.requireVersion(document.revision(), input.expectedVersion());
        dao.retire(id, actor.accountId(), CommandRules.required(input.reason(), 2000), document.revision());
        commands.bumpPolicyEpoch(session.organizationId());
        var job = commands.enqueue("DOCUMENT", id, document.revision() + 1, "IndexRetire", actor.accountId(), null);
        return new CommandResult(id, job, document.revision() + 1);
    }

    private DocumentCommandDao.LockedDocument locked(SessionContext session, UUID id, String action) {
        var document = dao.lock(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        var decision = auth.check(session, id, "DOCUMENT", action);
        if (!decision.allowed() || decision.emergency()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        return document;
    }

    private void requireUpload(SessionContext session, UUID department) {
        if (!auth.hasRole(session, "DOCUMENT_UPLOAD", department)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private void requireUploadTarget(SessionContext session, UUID department, Integer classification) {
        if (department == null || classification == null || classification < 0 || classification > 3) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        requireUpload(session, department);
    }

    private void requireFolderWrite(SessionContext session, UUID folder) {
        if (folder != null && !auth.check(session, folder, "FOLDER", "WRITE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
    }

    private void requirePublisher(SessionContext session, DocumentCommandDao.LockedDocument document) {
        if (!session.accountId().equals(document.owner())
                && !auth.hasRole(session, "DOCUMENT_MANAGE", document.department())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }

    private CommandResult append(SessionContext session, UUID id, long revision, ValidatedFile file) {
        var version = UUID.randomUUID();
        var blob = blobs.store(file.content());
        try {
            dao.addVersion(id, version, blob, file.hash(), file.content().length, file.mime(), session.accountId());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        dao.replaceCurrent(id, version, revision);
        var job = commands.enqueue("DOCUMENT", id, revision + 1, "ParseRequested", session.accountId(), version);
        return new CommandResult(id, job, revision + 1);
    }

    private ValidatedFile validatedFile(DocumentChange.File file) {
        var name = file.name() == null ? "" : file.name().toLowerCase(Locale.ROOT);
        var bytes = file.bytes();
        if (bytes == null || bytes.length == 0 || bytes.length > MAX_BYTES) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        var mime = "";
        try {
            if (name.endsWith(".pdf") && bytes.length >= 5
                    && new String(bytes, 0, 5, StandardCharsets.US_ASCII).equals("%PDF-")) {
                mime = "application/pdf";
            } else if (name.endsWith(".txt")) {
                if (StandardCharsets.UTF_8.newDecoder().decode(ByteBuffer.wrap(bytes)).toString().indexOf(0) < 0) {
                    mime = "text/plain";
                }
            } else if (name.endsWith(".docx") && isWordDocument(bytes)) {
                mime = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
            }
        } catch (IOException exception) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        if (mime.isEmpty()) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        return new ValidatedFile(bytes, mime, LocalBlobStore.sha256(bytes));
    }

    private boolean isWordDocument(byte[] bytes) throws IOException {
        var temporaryFile = Files.createTempFile("ekl-upload-", ".zip");
        try {
            Files.write(temporaryFile, bytes);
            try (var zip = new ZipFile(temporaryFile.toFile())) {
                return zip.getEntry("[Content_Types].xml") != null && zip.getEntry("word/document.xml") != null;
            }
        } finally {
            Files.deleteIfExists(temporaryFile);
        }
    }

    private record ValidatedFile(byte[] content, String mime, byte[] hash) {
    }
}
