-- CreateTable
CREATE TABLE "SiteSetting" (
    "id" TEXT NOT NULL,
    "key" TEXT NOT NULL DEFAULT 'default',
    "siteName" TEXT NOT NULL DEFAULT 'Site Builder',
    "siteTagline" TEXT,
    "siteUrl" TEXT,
    "contactEmail" TEXT,
    "defaultSeoTitle" TEXT,
    "defaultSeoDescription" TEXT,
    "disableIndexing" BOOLEAN NOT NULL DEFAULT false,
    "adminBrandLabel" TEXT NOT NULL DEFAULT 'Site Builder Admin',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "SiteSetting_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "SiteSetting_key_key" ON "SiteSetting"("key");

-- Seed singleton row
INSERT INTO "SiteSetting" ("id", "key", "siteName", "adminBrandLabel", "updatedAt")
VALUES ('site_settings_default', 'default', 'Site Builder', 'Site Builder Admin', CURRENT_TIMESTAMP)
ON CONFLICT ("key") DO NOTHING;
