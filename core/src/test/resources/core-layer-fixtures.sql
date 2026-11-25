-- Extends document-library.sql in the same test transaction.
INSERT INTO iam.employments (id, person_id, organization_id, employee_no, clearance_level)
VALUES ('81000000-0000-0000-0000-000000000008', '81000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000001', '00042', 2);
INSERT INTO iam.assignments (id, employment_id, organization_id, department_id, assignment_type)
VALUES ('81000000-0000-0000-0000-000000000009', '81000000-0000-0000-0000-000000000008', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 'PRIMARY'),
       ('81000000-0000-0000-0000-000000000010', '81000000-0000-0000-0000-000000000008', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 'CONCURRENT');
INSERT INTO iam.groups (id, organization_id, name, group_type)
VALUES ('81000000-0000-0000-0000-000000000011', '81000000-0000-0000-0000-000000000001', 'Runbook readers', 'TEAM'),
       ('81000000-0000-0000-0000-000000000012', '81000000-0000-0000-0000-000000000001', 'Ended membership', 'TEAM');
INSERT INTO iam.group_memberships (assignment_id, organization_id, group_id, valid_from, valid_to)
VALUES ('81000000-0000-0000-0000-000000000009', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000011', now() - interval '2 days', null),
       ('81000000-0000-0000-0000-000000000009', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000012', now() - interval '2 days', now() - interval '1 day');

INSERT INTO iam.secured_resources (id, organization_id, resource_type)
VALUES ('81000000-0000-0000-0000-000000000013', '81000000-0000-0000-0000-000000000001', 'VOICE'), ('81000000-0000-0000-0000-000000000014', '81000000-0000-0000-0000-000000000001', 'CASE'), ('81000000-0000-0000-0000-000000000016', '81000000-0000-0000-0000-000000000001', 'KNOWLEDGE_VERSION');
INSERT INTO intake.blobs (blob_key, sha256, size_bytes, mime, zone)
VALUES ('library-test/voc-1', sha256('library-voc-1'), 10, 'text/plain', 'RAW_SENSITIVE');
INSERT INTO intake.voices (id, organization_id, received_department_id, title, triage_status, kind, channel,
    dedup_key, raw_blob_key, received_at, created_by)
VALUES ('81000000-0000-0000-0000-000000000013', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', 'Search delay', 'RECEIVED', 'EXTERNAL_VOC', 'MANUAL',
        sha256('library-voc-dedup'), 'library-test/voc-1', now(), '81000000-0000-0000-0000-000000000003');
INSERT INTO casework.cases (id, organization_id, title, handler_id, department_id)
VALUES ('81000000-0000-0000-0000-000000000014', '81000000-0000-0000-0000-000000000001', 'Search delay case', '81000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000002');
INSERT INTO knowledge.knowledge (id, organization_id, title, owner_id)
VALUES ('81000000-0000-0000-0000-000000000015', '81000000-0000-0000-0000-000000000001', 'Search delay solution', '81000000-0000-0000-0000-000000000003');
INSERT INTO knowledge.knowledge_versions (id, knowledge_id, version_no, kind, body, content_hash, created_by)
VALUES ('81000000-0000-0000-0000-000000000016', '81000000-0000-0000-0000-000000000015', 1, 'SOLUTION', 'Draft solution', sha256('draft solution'), '81000000-0000-0000-0000-000000000003');
INSERT INTO distribution.distributions (id, version_id, created_by, trigger, idempotency_key)
VALUES ('81000000-0000-0000-0000-000000000017', '81000000-0000-0000-0000-000000000016', '81000000-0000-0000-0000-000000000003', 'AUTO_ON_READY', 'library-dist-1');
INSERT INTO iam.resource_policies (resource_id, organization_id, owner_department_id, acl_id, classification_level,
    sharing_scope, department_scope_mode, customer_scope_mode, project_scope_mode, effective_policy_hash)
SELECT resource_id, '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000002', '81000000-0000-0000-0000-000000000004', 1, 'DEPARTMENT',
       'NOT_APPLICABLE', 'NOT_APPLICABLE', 'NOT_APPLICABLE', sha256(convert_to(resource_id::text, 'UTF8'))
FROM unnest(ARRAY['81000000-0000-0000-0000-000000000013', '81000000-0000-0000-0000-000000000014', '81000000-0000-0000-0000-000000000016']::uuid[]) AS source(resource_id);

INSERT INTO ops.outbox (event_id, aggregate_type, aggregate_id, aggregate_revision, event_type, payload)
VALUES ('81000000-0000-0000-0000-000000000018', 'DOCUMENT', '81000000-0000-0000-0000-000000000006', 1, 'IndexRequested', '{}');
INSERT INTO ops.idempotency_keys (actor_id, operation, idem_key, request_hash, state, response_status, expires_at)
VALUES ('81000000-0000-0000-0000-000000000003', 'POST /documents', 'library-test-key', sha256('library-request'), 'COMPLETED', 202, now() + interval '1 hour');
INSERT INTO audit.audit_events (id, occurred_at, organization_id, actor_id, action, decision)
VALUES ('81000000-0000-0000-0000-000000000019', '2026-01-04T10:00:00Z', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000003', 'READ', 'ALLOW');

INSERT INTO ops.model_versions (id, role, name, local_path, checksum, runtime, embedding_dim)
VALUES ('81000000-0000-0000-0000-000000000020', 'EMBEDDING', 'library-test-embed', '/models/test-embed', 'library-embed', 'test', 3),
       ('81000000-0000-0000-0000-000000000021', 'GENERATION', 'library-test-generate', '/models/test-generate', 'library-generate', 'test', null);
INSERT INTO ops.prompt_versions (id, prompt_key, version, template_sha256, created_by)
VALUES ('81000000-0000-0000-0000-000000000022', 'rag.library.test', 1, sha256('library prompt'), '81000000-0000-0000-0000-000000000003');
INSERT INTO ops.pipeline_versions (id, code, parser_config, chunk_config, embedding_model_id, generation_model_id,
    prompt_id, index_namespace, config_hash, prompt_version_id)
VALUES ('81000000-0000-0000-0000-000000000023', 'LIBRARY-TEST', '{}', '{}', '81000000-0000-0000-0000-000000000020', '81000000-0000-0000-0000-000000000021', 'rag.library.test',
        'library-test', sha256('library pipeline'), '81000000-0000-0000-0000-000000000022');
INSERT INTO eval.eval_sets (id, task, split, version, fixtures_hash)
VALUES ('81000000-0000-0000-0000-000000000024', 'ACL_LEAK', 'HOLDOUT', 1, sha256('library eval fixtures'));
INSERT INTO eval.eval_runs (id, eval_set_id, pipeline_version_id, environment_json, acl_leak_count,
    security_passed, verdict, gate_criteria, mlflow_run_id, started_by, finished_at)
VALUES ('81000000-0000-0000-0000-000000000025', '81000000-0000-0000-0000-000000000024', '81000000-0000-0000-0000-000000000023', '{}', 0, true, 'PASS', '{"acl_leak_max":0}',
        'library-mlflow', '81000000-0000-0000-0000-000000000003', now());
INSERT INTO ops.pipeline_activations (id, organization_id, pipeline_version_id, kind, gate_eval_run_id, actor_account_id)
VALUES ('81000000-0000-0000-0000-000000000026', '81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000023', 'ACTIVATE', '81000000-0000-0000-0000-000000000025', '81000000-0000-0000-0000-000000000003');
INSERT INTO ops.active_pipeline (organization_id, pipeline_version_id, switched_by, activation_id)
VALUES ('81000000-0000-0000-0000-000000000001', '81000000-0000-0000-0000-000000000023', '81000000-0000-0000-0000-000000000003', '81000000-0000-0000-0000-000000000026');
INSERT INTO ops.pipeline_runs (id, pipeline_version_id, source_kind, source_id, idempotency_key)
VALUES ('81000000-0000-0000-0000-000000000027', '81000000-0000-0000-0000-000000000023', 'DOCUMENT_VERSION', '81000000-0000-0000-0000-000000000007', 'library-pipeline-run');
INSERT INTO knowledge.index_revisions (id, document_id, document_version_id, pipeline_version_id, policy_revision,
    effective_policy_hash, security_metadata, source_kind, vector_state, keyword_state)
VALUES ('81000000-0000-0000-0000-000000000028', '81000000-0000-0000-0000-000000000006', '81000000-0000-0000-0000-000000000007', '81000000-0000-0000-0000-000000000023', 1, sha256('library-document'), '{}',
        'DOCUMENT_VERSION', 'READY', 'READY');
INSERT INTO knowledge.chunks (id, index_revision_id, ordinal, text, text_hash, source_locator, pipeline_run_id,
    acl_id, policy_epoch, search_tokens)
VALUES ('81000000-0000-0000-0000-000000000029', '81000000-0000-0000-0000-000000000028', 0, 'Check search runbook', sha256('library chunk'), '{"page":3}',
        '81000000-0000-0000-0000-000000000027', '81000000-0000-0000-0000-000000000004', 1, 'search runbook');
