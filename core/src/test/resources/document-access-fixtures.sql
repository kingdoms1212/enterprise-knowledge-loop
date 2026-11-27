-- A document visible only to the signed-in user's primary assignment.
INSERT INTO iam.roles (id, code) VALUES ('82000000-0000-0000-0000-000000000051', 'DOCUMENT_VIEWER_TEST');
INSERT INTO iam.role_permissions (role_id, permission_code) VALUES ('82000000-0000-0000-0000-000000000051', 'READ');
INSERT INTO iam.role_bindings (assignment_id, role_id) VALUES ('82000000-0000-0000-0000-000000000041', '82000000-0000-0000-0000-000000000051');
INSERT INTO iam.principals (id, organization_id, kind, department_id)
VALUES ('82000000-0000-0000-0000-000000000052', '82000000-0000-0000-0000-000000000001', 'DEPARTMENT', '82000000-0000-0000-0000-000000000002');
INSERT INTO iam.acls (id, organization_id, canonical_hash, canonical_json, policy_version, created_by)
VALUES ('82000000-0000-0000-0000-000000000053', '82000000-0000-0000-0000-000000000001', sha256('http document test'), '{}', 1, '82000000-0000-0000-0000-000000000021');
INSERT INTO iam.aces (acl_id, principal_id, action, effect, valid_from, created_by)
VALUES ('82000000-0000-0000-0000-000000000053', '82000000-0000-0000-0000-000000000052', 'READ', 'ALLOW', now(), '82000000-0000-0000-0000-000000000021');
INSERT INTO iam.secured_resources (id, organization_id, resource_type)
VALUES ('82000000-0000-0000-0000-000000000054', '82000000-0000-0000-0000-000000000001', 'DOCUMENT'), ('82000000-0000-0000-0000-000000000057', '82000000-0000-0000-0000-000000000001', 'DOCUMENT');
INSERT INTO intake.documents (id, title, owner_department_id)
VALUES ('82000000-0000-0000-0000-000000000054', 'ACL-filtered operating manual', '82000000-0000-0000-0000-000000000002'),
       ('82000000-0000-0000-0000-000000000057', 'Source requires greater clearance', '82000000-0000-0000-0000-000000000002');
INSERT INTO intake.blobs (blob_key, sha256, size_bytes, mime, zone)
VALUES ('acl-test/manual-v1', sha256('acl test v1'), 10, 'application/pdf', 'CLEAN'),
       ('acl-test/manual-v2', sha256('acl test v2'), 11, 'application/pdf', 'CLEAN');
INSERT INTO intake.document_versions (id, document_id, version_no, blob_key, sha256, mime, parse_status, created_by)
VALUES ('82000000-0000-0000-0000-000000000055', '82000000-0000-0000-0000-000000000054', 1, 'acl-test/manual-v1', sha256('acl test v1'), 'application/pdf', 'PARSED', '82000000-0000-0000-0000-000000000021'),
       ('82000000-0000-0000-0000-000000000056', '82000000-0000-0000-0000-000000000054', 2, 'acl-test/manual-v2', sha256('acl test v2'), 'application/pdf', 'PENDING', '82000000-0000-0000-0000-000000000021');
UPDATE intake.documents SET current_version_id = '82000000-0000-0000-0000-000000000056' WHERE id = '82000000-0000-0000-0000-000000000054';
INSERT INTO iam.resource_policies (resource_id, organization_id, owner_department_id, acl_id, classification_level,
    sharing_scope, department_scope_mode, customer_scope_mode, project_scope_mode, effective_policy_hash,
    acl_origin, inherit_acl, override_reason)
VALUES ('82000000-0000-0000-0000-000000000054', '82000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000053', 1, 'DEPARTMENT', 'NOT_APPLICABLE', 'NOT_APPLICABLE',
        'NOT_APPLICABLE', sha256('http document policy'), 'OVERRIDE', false, 'HTTP test policy'),
       ('82000000-0000-0000-0000-000000000057', '82000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002', '82000000-0000-0000-0000-000000000053', 3, 'DEPARTMENT', 'NOT_APPLICABLE', 'NOT_APPLICABLE',
        'NOT_APPLICABLE', sha256('http source policy'), 'OVERRIDE', false, 'HTTP test policy');

INSERT INTO iam.role_permissions (role_id, permission_code)
SELECT '82000000-0000-0000-0000-000000000051', p.action
FROM (VALUES ('SEARCH'), ('WRITE'), ('DOCUMENT_MANAGE'), ('DOCUMENT_UPLOAD'), ('VOICE_INTAKE_CREATE'),
    ('VOICE_TRIAGE'), ('DECIDE'), ('RETIRE'), ('ACKNOWLEDGE'), ('CREATE'), ('DISTRIBUTE')) p(action);

