#!/bin/sh
set -eu

: "${EKL_DB_OWNER_PASSWORD:?Set EKL_DB_OWNER_PASSWORD}"
: "${EKL_DB_APP_PASSWORD:?Set EKL_DB_APP_PASSWORD}"

psql --username "$POSTGRES_USER" --dbname "$POSTGRES_DB" -v ON_ERROR_STOP=1 <<'SQL'
\getenv owner_password EKL_DB_OWNER_PASSWORD
\getenv app_password EKL_DB_APP_PASSWORD
\getenv database_name POSTGRES_DB

CREATE ROLE ekl_owner LOGIN PASSWORD :'owner_password';
CREATE ROLE ekl_app LOGIN PASSWORD :'app_password';
CREATE ROLE ekl_audit_reader NOLOGIN;

GRANT CREATE ON DATABASE :"database_name" TO ekl_owner;
GRANT USAGE, CREATE ON SCHEMA public TO ekl_owner;
CREATE EXTENSION IF NOT EXISTS vector WITH SCHEMA public;
SQL
