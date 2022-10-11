-- CreateTable
CREATE TABLE "RoleCategory" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL
);

-- CreateTable
CREATE TABLE "Role" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "order" INTEGER NOT NULL,
    "color" TEXT,
    "selfRole" BOOLEAN NOT NULL,
    "categoryId" TEXT NOT NULL,
    CONSTRAINT "Role_categoryId_fkey" FOREIGN KEY ("categoryId") REFERENCES "RoleCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "SelfRoleMessages" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "roleCategoryId" TEXT NOT NULL,
    CONSTRAINT "SelfRoleMessages_roleCategoryId_fkey" FOREIGN KEY ("roleCategoryId") REFERENCES "RoleCategory" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateIndex
CREATE UNIQUE INDEX "RoleCategory_name_key" ON "RoleCategory"("name");

-- CreateIndex
CREATE UNIQUE INDEX "Role_name_key" ON "Role"("name");
