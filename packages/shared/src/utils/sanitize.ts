import DOMPurify from "dompurify";

/**
 * Allowlist commune (tags + attributs) appliquée à `sanitizeHtml`.
 *
 * Définie hors de la fonction pour éviter de recréer l'objet à chaque appel.
 */
const PURIFY_CONFIG = {
  ALLOWED_TAGS: [
    "p", "br", "strong", "b", "em", "i", "u", "s",
    "ul", "ol", "li",
    "a",
    "h1", "h2", "h3", "h4", "h5", "h6",
    "img",
    "blockquote", "pre", "code",
    "table", "thead", "tbody", "tr", "th", "td",
    "span", "div",
    // Editorial blocks for Article.html / Guide.html mockups
    // (keyFact, pullquote, callout, figure, details/summary)
    "figure", "figcaption",
    "details", "summary",
    "cite",
    "hr", "sub", "sup",
  ],
  ALLOWED_ATTR: [
    "href", "src", "alt", "title", "class", "target", "rel",
    "width", "height",
    "id",              // anchor links for TOC
    "open",            // <details open>
    "data-variant",    // callout variants: info / ok / warn
  ],
  ALLOW_DATA_ATTR: false,
};

/** Fallback SSR : strip tous les tags HTML pour ne jamais injecter de HTML
 *  brut dans le rendu serveur. La sanitization complète a lieu côté client
 *  après hydratation (DOMPurify natif nécessite `window`). */
function stripTags(input: string): string {
  return input.replace(/<[^>]*>/g, "");
}

/**
 * Sanitize HTML content to prevent XSS attacks.
 *
 * Côté client : `DOMPurify` natif (avec `window`) applique l'allowlist.
 * Côté serveur (SSR/SSG) : retourne une version sans tag (texte brut) afin
 *   d'éviter d'embarquer `jsdom` (incompatible avec le bundling Next.js).
 *   Le client re-sanitize correctement lors de l'hydratation.
 */
export function sanitizeHtml(dirty: string): string {
  if (typeof window === "undefined") {
    return stripTags(dirty);
  }
  return DOMPurify.sanitize(dirty, PURIFY_CONFIG) as string;
}
