/**
 * Middleware Next.js — dispatch par rôle PNPE.
 *
 * Le middleware s'exécute à chaque requête. Il vérifie la session
 * Better Auth via cookie et redirige selon le rôle :
 *  - demandeur_emploi          → /demandeur/*
 *  - employeur                  → /employeur/*
 *  - conseiller_pnpe, chef_*    → /conseiller/*
 *  - admin_ministere_travail   → /pnpe (backoffice — sur admin.administration.ga)
 *  - non authentifié            → /
 *
 * NOTE Phase 7+ : pour l'instant, le middleware ne fait que protéger
 * les routes auth requises et laisse Convex/Better Auth gérer l'auth
 * réelle côté API. Le dispatch par rôle complet sera ajouté quand
 * l'extraction du rôle depuis le cookie sera stable.
 */

import { NextResponse, type NextRequest } from "next/server";

const AUTH_REQUIRED_PREFIXES = [
  "/demandeur",
  "/employeur",
  "/auto-emploi",
  "/conseiller",
];

const PUBLIC_ROUTES = ["/", "/auth", "/api"];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  // 1. Routes publiques — pas de redirection
  if (PUBLIC_ROUTES.some((p) => pathname === p || pathname.startsWith(p + "/"))) {
    return NextResponse.next();
  }

  // 2. Routes protégées — vérifie un cookie de session Better Auth
  const sessionCookie =
    request.cookies.get("better-auth.session_token") ??
    request.cookies.get("__Secure-better-auth.session_token");

  if (
    AUTH_REQUIRED_PREFIXES.some((p) => pathname.startsWith(p)) &&
    !sessionCookie
  ) {
    // Pas de session → redirige vers la landing avec un retour configuré
    const loginUrl = new URL("/", request.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // 3. TODO Phase 7+ : dispatch par rôle Better Auth (lecture du rôle
  // depuis la session, redirection si le rôle ne match pas la route).
  // Pour l'instant, l'auth Convex côté API rejette les requêtes RBAC.

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match toutes les routes sauf :
     * - _next/static (fichiers statiques)
     * - _next/image (optimisation images)
     * - favicon.ico
     * - assets publics (icons, images)
     */
    "/((?!_next/static|_next/image|favicon.ico|icons|public).*)",
  ],
};
