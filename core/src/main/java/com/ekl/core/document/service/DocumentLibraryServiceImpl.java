package com.ekl.core.document.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.common.auth.service.LoginService;
import com.ekl.core.document.DocumentLibrary;
import com.ekl.core.document.LibraryPage;
import com.ekl.core.document.blo.DocumentLibraryBlo;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Isolation;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true, isolation = Isolation.REPEATABLE_READ)
class DocumentLibraryServiceImpl implements DocumentLibraryService {
    private final LoginService login;
    private final DocumentLibraryBlo blo;

    DocumentLibraryServiceImpl(LoginService login, DocumentLibraryBlo blo) {
        this.login = login;
        this.blo = blo;
    }

    @Override
    public LibraryPage<DocumentLibrary.DocumentRow> listDocuments(RequestActor actor, DocumentLibrary.View view,
                                                                  UUID folder, String cursor, int limit) {
        return blo.listDocuments(login.current(actor), view, folder, cursor, limit);
    }

    @Override
    public LibraryPage<DocumentLibrary.FolderRow> listFolders(RequestActor actor, UUID department, UUID parent,
                                                              String cursor, int limit) {
        return blo.listFolders(login.current(actor), department, parent, cursor, limit);
    }

    @Override
    public DocumentLibrary.Capabilities capabilities(RequestActor actor) {
        return blo.capabilities(login.current(actor));
    }
}
