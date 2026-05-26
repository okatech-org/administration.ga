/**
 * Middleware Next.js — couche d'authentification PNPE.
 *
 * Architecture en 2 couches :
 *  1. **Ce middleware** : vérifie la présence du cookie Better Auth et
 *     redirige vers `/` les utilisateurs non-authentifiés tentant
 *     d'accéder à une route protégée. Rapide, pas d'appel réseau.
 *  2. **Layouts client (`PnpeRoleGate`)** : récupère le rôle PNPE de
 *     l'utilisateur via `api.functions.pnpe.session.getMyRole` et
 *     restreint l'accès aux routes selon le rôle :
 *       - demandeur_emploi → /demandeur/*
 *       - employeur → /employeur/*
 *       - conseiller_pnpe, chef_*, direction_pnpe → /conseiller/*
 *       - formateur_auto_emploi → /auto-emploi/formation
 *       - admin_ministere_travail → /pnpe (backoffice administratif)
 *
 * Ce pattern évite de décoder le cookie Better Auth côté Edge Runtime
 * (qui demanderait l'export du secret de signature) et profite de la
 * réactivité Convex pour mettre à jour le rôle en temps réel après
 * une promotion ou un changement d'antenne.
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

  // 3. Le dispatch par rôle est délégué aux layouts client via
  // `PnpeRoleGate` qui appelle `api.functions.pnpe.session.getMyRole`.
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
