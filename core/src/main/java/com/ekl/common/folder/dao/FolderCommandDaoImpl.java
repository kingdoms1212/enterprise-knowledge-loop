package com.ekl.common.folder.dao;

import java.util.Optional;
import java.util.UUID;

import org.springframework.jdbc.core.simple.JdbcClient;
import org.springframework.stereotype.Repository;

@Repository
class FolderCommandDaoImpl implements FolderCommandDao {
    private final JdbcClient jdbc;

    FolderCommandDaoImpl(JdbcClient jdbc) {
        this.jdbc = jdbc;
    }

    @Override
    public Optional<LockedFolder> lock(UUID organization, UUID folder) {
        return jdbc.sql("""
                select f.owner_department_id, p.row_version from intake.document_folders f
                join iam.resource_policies p on p.resource_id = f.id and p.organization_id = f.organization_id
                where f.organization_id = :org and f.id = :id and f.archived_at is null
                for update of f, p
                """).param("org", organization).param("id", folder)
                .query((row, index) -> new LockedFolder(row.getObject(1, UUID.class), row.getLong(2))).optional();
    }

    @Override
    public void add(UUID organization, UUID id, UUID department, UUID parent, String name, UUID actor) {
        jdbc.sql("""
                insert into intake.document_folders
                  (id, organization_id, owner_department_id, parent_id, name, created_by)
                values (:id, :org, :dept, :parent, :name, :actor)
                """).param("id", id).param("org", organization).param("dept", department)
                .param("parent", parent).param("name", name).param("actor", actor).update();
    }

    @Override
    public void rename(UUID id, String name, long version) {
        jdbc.sql("update intake.document_folders set name = :name where id = :id")
                .param("name", name).param("id", id).update();
        jdbc.sql("""
                update iam.resource_policies set row_version = row_version + 1, updated_at = now()
                 where resource_id = :id and row_version = :version
                """).param("id", id).param("version", version).update();
    }

    @Override
    public boolean archiveEmpty(UUID id, UUID actor) {
        return jdbc.sql("""
                update intake.document_folders f set archived_at = now(), archived_by = :actor
                 where f.id = :id and not exists (select 1 from intake.document_folders child
                     where child.parent_id = f.id and child.archived_at is null)
                   and not exists (select 1 from intake.documents d where d.folder_id = f.id and d.disposed_at is null)
                """).param("id", id).param("actor", actor).update() == 1;
    }
}
