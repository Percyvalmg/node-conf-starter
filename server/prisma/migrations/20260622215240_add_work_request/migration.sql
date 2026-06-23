-- CreateTable
CREATE TABLE "WorkRequest" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "title" TEXT NOT NULL,
    "description" TEXT NOT NULL,
    "urgencyLevel" TEXT NOT NULL,
    "durationWeeks" INTEGER NOT NULL,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- CreateTable
CREATE TABLE "WorkRequestSkill" (
    "workRequestId" TEXT NOT NULL,
    "skillId" TEXT NOT NULL,

    PRIMARY KEY ("workRequestId", "skillId"),
    CONSTRAINT "WorkRequestSkill_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "WorkRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkRequestSkill_skillId_fkey" FOREIGN KEY ("skillId") REFERENCES "Skill" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);

-- CreateTable
CREATE TABLE "WorkRequestRole" (
    "workRequestId" TEXT NOT NULL,
    "roleTypeId" TEXT NOT NULL,

    PRIMARY KEY ("workRequestId", "roleTypeId"),
    CONSTRAINT "WorkRequestRole_workRequestId_fkey" FOREIGN KEY ("workRequestId") REFERENCES "WorkRequest" ("id") ON DELETE RESTRICT ON UPDATE CASCADE,
    CONSTRAINT "WorkRequestRole_roleTypeId_fkey" FOREIGN KEY ("roleTypeId") REFERENCES "RoleType" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
