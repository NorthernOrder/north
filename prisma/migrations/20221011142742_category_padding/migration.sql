-- RedefineTables
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_RoleCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "padding" INTEGER NOT NULL DEFAULT 0,
    "order" INTEGER NOT NULL
);
INSERT INTO "new_RoleCategory" ("id", "name", "order") SELECT "id", "name", "order" FROM "RoleCategory";
DROP TABLE "RoleCategory";
ALTER TABLE "new_RoleCategory" RENAME TO "RoleCategory";
CREATE UNIQUE INDEX "RoleCategory_name_key" ON "RoleCategory"("name");
PRAGMA foreign_key_check;
PRAGMA foreign_keys=ON;
