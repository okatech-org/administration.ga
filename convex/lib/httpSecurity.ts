/**
 * Utilitaires de securite pour les handlers HTTP.
 *
 * getTrustedClientIp utilise le DERNIER IP de X-Forwarded-For
 * (ajoute par le proxy de confiance), pas le premier (spoofable).
 */

/** Extraire l'IP client fiable (derniere dans la chaine X-Forwarded-For). */
export function getTrustedClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for") ?? "";
  const ips = forwarded
    .split(",")
    .map((ip) => ip.trim())
    .filter(Boolean);
  // Le dernier IP est celui ajoute par le reverse proxy (non-spoofable)
  return ips[ips.length - 1] ?? "unknown";
}
