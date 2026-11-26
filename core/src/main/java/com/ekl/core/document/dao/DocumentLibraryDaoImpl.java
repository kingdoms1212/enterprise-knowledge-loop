package com.ekl.core.document.dao;

import java.time.OffsetDateTime;
import java.util.List;
import java.util.Optional;
import java.util.UUID;

import com.ekl.common.auth.SessionContext;
import com.ekl.core.document.DocumentLibrary;
import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class DocumentLibraryDaoImpl implements DocumentLibraryDao {
    private final JdbcClient jdbc;

    DocumentLibraryDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<UUID> department(SessionContext session) {
        return jdbc.sql("""
                select department_id from iam.assignments
                 where id = :assignment and organization_id = :org and employment_id = :employment
                """).param("assignment", session.assignmentId()).param("org", session.organizationId())
                .param("employment", session.employmentId()).query(UUID.class).optional();
    }

    @Override
    public boolean ownsDocument(SessionContext session, UUID document) {
        return jdbc.sql("""
                select exists (select 1 from iam.secured_resources
                  where id = :id and organization_id = :org and owner_id = :actor and resource_type = 'DOCUMENT')
                """).param("id", document).param("org", session.organizationId())
                .param("actor", session.accountId()).query(Boolean.class).single();
    }

    @Override
    public List<Candidate> documentCandidates(SessionContext s, UUID department, DocumentLibrary.View view,
                                              UUID folder, Candidate after, int limit) {
        return jdbc.sql("""
                with candidates as (
                    select d.id, coalesce(v.created_at, d.created_at) as updated_at,
                           case when :view = 'RECENT' then greatest(seen.occurred_at, v.created_at, d.created_at)
                                else coalesce(v.created_at, d.created_at) end as sort_at
                      from intake.documents d
                      join iam.secured_resources r on r.id = d.id and r.organization_id = :org
                      left join intake.document_versions v on v.id = d.current_version_id
                      left join lateral (
                          select a.occurred_at from audit.audit_events a
                           where :view = 'RECENT' and a.organization_id = :org and a.actor_id = :actor
                             and a.actor_assignment_id = :assignment and a.target_resource_id = d.id
                             and a.action = 'READ' and a.decision = 'ALLOW'
                           order by a.occurred_at desc limit 1
                      ) seen on true
                     where d.disposed_at is null
                       and (cast(:folder as uuid) is null or d.folder_id = :folder)
                       and case :view
                           when 'MY_DEPARTMENT' then d.owner_department_id = :dept
                                and d.folder_id is not distinct from cast(:folder as uuid)
                           when 'UPLOADED_BY_ME' then exists (select 1 from intake.document_versions owned
                               where owned.document_id = d.id and owned.created_by = :actor)
                           when 'SHARED' then d.owner_department_id <> :dept
                           when 'RECENT' then seen.occurred_at is not null or r.owner_id = :actor
                           else false end
                )
                select id, sort_at, updated_at from candidates
                 where cast(:afterTime as timestamptz) is null or (sort_at, id) < (:afterTime, :afterId)
                 order by sort_at desc, id desc limit :limit
                """).param("org", s.organizationId()).param("actor", s.accountId())
                .param("assignment", s.assignmentId()).param("dept", department).param("folder", folder)
                .param("view", view.name()).param("afterTime", after == null ? null : after.orderTime())
                .param("afterId", after == null ? null : after.id()).param("limit", limit)
                .query((row, index) -> new Candidate(row.getObject(1, UUID.class),
                        row.getObject(2, OffsetDateTime.class), row.getObject(3, OffsetDateTime.class))).list();
    }

    @Override
    public List<FolderCandidate> folderCandidates(UUID organization, UUID department, UUID parent, UUID after, int limit) {
        return jdbc.sql("""
                select f.id, p.row_version from intake.document_folders f
                  join iam.resource_policies p on p.resource_id = f.id and p.organization_id = f.organization_id
                 where f.organization_id = :org and f.owner_department_id = :dept and f.archived_at is null
                   and f.parent_id is not distinct from cast(:parent as uuid)
                   and (cast(:after as uuid) is null or f.id > :after)
                 order by f.id limit :limit
                """).param("org", organization).param("dept", department).param("parent", parent)
                .param("after", after).param("limit", limit).query((row, index) ->
                        new FolderCandidate(row.getObject(1, UUID.class), row.getLong(2))).list();
    }
}
