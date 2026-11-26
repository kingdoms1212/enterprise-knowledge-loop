package com.ekl.core.document.service;

import java.util.UUID;

import com.ekl.common.auth.RequestActor;
import com.ekl.core.document.DocumentLibrary;
import com.ekl.core.document.LibraryPage;

public interface DocumentLibraryService {
    LibraryPage<DocumentLibrary.DocumentRow> listDocuments(RequestActor actor, DocumentLibrary.View view,
                                                           UUID folder, String cursor, int limit);
    LibraryPage<DocumentLibrary.FolderRow> listFolders(RequestActor actor, UUID department, UUID parent,
                                                       String cursor, int limit);
    DocumentLibrary.Capabilities capabilities(RequestActor actor);
}
