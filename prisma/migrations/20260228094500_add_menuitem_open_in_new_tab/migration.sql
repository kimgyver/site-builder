-- Add per-menu-item option to open links in a new tab
ALTER TABLE "MenuItem" ADD COLUMN "openInNewTab" BOOLEAN NOT NULL DEFAULT false;
