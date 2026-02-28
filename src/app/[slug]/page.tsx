import { redirect } from "next/navigation";
import type {
  DynamicSlugParams,
  DynamicSlugSearchParams
} from "@/types/routes";
import { DEFAULT_LOCALE } from "@/lib/i18n";

export default async function DefaultLocaleSlugRedirect({
  params,
  searchParams
}: {
  params: DynamicSlugParams;
  searchParams: DynamicSlugSearchParams;
}) {
  const { slug } = await params;
  const { preview } = await searchParams;

  if (!slug) {
    redirect("/");
  }

  const query = preview ? `?preview=${encodeURIComponent(preview)}` : "";
  redirect(`/${DEFAULT_LOCALE}/${slug}${query}`);
}
