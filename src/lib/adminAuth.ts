import type { AdminRole } from "@/types/auth";

export type { AdminRole } from "@/types/auth";

export const SESSION_COOKIE_NAME = "sb_admin_session";

function getSessionKey() {
  const password = process.env.ADMIN_PASSWORD?.trim() ?? "";
  console.log("ADMIN_SESSION_KEY:", process.env.ADMIN_SESSION_KEY);
  console.log("ADMIN_PASSWORD:", process.env.ADMIN_PASSWORD);
  return process.env.ADMIN_SESSION_KEY?.trim() || password;
}

function getEditorPassword() {
  return process.env.ADMIN_EDITOR_PASSWORD?.trim() ?? "";
}

function getPublisherPassword() {
  return (
    process.env.ADMIN_PUBLISHER_PASSWORD?.trim() ||
    process.env.ADMIN_PASSWORD?.trim() ||
    ""
  );
}

export function isAdminAuthEnabled() {
  return Boolean(getEditorPassword() || getPublisherPassword());
}

export function resolveRoleForPassword(password: string): AdminRole | null {
  const normalized = password.trim();
  if (!normalized) return null;

  const publisherPassword = getPublisherPassword();
  if (publisherPassword && normalized === publisherPassword) {
    return "publisher";
  }

  const editorPassword = getEditorPassword();
  if (editorPassword && normalized === editorPassword) {
    return "editor";
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
  if (role === "editor" || role === "publisher") return role;
  return null;
}
