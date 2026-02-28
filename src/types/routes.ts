export type DynamicSlugParams = Promise<{ slug?: string }>;

export type DynamicSlugSearchParams = Promise<{ preview?: string }>;

export type DynamicLocaleSlugParams = Promise<{
  locale?: string;
  slug?: string;
}>;
