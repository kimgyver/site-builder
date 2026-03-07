export function isEmbeddedDataImage(url: string): boolean {
  return /^data:image\//i.test(url);
}

export function isImageLikeUrl(url: string): boolean {
  return (
    isEmbeddedDataImage(url) ||
    /\.(jpg|jpeg|png|gif|webp|bmp|svg|avif)(\?.*)?$/i.test(url) ||
    url.startsWith("https://placehold.co/") ||
    url.startsWith("https://imgnews") ||
    url.startsWith("https://images") ||
    url.startsWith("https://pstatic") ||
    url.startsWith("https://cdn") ||
    url.startsWith("/public/")
  );
}
