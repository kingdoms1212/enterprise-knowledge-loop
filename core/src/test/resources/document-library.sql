INSERT INTO iam.organizations (id, name)
VALUES ('81000000-0000-0000-0000-000000000001', 'Document library test');
INSERT INTO iam.departments (id, organization_id, name)
VALUES ('81000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000001', 'Operations');
INSERT INTO iam.persons (id, display_name)
VALUES ('81000000-0000-0000-0000-000000000003', 'Test user');
INSERT INTO iam.users (id, organization_id, login, display_name, password_hash, clearance_level, person_id)
VALUES ('81000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000001',
        'library-test', 'Test user', 'fixture', 2, '81000000-0000-0000-0000-000000000003');
INSERT INTO iam.acls (id, organization_id, canonical_hash, canonical_json, policy_version, created_by)
VALUES ('81000000-0000-0000-0000-000000000004', '81000000-0000-0000-0000-000000000001',
        sha256('library-test'), '{}', 1, '81000000-0000-0000-0000-000000000003');
INSERT INTO iam.secured_resources (id, organization_id, resource_type)
VALUES ('81000000-0000-0000-0000-000000000005', '81000000-0000-0000-0000-000000000001', 'FOLDER'),
       ('81000000-0000-0000-0000-000000000006', '81000000-0000-0000-0000-000000000001', 'DOCUMENT');
INSERT INTO intake.document_folders (id, organization_id, owner_department_id, name, created_by)
VALUES ('81000000-0000-0000-0000-000000000005', '81000000-0000-0000-0000-000000000001',
        '81000000-0000-0000-0000-000000000002', 'Runbooks', '81000000-0000-0000-0000-000000000003');
INSERT INTO intake.documents (id, title, owner_department_id, folder_id)
VALUES ('81000000-0000-0000-0000-000000000006', 'Search runbook',
        '81000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000005');
INSERT INTO intake.blobs (blob_key, sha256, size_bytes, mime, zone)
VALUES ('library-test/runbook-1', sha256('runbook-1'), 10, 'application/pdf', 'CLEAN');
INSERT INTO intake.document_versions (id, document_id, version_no, blob_key, sha256, mime, parse_status, created_by)
VALUES ('81000000-0000-0000-0000-000000000007', '81000000-0000-0000-0000-000000000006', 1,
        'library-test/runbook-1', sha256('runbook-1'), 'application/pdf', 'PARSED',
        '81000000-0000-0000-0000-000000000003');
UPDATE intake.documents SET current_version_id = '81000000-0000-0000-0000-000000000007'
WHERE id = '81000000-0000-0000-0000-000000000006';
INSERT INTO iam.resource_policies (resource_id, organization_id, owner_department_id, acl_id, classification_level,
    sharing_scope, department_scope_mode, customer_scope_mode, project_scope_mode, effective_policy_hash)
VALUES ('81000000-0000-0000-0000-000000000005', '81000000-0000-0000-0000-000000000001',
        '81000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000004', 1, 'DEPARTMENT',
        'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE', sha256('library-folder')),
       ('81000000-0000-0000-0000-000000000006', '81000000-0000-0000-0000-000000000001',
        '81000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000004', 1, 'DEPARTMENT',
        'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE', sha256('library-document'));
