import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import {
  SESSION_COOKIE_NAME,
  buildSessionCookieValue,
  isAdminAuthEnabled,
  resolveRoleForPassword
} from "@/lib/adminAuth";

async function login(formData: FormData) {
  "use server";

  const password = String(formData.get("password") ?? "");
  const nextPathRaw = String(formData.get("next") ?? "/admin");
  const nextPath = nextPathRaw.startsWith("/admin") ? nextPathRaw : "/admin";

  if (!isAdminAuthEnabled()) {
    redirect(nextPath);
  }

  const role = resolveRoleForPassword(password);
  if (!role) {
    redirect(`/admin/login?error=1&next=${encodeURIComponent(nextPath)}`);
  }

  const cookieStore = await cookies();
  cookieStore.set(SESSION_COOKIE_NAME, buildSessionCookieValue(role), {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/admin",
    maxAge: 60 * 60 * 8
  });

  redirect(nextPath);
}

export default async function AdminLogin({
  searchParams
}: {
  searchParams: Promise<{ error?: string; next?: string }>;
}) {
  const { error, next } = await searchParams;
  const nextPath = next && next.startsWith("/admin") ? next : "/admin";
  const authEnabled = isAdminAuthEnabled();

  return (
    <div className="mx-auto w-full max-w-sm space-y-4 rounded-md border border-zinc-200 bg-white p-4">
      <div>
        <h1 className="text-lg font-semibold text-zinc-900">Admin login</h1>
        <p className="mt-1 text-xs text-zinc-600">
          Sign in with editor or publisher password.
        </p>
      </div>

      {!authEnabled ? (
        <p className="rounded border border-amber-200 bg-amber-50 px-2 py-1 text-xs text-amber-800">
          Admin password variables are not set. Auth is currently bypassed.
        </p>
      ) : null}

      {error ? (
        <p className="rounded border border-red-200 bg-red-50 px-2 py-1 text-xs text-red-700">
          Invalid password.
        </p>
      ) : null}

      <form action={login} className="space-y-3">
        <input type="hidden" name="next" value={nextPath} />

        <div className="space-y-1">
          <label className="block text-xs font-medium text-zinc-800">
            Password
          </label>
          <input
            type="password"
            name="password"
            className="w-full rounded-md border border-zinc-300 px-3 py-2 text-sm focus:border-zinc-900 focus:outline-none focus:ring-1 focus:ring-zinc-900"
            required
            autoFocus
          />
        </div>

        <button
          type="submit"
          className="w-full rounded-md bg-black px-3 py-2 text-sm font-medium text-white hover:bg-zinc-800"
        >
          Sign in
        </button>
      </form>
    </div>
  );
}
