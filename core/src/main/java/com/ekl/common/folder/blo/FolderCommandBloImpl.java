package com.ekl.common.folder.blo;

import java.util.UUID;

import com.ekl.common.acl.ResourcePolicyRegistration;
import com.ekl.common.acl.service.AuthorizationService;
import com.ekl.common.acl.service.PolicyRegistrationService;
import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.SessionContext;
import com.ekl.common.auth.service.LoginService;
import com.ekl.common.folder.FolderChange;
import com.ekl.common.folder.dao.FolderCommandDao;
import com.ekl.common.support.CommandResult;
import com.ekl.common.support.CommandRules;
import com.ekl.common.support.service.CommandService;
import org.springframework.dao.DuplicateKeyException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ResponseStatusException;

@Component
class FolderCommandBloImpl implements FolderCommandBlo {
    private final LoginService login;
    private final AuthorizationService auth;
    private final PolicyRegistrationService policies;
    private final FolderCommandDao dao;
    private final CommandService commands;

    FolderCommandBloImpl(LoginService login, AuthorizationService auth, PolicyRegistrationService policies,
                         FolderCommandDao dao, CommandService commands) {
        this.login = login;
        this.auth = auth;
        this.policies = policies;
        this.dao = dao;
        this.commands = commands;
    }

    @Override
    public CommandResult create(RequestActor actor, String key, FolderChange.Create input) {
        var session = login.current(actor);
        var name = CommandRules.required(input.name(), 255);
        if (input.department() == null || (input.parent() != null && input.classification() != null)) {
            throw new ResponseStatusException(HttpStatus.UNPROCESSABLE_CONTENT);
        }
        requireManager(session, input.department());
        commands.lockOrganization(session.organizationId());
        if (input.parent() != null) {
            findManagedFolder(session, input.parent());
        }
        return commands.once(session, "POST /document-folders", key,
                CommandRules.digest(input.department(), input.parent(), name, input.classification()), 201, () -> {
                    var id = UUID.randomUUID();
                    policies.register(new ResourcePolicyRegistration(session.organizationId(), actor.accountId(), id,
                            "FOLDER", input.department(), input.classification(), input.parent()));
                    try {
                        dao.add(session.organizationId(), id, input.department(), input.parent(), name, actor.accountId());
                    } catch (DuplicateKeyException exception) {
                        throw new ResponseStatusException(HttpStatus.CONFLICT);
                    }
                    return new CommandResult(id, null, 0L);
                });
    }

    @Override
    public CommandResult rename(RequestActor actor, UUID id, FolderChange.Rename input) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        var folder = findManagedFolder(session, id);
        CommandRules.requireVersion(folder.version(), input.expectedVersion());
        try {
            dao.rename(id, CommandRules.required(input.name(), 255), folder.version());
        } catch (DuplicateKeyException exception) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        return new CommandResult(id, null, folder.version() + 1);
    }

    @Override
    public void archive(RequestActor actor, UUID id) {
        var session = login.current(actor);
        commands.lockOrganization(session.organizationId());
        findManagedFolder(session, id);
        if (!dao.archiveEmpty(id, actor.accountId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT);
        }
        commands.bumpPolicyEpoch(session.organizationId());
    }

    private FolderCommandDao.LockedFolder findManagedFolder(SessionContext session, UUID id) {
        var folder = dao.lock(session.organizationId(), id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND));
        if (!auth.check(session, id, "FOLDER", "DOCUMENT_MANAGE").allowed()) {
            throw new ResponseStatusException(HttpStatus.NOT_FOUND);
        }
        requireManager(session, folder.department());
        return folder;
    }

    private void requireManager(SessionContext session, UUID department) {
        if (!auth.hasRole(session, "DOCUMENT_MANAGE", department)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
