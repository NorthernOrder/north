-- CreateTable
CREATE TABLE "ReactionRole" (
    "id" SERIAL NOT NULL,
    "messageId" TEXT NOT NULL,
    "emoji" TEXT NOT NULL,
    "roleId" TEXT NOT NULL,

    CONSTRAINT "ReactionRole_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "ReactionRole_roleId_key" ON "ReactionRole"("roleId");
