-- Phase 0: align the Student primary-key sequence with the data already stored.
--
-- This statement is safe to run more than once. The table lock prevents a
-- concurrent Student insert from racing with MAX(id) while the sequence is
-- being repaired.

BEGIN;

LOCK TABLE "Student" IN ACCESS EXCLUSIVE MODE;

SELECT setval(
  pg_get_serial_sequence('"Student"', 'id'),
  GREATEST(COALESCE((SELECT MAX(id) FROM "Student"), 0), 1),
  EXISTS(SELECT 1 FROM "Student")
);

COMMIT;

