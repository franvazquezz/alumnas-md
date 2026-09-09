-- Domain hardening: structured weekdays and periods, explicit payment states,
-- fixed-precision money, and active/inactive students.

CREATE TYPE "Weekday" AS ENUM (
  'MONDAY', 'TUESDAY', 'WEDNESDAY', 'THURSDAY', 'FRIDAY', 'SATURDAY', 'SUNDAY'
);

CREATE TYPE "PaymentStatus" AS ENUM ('PENDING', 'PAID');
CREATE TYPE "ChargeType" AS ENUM ('OVEN', 'MATERIAL');

ALTER TABLE "Student"
  ADD COLUMN "weekday" "Weekday",
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

UPDATE "Student"
SET "weekday" = CASE
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('lunes', 'lun', 'monday', 'mon') THEN 'MONDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('martes', 'mar', 'tuesday', 'tue') THEN 'TUESDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('miercoles', 'mie', 'wednesday', 'wed') THEN 'WEDNESDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('jueves', 'jue', 'thursday', 'thu') THEN 'THURSDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('viernes', 'vie', 'friday', 'fri') THEN 'FRIDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('sabado', 'sab', 'saturday', 'sat') THEN 'SATURDAY'::"Weekday"
  WHEN lower(translate(trim("day"), 'áéíóú', 'aeiou')) IN ('domingo', 'dom', 'sunday', 'sun') THEN 'SUNDAY'::"Weekday"
  ELSE NULL
END;

ALTER TABLE "Student" DROP COLUMN "day";

ALTER TABLE "Month"
  ADD COLUMN "year" INTEGER,
  ADD COLUMN "month" INTEGER;

UPDATE "Month"
SET
  "year" = COALESCE(
    (regexp_match("label", '(20[0-9]{2})'))[1]::INTEGER,
    EXTRACT(YEAR FROM "createdAt")::INTEGER
  ),
  "month" = CASE
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'enero|(^|[^0-9])0?1([^0-9]|$)' THEN 1
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'febrero|(^|[^0-9])0?2([^0-9]|$)' THEN 2
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'marzo|(^|[^0-9])0?3([^0-9]|$)' THEN 3
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'abril|(^|[^0-9])0?4([^0-9]|$)' THEN 4
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'mayo|(^|[^0-9])0?5([^0-9]|$)' THEN 5
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'junio|(^|[^0-9])0?6([^0-9]|$)' THEN 6
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'julio|(^|[^0-9])0?7([^0-9]|$)' THEN 7
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'agosto|(^|[^0-9])0?8([^0-9]|$)' THEN 8
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'septiembre|setiembre|(^|[^0-9])0?9([^0-9]|$)' THEN 9
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'octubre|(^|[^0-9])10([^0-9]|$)' THEN 10
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'noviembre|(^|[^0-9])11([^0-9]|$)' THEN 11
    WHEN lower(translate("label", 'áéíóú', 'aeiou')) ~ 'diciembre|(^|[^0-9])12([^0-9]|$)' THEN 12
    ELSE EXTRACT(MONTH FROM "createdAt")::INTEGER
  END;

ALTER TABLE "Month"
  ALTER COLUMN "year" SET NOT NULL,
  ALTER COLUMN "month" SET NOT NULL,
  DROP COLUMN "label";

CREATE UNIQUE INDEX "Month_studentId_year_month_key"
  ON "Month"("studentId", "year", "month");

ALTER TABLE "Month"
  ADD CONSTRAINT "Month_year_check" CHECK ("year" BETWEEN 2000 AND 2100),
  ADD CONSTRAINT "Month_month_check" CHECK ("month" BETWEEN 1 AND 12);

ALTER TABLE "Class"
  ADD COLUMN "classPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "ovenPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  ADD COLUMN "materialPaymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING';

UPDATE "Class"
SET
  "classPaymentStatus" = CASE WHEN "classPaid" THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END,
  "ovenPaymentStatus" = CASE WHEN "ovenPaid" THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END,
  "materialPaymentStatus" = CASE WHEN "materialPaid" THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END;

CREATE TABLE "ClassCharge" (
  "id" SERIAL NOT NULL,
  "type" "ChargeType" NOT NULL,
  "description" TEXT,
  "price" DECIMAL(12,2) NOT NULL,
  "paymentStatus" "PaymentStatus" NOT NULL DEFAULT 'PENDING',
  "needsReview" BOOLEAN NOT NULL DEFAULT false,
  "legacyDetail" TEXT,
  "classId" INTEGER NOT NULL,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "ClassCharge_pkey" PRIMARY KEY ("id")
);

