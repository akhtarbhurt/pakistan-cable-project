/*
  Warnings:

  - You are about to drop the column `subteam` on the `TeamManagement` table. All the data in the column will be lost.

*/
-- AlterTable
ALTER TABLE "TeamManagement" DROP COLUMN "subteam",
ADD COLUMN     "parentTeamId" UUID;

-- AddForeignKey
ALTER TABLE "TeamManagement" ADD CONSTRAINT "TeamManagement_parentTeamId_fkey" FOREIGN KEY ("parentTeamId") REFERENCES "TeamManagement"("id") ON DELETE SET NULL ON UPDATE CASCADE;
