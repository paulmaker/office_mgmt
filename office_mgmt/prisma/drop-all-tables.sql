-- DESTRUCTIVE: Drops all tables and data in the public schema.
-- Use only when you want to start completely fresh (e.g. new empty DB for migrate deploy + seed).
--
-- Run against the target database, e.g.:
--   psql "%DATABASE_URL%" -f prisma/drop-all-tables.sql
-- Or execute in your DB client (TablePlus, pgAdmin, etc.)

DROP SCHEMA public CASCADE;
CREATE SCHEMA public;
GRANT ALL ON SCHEMA public TO public;
