-- Add single-page scheduled publish timestamp
ALTER TABLE "Page"
ADD COLUMN "publishAt" TIMESTAMP(3);

-- Optimize scheduler lookup for publish-ready draft pages
CREATE INDEX "Page_status_publishAt_idx" ON "Page"("status", "publishAt");