INSERT INTO iam.policy_change_requests (id, organization_id, target_resource_id, change_type, is_expansion,
    expected_revision, change_hash, payload, reason, requested_by, state, applied_at)
VALUES ('82000000-0000-0000-0000-000000000059', '82000000-0000-0000-0000-000000000001',
    '82000000-0000-0000-0000-000000000054', 'POLICY_TEMPLATE', false, 1, sha256('test-template-change'),
    '{}', 'Write workflow test', '82000000-0000-0000-0000-000000000021', 'APPLIED', now());

INSERT INTO iam.policy_templates (id, organization_id, department_id, resource_type, classification_level, sharing_scope,
    department_scope_mode, customer_scope_mode, project_scope_mode, inherit_acl, status, policy_change_id,
    created_by, activated_at)
SELECT t.id::uuid, '82000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000002',
    t.kind, t.level, 'DEPARTMENT', 'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE', true, 'ACTIVE',
    '82000000-0000-0000-0000-000000000059', '82000000-0000-0000-0000-000000000021', now()
FROM (VALUES ('82000000-0000-0000-0000-000000000061', 'FOLDER', 2),
    ('82000000-0000-0000-0000-000000000062', 'VOICE', 3),
    ('82000000-0000-0000-0000-000000000063', 'CASE', 3),
    ('82000000-0000-0000-0000-000000000064', 'KNOWLEDGE_VERSION', 2)) t(id, kind, level);

INSERT INTO iam.policy_template_entries (template_id, subject_kind, action, effect)
SELECT t.id, 'OWNER_DEPARTMENT', a.action, 'ALLOW'
FROM iam.policy_templates t CROSS JOIN (VALUES ('READ'), ('SEARCH'), ('WRITE'), ('DECIDE'), ('DOCUMENT_MANAGE')) a(action)
WHERE t.policy_change_id = '82000000-0000-0000-0000-000000000059'
  AND (a.action <> 'SEARCH' OR t.resource_type = 'FOLDER')
  AND (a.action <> 'DOCUMENT_MANAGE' OR t.resource_type = 'FOLDER');

INSERT INTO iam.policy_template_entries (template_id, subject_kind, action, effect)
SELECT '82000000-0000-0000-0000-000000000064', 'OWNER_DEPARTMENT', a.action, 'ALLOW'
FROM (VALUES ('RETIRE'), ('DISTRIBUTE'), ('ACKNOWLEDGE')) a(action);

INSERT INTO ops.model_versions (id, role, name, local_path, checksum, runtime, embedding_dim)
VALUES ('82000000-0000-0000-0000-000000000065','EMBEDDING','Command test embeddings','/test/embed','test-a','pytorch',4),
       ('82000000-0000-0000-0000-000000000066','GENERATION','Command test generation','/test/gen','test-b','ollama',null);
INSERT INTO ops.pipeline_versions (id, code, parser_config, chunk_config, embedding_model_id, generation_model_id,
    prompt_id, index_namespace, config_hash)
VALUES ('82000000-0000-0000-0000-000000000067','command-test','{}','{}',
    '82000000-0000-0000-0000-000000000065','82000000-0000-0000-0000-000000000066',
    'command-test','command-test',sha256('command test'));

-- Synthetic evaluation and activation for the isolated Core integration-test database.
INSERT INTO eval.eval_sets(id, task, split, version, fixtures_hash) VALUES
    ('82000000-0000-0000-0000-000000000068', 'ACL_LEAK', 'HOLDOUT', 82, sha256('document-fts-test'));
INSERT INTO eval.eval_runs(id, eval_set_id, pipeline_version_id, environment_json, acl_leak_count, security_passed,
    verdict, gate_criteria, started_by, finished_at) VALUES
    ('82000000-0000-0000-0000-000000000069', '82000000-0000-0000-0000-000000000068',
     '82000000-0000-0000-0000-000000000067', '{}', 0, true, 'PASS', '{"acl_leak_max":0}',
     '82000000-0000-0000-0000-000000000021', now());
INSERT INTO ops.pipeline_activations(id, organization_id, pipeline_version_id, kind, gate_eval_run_id, actor_account_id)
VALUES ('82000000-0000-0000-0000-000000000070', '82000000-0000-0000-0000-000000000001',
        '82000000-0000-0000-0000-000000000067', 'ACTIVATE', '82000000-0000-0000-0000-000000000069',
        '82000000-0000-0000-0000-000000000021');
INSERT INTO ops.active_pipeline(organization_id, pipeline_version_id, switched_by, activation_id)
VALUES ('82000000-0000-0000-0000-000000000001', '82000000-0000-0000-0000-000000000067',
        '82000000-0000-0000-0000-000000000021', '82000000-0000-0000-0000-000000000070');
