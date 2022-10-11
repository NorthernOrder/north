/*
  Warnings:

  - Added the required column `customId` to the `SelfRoleMessages` table without a default value. This is not possible if the table is not empty.

*/
-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_SelfRoleMessages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleCategoryId" TEXT NOT NULL,
    "customId" TEXT NOT NULL,
    CONSTRAINT "SelfRoleMessages_roleCategoryId_fkey" FOREIGN KEY ("roleCategoryId") REFERENCES "RoleCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_SelfRoleMessages" ("id", "roleCategoryId") SELECT "id", "roleCategoryId" FROM "SelfRoleMessages";
DROP TABLE "SelfRoleMessages";
ALTER TABLE "new_SelfRoleMessages" RENAME TO "SelfRoleMessages";
CREATE TABLE "new_Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "description" TEXT NOT NULL DEFAULT '',
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
