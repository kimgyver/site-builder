-- Add default marker for global section groups
ALTER TABLE "GlobalSectionGroup"
ADD COLUMN "isDefault" BOOLEAN NOT NULL DEFAULT false;

-- Existing schema allowed only one group per location, so mark existing rows as defaults
UPDATE "GlobalSectionGroup"
SET "isDefault" = true;

-- Allow multiple groups per location
DROP INDEX IF EXISTS "GlobalSectionGroup_location_key";
CREATE INDEX "GlobalSectionGroup_location_idx" ON "GlobalSectionGroup"("location");

-- Enforce only one default group per location
CREATE UNIQUE INDEX "GlobalSectionGroup_location_default_key"
ON "GlobalSectionGroup"("location")
WHERE "isDefault" = true;

-- Allow page-specific header/footer global group overrides
ALTER TABLE "Page"
ADD COLUMN "headerGlobalGroupId" TEXT,
ADD COLUMN "footerGlobalGroupId" TEXT;

ALTER TABLE "Page"
ADD CONSTRAINT "Page_headerGlobalGroupId_fkey"
FOREIGN KEY ("headerGlobalGroupId") REFERENCES "GlobalSectionGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Page"
ADD CONSTRAINT "Page_footerGlobalGroupId_fkey"
FOREIGN KEY ("footerGlobalGroupId") REFERENCES "GlobalSectionGroup"("id")
ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "Page_headerGlobalGroupId_idx" ON "Page"("headerGlobalGroupId");
CREATE INDEX "Page_footerGlobalGroupId_idx" ON "Page"("footerGlobalGroupId");
