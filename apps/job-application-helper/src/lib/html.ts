const NAMED_ENTITIES: Record<string, string> = {
  "&amp;": "&",
  "&lt;": "<",
  "&gt;": ">",
  "&quot;": '"',
  "&#39;": "'",
  "&apos;": "'",
  "&nbsp;": " ",
};

/** Decodes the common named/numeric/hex HTML entities job boards send in plain-text fields. */
export function decodeHtmlEntities(value: string): string {
  return value
    .replace(/&amp;|&lt;|&gt;|&quot;|&#39;|&apos;|&nbsp;/g, (entity) => NAMED_ENTITIES[entity] ?? entity)
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCharCode(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)));
}

/**
 * Job boards (Greenhouse, Arbeitnow, some Lever fallbacks) return descriptions
 * as raw HTML. Rendered as plain text that shows literal "<br>"/"<p>" tags —
 * convert block-level tags to newlines, strip the rest, then decode entities.
 */
export function htmlToPlainText(html: string): string {
  return decodeHtmlEntities(
    html
      .replace(/<\s*br\s*\/?>/gi, "\n")
      .replace(/<\/\s*(p|div|li|h[1-6])\s*>/gi, "\n\n")
      .replace(/<[^>]+>/g, ""),
  )
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}
