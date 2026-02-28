import type { AdminRole } from "@/types/auth";

export type { AdminRole } from "@/types/auth";

export const SESSION_COOKIE_NAME = "sb_admin_session";

function getSessionKey() {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  return process.env.ADMIN_SESSION_KEY?.trim() || password;
}

function getEditorPassword() {
  return process.env.ADMIN_EDITOR_PASSWORD?.trim() ?? "";
}

function getReviewerPassword() {
  return process.env.ADMIN_REVIEWER_PASSWORD?.trim() ?? "";
}

function getAdminPassword() {
  return process.env.ADMIN_ADMIN_PASSWORD?.trim() ?? "";
}

function getPublisherPassword() {
  return (
    process.env.ADMIN_PUBLISHER_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

export function isAdminAuthEnabled() {
  return Boolean(
    getAdminPassword() ||
    getPublisherPassword() ||
    getEditorPassword() ||
    getReviewerPassword()
  );
}

export function resolveRoleForPassword(password: string): AdminRole | null {
  const normalized = password.trim();
  if (!normalized) return null;

  const adminPassword = getAdminPassword();
  if (adminPassword && normalized === adminPassword) {
    return "admin";
  }

  const publisherPassword = getPublisherPassword();
  if (publisherPassword && normalized === publisherPassword) {
    return "publisher";
  }

  const editorPassword = getEditorPassword();
  if (editorPassword && normalized === editorPassword) {
    return "editor";
  }

  const reviewerPassword = getReviewerPassword();
  if (reviewerPassword && normalized === reviewerPassword) {
    return "reviewer";
  }

  return null;
}

export function buildSessionCookieValue(role: AdminRole): string {
  const key = getSessionKey();
  if (!key) return "";
  return `${role}:${key}`;
}

export function getRoleFromSessionCookie(
  rawCookieValue: string | undefined
): AdminRole | null {
  if (!rawCookieValue) return null;

  const [role, key] = rawCookieValue.split(":", 2);
  const expectedKey = getSessionKey();

  if (!expectedKey || key !== expectedKey) return null;
  if (
    role === "admin" ||
    role === "publisher" ||
    role === "editor" ||
    role === "reviewer"
  ) {
    return role;
  }
  return null;
}

export function canEditContent(role: AdminRole) {
  return role === "admin" || role === "publisher" || role === "editor";
}

export function canPublishContent(role: AdminRole) {
  return role === "admin" || role === "publisher";
}

export function canDeleteContent(role: AdminRole) {
  return role === "admin" || role === "publisher";
}