-- Preserve every amount from legacy comma-separated oven charges. The old
-- scalar columns are set to zero below only after each token is copied here.
INSERT INTO "ClassCharge" (
  "type", "description", "price", "paymentStatus", "needsReview",
  "legacyDetail", "classId", "updatedAt"
)
SELECT
  'OVEN'::"ChargeType",
  COALESCE(NULLIF(trim(split_part(source."ovenName", ',', token.ordinality::INTEGER)), ''), 'Cargo de horno migrado ' || token.ordinality),
  CASE
    WHEN trim(replace(token.value, ',', '.')) ~ '^[0-9]+([.][0-9]{1,2})?$'
      THEN trim(replace(token.value, ',', '.'))::DECIMAL(12,2)
    ELSE 0::DECIMAL(12,2)
  END,
  CASE WHEN source."ovenPaid" THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END,
  cardinality(regexp_split_to_array(COALESCE(source."ovenName", ''), '\s*,\s*'))
    <> cardinality(regexp_split_to_array(source."ovenPrice", '\s*,\s*'))
    OR trim(replace(token.value, ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$',
  'Nombre original: ' || COALESCE(source."ovenName", '') || ' | Importes originales: ' || source."ovenPrice",
  source."id",
  CURRENT_TIMESTAMP
FROM "Class" AS source
CROSS JOIN LATERAL regexp_split_to_table(source."ovenPrice", '\s*,\s*') WITH ORDINALITY AS token(value, ordinality)
WHERE trim(source."ovenPrice") <> ''
  AND trim(replace(source."ovenPrice", ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$';

-- Material descriptions can be ambiguous in the legacy data. Every amount is
-- retained and rows whose description count differs are flagged for review.
INSERT INTO "ClassCharge" (
  "type", "description", "price", "paymentStatus", "needsReview",
  "legacyDetail", "classId", "updatedAt"
)
SELECT
  'MATERIAL'::"ChargeType",
  COALESCE(NULLIF(trim(split_part(source."materialName", ',', token.ordinality::INTEGER)), ''), 'Cargo de material migrado ' || token.ordinality),
  CASE
    WHEN trim(replace(token.value, ',', '.')) ~ '^[0-9]+([.][0-9]{1,2})?$'
      THEN trim(replace(token.value, ',', '.'))::DECIMAL(12,2)
    ELSE 0::DECIMAL(12,2)
  END,
  CASE WHEN source."materialPaid" THEN 'PAID'::"PaymentStatus" ELSE 'PENDING'::"PaymentStatus" END,
  cardinality(regexp_split_to_array(COALESCE(source."materialName", ''), '\s*,\s*'))
    <> cardinality(regexp_split_to_array(source."materialPrice", '\s*,\s*'))
    OR trim(replace(token.value, ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$',
  'Nombre original: ' || COALESCE(source."materialName", '') || ' | Importes originales: ' || source."materialPrice",
  source."id",
  CURRENT_TIMESTAMP
FROM "Class" AS source
CROSS JOIN LATERAL regexp_split_to_table(source."materialPrice", '\s*,\s*') WITH ORDINALITY AS token(value, ordinality)
WHERE trim(source."materialPrice") <> ''
  AND trim(replace(source."materialPrice", ',', '.')) !~ '^[0-9]+([.][0-9]{1,2})?$';

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM "Class" WHERE "classPrice" < 0) THEN
    RAISE EXCEPTION 'Phase 2 migration stopped: Class.classPrice contains negative values';
  END IF;
END $$;

ALTER TABLE "Class"
  ALTER COLUMN "classPrice" TYPE DECIMAL(12,2) USING round("classPrice", 2),
  ALTER COLUMN "ovenPrice" TYPE DECIMAL(12,2) USING (
    CASE
      WHEN trim(replace("ovenPrice", ',', '.')) ~ '^[0-9]+([.][0-9]{1,2})?$'
        THEN trim(replace("ovenPrice", ',', '.'))::DECIMAL(12,2)
      ELSE 0::DECIMAL(12,2)
    END
  ),
  ALTER COLUMN "materialPrice" TYPE DECIMAL(12,2) USING (
    CASE
      WHEN trim(replace("materialPrice", ',', '.')) ~ '^[0-9]+([.][0-9]{1,2})?$'
        THEN trim(replace("materialPrice", ',', '.'))::DECIMAL(12,2)
      ELSE 0::DECIMAL(12,2)
    END
  ),
  ALTER COLUMN "ovenPrice" SET DEFAULT 0,
  ALTER COLUMN "materialPrice" SET DEFAULT 0,
  ALTER COLUMN "materialName" DROP NOT NULL,
  DROP COLUMN "classPaid",
  DROP COLUMN "ovenPaid",
  DROP COLUMN "materialPaid";

ALTER TABLE "Class"
  ADD CONSTRAINT "Class_classPrice_check" CHECK ("classPrice" >= 0),
  ADD CONSTRAINT "Class_ovenPrice_check" CHECK ("ovenPrice" >= 0),
  ADD CONSTRAINT "Class_materialPrice_check" CHECK ("materialPrice" >= 0);

CREATE INDEX "ClassCharge_classId_type_idx" ON "ClassCharge"("classId", "type");
CREATE INDEX "ClassCharge_needsReview_idx" ON "ClassCharge"("needsReview");

ALTER TABLE "ClassCharge"
  ADD CONSTRAINT "ClassCharge_classId_fkey"
  FOREIGN KEY ("classId") REFERENCES "Class"("id") ON DELETE CASCADE ON UPDATE CASCADE;
