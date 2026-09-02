-- CreateSchema
CREATE SCHEMA IF NOT EXISTS "public";

-- CreateEnum
CREATE TYPE "Timetable" AS ENUM ('10:00', '16:00', '18:30');

-- CreateTable
CREATE TABLE "Student" (
    "id" SERIAL NOT NULL,
    "name" TEXT NOT NULL,
    "birthday" DATE,
    "telephone" TEXT,
    "day" TEXT,
    "timetable" "Timetable",
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Student_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Month" (
    "id" SERIAL NOT NULL,
    "label" TEXT NOT NULL,
    "studentId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Month_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "Class" (
    "id" SERIAL NOT NULL,
    "className" TEXT NOT NULL,
    "assistance" BOOLEAN NOT NULL DEFAULT false,
    "classDay" DATE,
    "classPrice" DECIMAL(65,30) NOT NULL,
    "classPaid" BOOLEAN NOT NULL DEFAULT false,
    "ovenName" TEXT,
    "ovenPrice" TEXT NOT NULL,
    "ovenPaid" BOOLEAN NOT NULL DEFAULT false,
    "materialName" TEXT NOT NULL,
    "materialPrice" TEXT NOT NULL,
    "materialPaid" BOOLEAN NOT NULL DEFAULT false,
    "monthId" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "Class_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "Month_studentId_label_key" ON "Month"("studentId", "label");

-- AddForeignKey
ALTER TABLE "Month" ADD CONSTRAINT "Month_studentId_fkey" FOREIGN KEY ("studentId") REFERENCES "Student"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Class" ADD CONSTRAINT "Class_monthId_fkey" FOREIGN KEY ("monthId") REFERENCES "Month"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
