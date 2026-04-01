-- RedefineTables
PRAGMA defer_foreign_keys=ON;
PRAGMA foreign_keys=OFF;
CREATE TABLE "new_screens" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "companyId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "token" TEXT NOT NULL,
    "intervalSeconds" INTEGER NOT NULL DEFAULT 10,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "lastSeenAt" DATETIME,
    "refreshRequestedAt" DATETIME,
    "autoRefreshMinutes" INTEGER NOT NULL DEFAULT 360,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "screens_companyId_fkey" FOREIGN KEY ("companyId") REFERENCES "companies" ("id") ON DELETE RESTRICT ON UPDATE CASCADE
);
INSERT INTO "new_screens" ("companyId", "createdAt", "description", "id", "intervalSeconds", "isActive", "lastSeenAt", "name", "token") SELECT "companyId", "createdAt", "description", "id", "intervalSeconds", "isActive", "lastSeenAt", "name", "token" FROM "screens";
DROP TABLE "screens";
ALTER TABLE "new_screens" RENAME TO "screens";
CREATE UNIQUE INDEX "screens_token_key" ON "screens"("token");
PRAGMA foreign_keys=ON;
PRAGMA defer_foreign_keys=OFF;
