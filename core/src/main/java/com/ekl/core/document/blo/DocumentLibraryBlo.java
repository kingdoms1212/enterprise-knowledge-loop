package com.ekl.core.document.blo;

import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.document.DocumentLibrary;
import com.ekl.core.document.LibraryPage;

public interface DocumentLibraryBlo {
    LibraryPage<DocumentLibrary.DocumentRow> listDocuments(SessionContext session, DocumentLibrary.View view,
                                                           UUID folder, String cursor, int limit);
    LibraryPage<DocumentLibrary.FolderRow> listFolders(SessionContext session, UUID department, UUID parent,
                                                       String cursor, int limit);
    DocumentLibrary.Capabilities capabilities(SessionContext session);
}
