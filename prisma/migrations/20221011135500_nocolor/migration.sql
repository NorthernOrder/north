/*
  Warnings:

  - You are about to drop the column `color` on the `Role` table. All the data in the column will be lost.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "selfRole" BOOLEAN NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Role_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoleCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_Role" ("categoryId", "id", "name", "order", "selfRole") SELECT "categoryId", "id", "name", "order", "selfRole" FROM "Role";
DROP TABLE "Role";
ALTER TABLE "new_Role" RENAME TO "Role";
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
