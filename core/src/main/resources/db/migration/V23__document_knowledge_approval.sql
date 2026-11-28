-- Published-document references can follow the same independent approval workflow without a Case.
ALTER TABLE knowledge.approval_lines ALTER COLUMN case_id DROP NOT NULL;
