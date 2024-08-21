/*
  Warnings:

  - You are about to drop the column `parentTeamId` on the `TeamManagement` table. All the data in the column will be lost.

*/
-- DropForeignKey
ALTER TABLE "TeamManagement" DROP CONSTRAINT "TeamManagement_parentTeamId_fkey";

-- AlterTable
ALTER TABLE "TeamManagement" DROP COLUMN "parentTeamId";

-- CreateTable
CREATE TABLE "_UserTeam" (
    "A" UUID NOT NULL,
    "B" UUID NOT NULL
);

-- CreateIndex
CREATE UNIQUE INDEX "_UserTeam_AB_unique" ON "_UserTeam"("A", "B");

-- CreateIndex
CREATE INDEX "_UserTeam_B_index" ON "_UserTeam"("B");

-- AddForeignKey
ALTER TABLE "_UserTeam" ADD CONSTRAINT "_UserTeam_A_fkey" FOREIGN KEY ("A") REFERENCES "TeamManagement"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "_UserTeam" ADD CONSTRAINT "_UserTeam_B_fkey" FOREIGN KEY ("B") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
