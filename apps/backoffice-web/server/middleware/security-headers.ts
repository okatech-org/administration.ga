import { defineEventHandler, setHeaders } from "h3";

/**
 * Security headers middleware — applied to all responses.
 *
 * - X-Content-Type-Options: prevents MIME-sniffing
 * - X-Frame-Options: prevents clickjacking (DENY = no iframe allowed)
 * - X-XSS-Protection: legacy XSS filter for older browsers
 * - Referrer-Policy: limits referrer leakage to same-origin
 * - Permissions-Policy: disables camera/mic/geolocation by default
 * - Strict-Transport-Security: enforces HTTPS for 1 year + subdomains
 * - Content-Security-Policy: strict allowlist for scripts, styles, etc.
 */
export default defineEventHandler((event) => {
  setHeaders(event, {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Referrer-Policy": "strict-origin-when-cross-origin",
    "Permissions-Policy": "camera=(), microphone=(), geolocation=()",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": [
      "default-src 'self'",
      "script-src 'self' 'unsafe-inline' https://*.convex.cloud https://*.posthog.com https://api.mapbox.com",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
      "style-src-elem 'self' 'unsafe-inline' https://fonts.googleapis.com https://api.mapbox.com",
      "img-src 'self' data: blob: https:",
      "font-src 'self' data: https://fonts.gstatic.com",
      "worker-src 'self' blob:",
      "connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.convex.cloud https://*.posthog.com https://*.stripe.com https://api.mapbox.com https://*.tiles.mapbox.com https://events.mapbox.com https://api.livekit.cloud wss://*.livekit.cloud",
      "frame-src https://*.stripe.com",
      "media-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
    ].join("; "),
  });
});
