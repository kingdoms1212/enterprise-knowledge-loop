ALTER TABLE intake.document_versions ADD COLUMN parse_result jsonb;

ALTER TABLE intake.document_versions ADD CONSTRAINT document_parse_result_state_ck
  CHECK (parse_result IS NULL OR
         (parse_status = 'PARSED' AND jsonb_typeof(parse_result) = 'array'));
