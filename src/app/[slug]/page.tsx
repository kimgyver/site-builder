import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import type { Metadata } from "next";

type SlugParams = Promise<{ slug?: string }>;
type SlugSearchParams = Promise<{ preview?: string }>;
type SectionProps = Record<string, unknown>;
type FaqItem = { question?: string; answer?: string };

export async function generateMetadata({
  params,
  searchParams
}: {
  params: SlugParams;
  searchParams: SlugSearchParams;
}): Promise<Metadata> {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (!slug) return {};

  const where =
    preview && preview.trim()
      ? {
          slug,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, status: "PUBLISHED" as const };

  const page = await prisma.page.findFirst({
    where,
    select: { title: true, seoTitle: true, seoDescription: true }
  });

  if (!page) return {};

  return {
    title: page.seoTitle || page.title,
    description: page.seoDescription || undefined,
    robots: preview ? { index: false, follow: false } : undefined
  };
}

export default async function DynamicPage({
  params,
  searchParams
}: {
  params: SlugParams;
  searchParams: SlugSearchParams;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (!slug) {
    notFound();
  }

  const where =
    preview && preview.trim()
      ? {
          slug,
          OR: [{ status: "PUBLISHED" as const }, { previewToken: preview }]
        }
      : { slug, status: "PUBLISHED" as const };

  const page = await prisma.page.findFirst({
    where,
    include: { sections: { orderBy: { order: "asc" } } }
  });

  if (!page) {
    notFound();
  }

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900">
      <main className="mx-auto max-w-3xl px-4 py-12">
        <h1 className="text-3xl font-semibold tracking-tight">{page.title}</h1>
        <div className="mt-6 space-y-8 text-zinc-800">
          {page.sections
            .filter(section => section.enabled !== false)
            .map(section => {
              const props = section.props as SectionProps;

              const title =
                typeof props.title === "string" ? props.title : undefined;
              const subtitle =
                typeof props.subtitle === "string" ? props.subtitle : undefined;
              const html = typeof props.html === "string" ? props.html : "";
              const imageUrl =
                typeof props.url === "string" ? props.url : undefined;
              const imageAlt = typeof props.alt === "string" ? props.alt : "";
              const imageCaption =
                typeof props.caption === "string" ? props.caption : undefined;

              if (section.type === "hero") {
                return (
                  <section
                    key={section.id}
                    className="rounded-2xl bg-zinc-900 px-6 py-10 text-zinc-50"
                  >
                    <h2 className="text-3xl font-semibold tracking-tight">
                      {title || page.title}
                    </h2>
                    {subtitle ? (
                      <p className="mt-3 max-w-prose text-sm text-zinc-300">
                        {subtitle}
                      </p>
                    ) : null}
                  </section>
                );
              }

              if (section.type === "richText" || section.type === "text") {
                return (
                  <div
                    key={section.id}
                    className="rich-content max-w-none"
                    dangerouslySetInnerHTML={{ __html: html }}
                  />
                );
              }

              if (section.type === "image") {
                if (!imageUrl) return null;
                return (
                  <figure key={section.id} className="space-y-2">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={imageUrl}
                      alt={imageAlt}
                      className="w-full rounded-lg border border-zinc-200 object-cover"
                    />
                    {imageCaption ? (
                      <figcaption className="text-sm text-zinc-500">
                        {imageCaption}
                      </figcaption>
                    ) : null}
                  </figure>
                );
              }

              if (section.type === "faq") {
                const items = Array.isArray(props.items)
                  ? (props.items as FaqItem[])
                  : [];
                if (!items.length) return null;

                return (
                  <section key={section.id} className="space-y-4">
                    <h2 className="text-xl font-semibold tracking-tight">
                      {title || "FAQ"}
                    </h2>
                    <dl className="space-y-3">
                      {items.map((item, index) => (
                        <div
                          key={index}
                          className="rounded-md border border-zinc-200 bg-white px-4 py-3"
                        >
                          <dt className="text-sm font-medium text-zinc-900">
                            {item.question ?? ""}
                          </dt>
                          <dd className="mt-1 text-sm text-zinc-600">
                            {item.answer ?? ""}
                          </dd>
                        </div>
                      ))}
                    </dl>
                  </section>
                );
              }

              return (
                <pre
                  key={section.id}
                  className="overflow-x-auto rounded-md bg-zinc-900 px-3 py-2 text-xs text-zinc-100"
                >
                  {JSON.stringify(section, null, 2)}
                </pre>
              );
            })}
        </div>
      </main>
    </div>
  );
}
