/*
  Warnings:

  - Made the column `reportingLines` on table `TeamManagement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `status` on table `TeamManagement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `teamLeader` on table `TeamManagement` required. This step will fail if there are existing NULL values in that column.
  - Made the column `visualRepresentation` on table `TeamManagement` required. This step will fail if there are existing NULL values in that column.

*/
-- AlterTable
ALTER TABLE "TeamManagement" ALTER COLUMN "reportingLines" SET NOT NULL,
ALTER COLUMN "status" SET NOT NULL,
ALTER COLUMN "teamLeader" SET NOT NULL,
ALTER COLUMN "visualRepresentation" SET NOT NULL;
