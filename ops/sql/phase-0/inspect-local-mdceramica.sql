-- Read-only inventory for the existing mdceramica database on localhost:5432.
-- This version does not assume numeric primary keys or the presence of sequences.

SELECT
  current_database() AS database,
  current_user AS database_user,
  current_setting('server_version') AS postgres_version,
  inet_server_addr() AS server_address,
  inet_server_port() AS server_port;

SELECT table_name
FROM information_schema.tables
WHERE table_schema = 'public'
  AND table_type = 'BASE TABLE'
ORDER BY table_name;

SELECT
  table_name,
  ordinal_position,
  column_name,
  data_type,
  udt_name,
  is_nullable,
  column_default
FROM information_schema.columns
WHERE table_schema = 'public'
ORDER BY table_name, ordinal_position;

SELECT
  schemaname,
  sequencename,
  data_type,
  start_value,
  increment_by,
  last_value
FROM pg_sequences
WHERE schemaname = 'public'
ORDER BY sequencename;

SELECT
  relname AS table_name,
  n_live_tup AS estimated_live_rows,
  n_dead_tup AS estimated_dead_rows,
  last_analyze,
  last_autoanalyze
FROM pg_stat_user_tables
WHERE schemaname = 'public'
ORDER BY relname;
