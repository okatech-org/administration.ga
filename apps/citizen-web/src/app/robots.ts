import type { MetadataRoute } from "next"
import { SITE_URL } from "@/lib/seo"

const DISALLOW_PRIVATE = [
  "/my-space/",
  "/sign-in",
  "/sign-up",
  "/register",
  "/verify/",
  "/verify-profile/",
  "/listing/",
  "/api/",
  "/post-login-redirect",
]

// Bots IA explicitement autorisés (signal positif + opt-in pour Google-Extended
// qui contrôle Bard/Gemini training, et Applebot-Extended pour Apple Intelligence).
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "ClaudeBot",
  "anthropic-ai",
  "Claude-Web",
  "PerplexityBot",
  "Google-Extended",
  "Applebot-Extended",
  "Bytespider",
  "CCBot",
]

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: "*",
        allow: "/",
        disallow: DISALLOW_PRIVATE,
      },
      ...AI_BOTS.map((userAgent) => ({
        userAgent,
        allow: "/",
        disallow: DISALLOW_PRIVATE,
      })),
    ],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  }
}
