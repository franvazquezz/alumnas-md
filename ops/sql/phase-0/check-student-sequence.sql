-- Read-only preflight/postflight check for Student_id_seq.

WITH student_state AS (
  SELECT COALESCE(MAX(id), 0) AS max_id
  FROM "Student"
),
sequence_state AS (
  SELECT last_value, is_called
  FROM "Student_id_seq"
)
SELECT
  student_state.max_id,
  sequence_state.last_value,
  sequence_state.is_called,
  sequence_state.last_value
    + CASE WHEN sequence_state.is_called THEN 1 ELSE 0 END AS next_candidate,
  CASE
    WHEN student_state.max_id = 0
      THEN sequence_state.last_value = 1 AND NOT sequence_state.is_called
    ELSE sequence_state.last_value >= student_state.max_id
  END AS sequence_is_safe
FROM student_state
CROSS JOIN sequence_state;

