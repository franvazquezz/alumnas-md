CREATE TYPE "AuditAction" AS ENUM ('CREATE', 'UPDATE', 'DELETE', 'ASSIGN', 'UNASSIGN', 'SWITCH');

ALTER TABLE "User"
  ADD COLUMN "isPlatformAdmin" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN "activeStudioId" INTEGER;

ALTER TABLE "Studio"
  ADD COLUMN "description" TEXT,
  ADD COLUMN "address" TEXT,
  ADD COLUMN "telephone" TEXT,
  ADD COLUMN "isActive" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "StudioShift" (
  "id" SERIAL NOT NULL,
  "studioId" INTEGER NOT NULL,
  "startTime" VARCHAR(5) NOT NULL,
  "label" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "sortOrder" INTEGER NOT NULL DEFAULT 0,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "StudioShift_pkey" PRIMARY KEY ("id")
);

INSERT INTO "StudioShift" ("studioId", "startTime", "sortOrder", "updatedAt")
SELECT "id", '10:00', 0, CURRENT_TIMESTAMP FROM "Studio";
INSERT INTO "StudioShift" ("studioId", "startTime", "sortOrder", "updatedAt")
SELECT "id", '16:00', 1, CURRENT_TIMESTAMP FROM "Studio";
INSERT INTO "StudioShift" ("studioId", "startTime", "sortOrder", "updatedAt")
SELECT "id", '18:30', 2, CURRENT_TIMESTAMP FROM "Studio";

ALTER TABLE "Student" ADD COLUMN "shiftId" INTEGER;

UPDATE "Student" AS student
SET "shiftId" = shift."id"
FROM "StudioShift" AS shift
WHERE shift."studioId" = student."studioId"
  AND shift."startTime" = student."timetable"::text;

ALTER TABLE "Student" DROP COLUMN "timetable";
DROP TYPE "Timetable";

DROP INDEX "Student_userId_key";
CREATE UNIQUE INDEX "Student_studioId_userId_key" ON "Student"("studioId", "userId");

CREATE TABLE "AuditLog" (
  "id" TEXT NOT NULL,
  "studioId" INTEGER NOT NULL,
  "actorId" TEXT,
  "action" "AuditAction" NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT,
  "metadata" JSONB,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "AuditLog_pkey" PRIMARY KEY ("id")
);

UPDATE "User" AS app_user
SET "activeStudioId" = membership."studioId"
FROM (
  SELECT DISTINCT ON ("userId") "userId", "studioId"
  FROM "Membership"
  ORDER BY "userId", "createdAt" ASC
) AS membership
WHERE membership."userId" = app_user."id";

UPDATE "User"
SET "isPlatformAdmin" = true
WHERE "id" IN (
  SELECT "userId" FROM "Membership" WHERE "role" = 'OWNER'
);

CREATE UNIQUE INDEX "StudioShift_studioId_startTime_key" ON "StudioShift"("studioId", "startTime");
CREATE INDEX "StudioShift_studioId_isActive_sortOrder_idx" ON "StudioShift"("studioId", "isActive", "sortOrder");
CREATE INDEX "Student_shiftId_idx" ON "Student"("shiftId");
CREATE INDEX "AuditLog_studioId_createdAt_idx" ON "AuditLog"("studioId", "createdAt");
CREATE INDEX "AuditLog_actorId_createdAt_idx" ON "AuditLog"("actorId", "createdAt");

ALTER TABLE "User" ADD CONSTRAINT "User_activeStudioId_fkey" FOREIGN KEY ("activeStudioId") REFERENCES "Studio"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StudioShift" ADD CONSTRAINT "StudioShift_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Student" ADD CONSTRAINT "Student_shiftId_fkey" FOREIGN KEY ("shiftId") REFERENCES "StudioShift"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_studioId_fkey" FOREIGN KEY ("studioId") REFERENCES "Studio"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "AuditLog" ADD CONSTRAINT "AuditLog_actorId_fkey" FOREIGN KEY ("actorId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
