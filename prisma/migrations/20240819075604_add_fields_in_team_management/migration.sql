/*
  Warnings:

  - Added the required column `reportingLines` to the `TeamManagement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `status` to the `TeamManagement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `teamLeader` to the `TeamManagement` table without a default value. This is not possible if the table is not empty.
  - Added the required column `visualRepresentation` to the `TeamManagement` table without a default value. This is not possible if the table is not empty.

*/
-- AlterTable
ALTER TABLE "TeamManagement" ADD COLUMN "reportingLines" TEXT;
ALTER TABLE "TeamManagement" ADD COLUMN "status" TEXT;
ALTER TABLE "TeamManagement" ADD COLUMN "teamLeader" TEXT;
ALTER TABLE "TeamManagement" ADD COLUMN "visualRepresentation" TEXT;

ALTER TABLE "TeamManagement" ADD COLUMN "teamPerformance" JSONB[];
ALTER TABLE "TeamManagement" ADD COLUMN "teamActivityLogs" JSONB[];



-- CreateIndex
CREATE INDEX "TeamManagement_id_idx" ON "TeamManagement"("id");
