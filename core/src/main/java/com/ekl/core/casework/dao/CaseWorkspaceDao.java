package com.ekl.core.casework.dao;

import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.acl.ResourceReadScope;
import com.ekl.core.casework.CaseWorkspace;

public interface CaseWorkspaceDao {
    List<UUID> candidates(UUID organization, UUID after, int limit);
    Optional<CaseWorkspace.Row> findRow(ResourceReadScope scope);
    Optional<DetailRow> findDetail(ResourceReadScope scope);

    record DetailRow(CaseWorkspace.Row work, UUID departmentId, String department, String type, String urgency,
                     String closeNote, long rowVersion, CaseWorkspace.Decision decision, CaseWorkspace.Outcome outcome,
                     boolean pendingTasks) {
    }
}
