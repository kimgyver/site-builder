import Link from "next/link";

export default function Home() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-50 font-sans">
      <main className="mx-auto flex w-full max-w-2xl flex-col gap-6 px-6 py-16">
        <h1 className="text-3xl font-semibold tracking-tight text-zinc-900">
          Welcome to your Site Builder
        </h1>
        <p className="text-sm text-zinc-600">
          Use the admin to create pages (with slug, status and rich text
          content) and view them on public URLs like <code>/en/about</code> (or
          <code>/about</code> for the default locale).
        </p>
        <div className="flex flex-wrap gap-3">
          <Link
            href="/admin"
            className="rounded-md bg-black px-4 py-2 text-sm font-medium text-white hover:bg-zinc-800"
          >
            Open admin
          </Link>
          <Link
            href="/en/about"
            className="rounded-md border border-zinc-300 px-4 py-2 text-sm font-medium text-zinc-800 hover:bg-zinc-100"
          >
            Example: /en/about (if created)
          </Link>
        </div>
      </main>
    </div>
  );
}
