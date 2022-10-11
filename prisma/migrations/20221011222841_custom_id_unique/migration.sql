/*
  Warnings:

  - A unique constraint covering the columns `[customId]` on the table `SelfRoleMessages` will be added. If there are existing duplicate values, this will fail.

*/
-- CreateIndex
CREATE UNIQUE INDEX "SelfRoleMessages_customId_key" ON "SelfRoleMessages"("customId");
