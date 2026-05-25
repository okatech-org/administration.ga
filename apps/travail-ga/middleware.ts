/**
 * Middleware Next.js — TRAVAIL.GA.
 *
 * Protege les routes qui necessitent un compte (publier-annonce/particulier,
 * postuler, mon-compte) en redirigeant vers /auth/connexion si pas de
 * cookie de session Better Auth. La validation reelle du token est faite
 * cote Convex ; ici on filtre rapidement avant le rendu.
 */
import { NextRequest, NextResponse } from "next/server";

const PROTECTED_PREFIXES = [
  "/mon-compte",
  "/publier-annonce/particulier",
];

const PROTECTED_PATTERNS = [
  /^\/postuler\/[^/]+$/, // /postuler/:reference (POST par formulaire)
];

const BETTER_AUTH_COOKIE_NAMES = [
  "better-auth.session_token",
  "__Secure-better-auth.session_token",
];

export function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;

  const isProtected =
    PROTECTED_PREFIXES.some((p) => pathname.startsWith(p)) ||
    PROTECTED_PATTERNS.some((re) => re.test(pathname));

  if (!isProtected) return NextResponse.next();

  const hasSession = BETTER_AUTH_COOKIE_NAMES.some((name) =>
    req.cookies.get(name)?.value,
  );

  if (hasSession) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/auth/connexion";
  url.searchParams.set("redirect", pathname + req.nextUrl.search);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: [
    "/mon-compte/:path*",
    "/publier-annonce/particulier",
    "/postuler/:reference",
  ],
};
