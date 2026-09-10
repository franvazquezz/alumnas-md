DO $$
DECLARE
  pending_matches integer;
BEGIN
  SELECT count(*)
  INTO pending_matches
  FROM "ClassCharge"
  WHERE
    type = 'MATERIAL'
    AND "needsReview" = true
    AND "legacyDetail" = 'Nombre original: Pasta 1900 kg, engobe amar, pasta1200kg ox mg | Importes originales: 4180, 1500, 500, 2760'
    AND (
      (description = 'Pasta 1900 kg' AND price = 4180.00)
      OR (description = 'engobe amar' AND price = 1500.00)
      OR (description = 'pasta1200kg ox mg' AND price = 500.00)
      OR (description = 'Cargo de material migrado 4' AND price = 2760.00)
    );

  IF pending_matches NOT IN (0, 4) THEN
    RAISE EXCEPTION
      'Expected zero or four exact legacy material charges, found %',
      pending_matches;
  END IF;
END $$;

UPDATE "ClassCharge"
SET
  description = CASE
    WHEN description = 'Pasta 1900 kg' AND price = 4180.00
      THEN 'Pasta 1.900/kg'
    WHEN description = 'engobe amar' AND price = 1500.00
      THEN 'Engobe amarillo'
    WHEN description = 'pasta1200kg ox mg' AND price = 500.00
      THEN 'Óxido Mg'
    WHEN description = 'Cargo de material migrado 4' AND price = 2760.00
      THEN 'Pasta 1.200/kg'
  END,
  "needsReview" = false,
  "updatedAt" = CURRENT_TIMESTAMP
WHERE
  type = 'MATERIAL'
  AND "needsReview" = true
  AND "legacyDetail" = 'Nombre original: Pasta 1900 kg, engobe amar, pasta1200kg ox mg | Importes originales: 4180, 1500, 500, 2760'
  AND (
    (description = 'Pasta 1900 kg' AND price = 4180.00)
    OR (description = 'engobe amar' AND price = 1500.00)
    OR (description = 'pasta1200kg ox mg' AND price = 500.00)
    OR (description = 'Cargo de material migrado 4' AND price = 2760.00)
  );
