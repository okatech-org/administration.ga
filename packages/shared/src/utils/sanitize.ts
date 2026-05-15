import DOMPurify from "isomorphic-dompurify";

/**
 * Sanitize HTML content to prevent XSS attacks.
 * Uses a strict allowlist of tags and attributes suitable for rich-text content.
 */
export function sanitizeHtml(dirty: string): string {
  return DOMPurify.sanitize(dirty, {
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
  });
}
