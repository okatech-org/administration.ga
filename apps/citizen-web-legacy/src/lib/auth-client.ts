// Réexporter l'authClient unique du package partagé.
// Cela garantit que les composants d'auth utilisent
// la MEME instance que ConvexBetterAuthProvider dans le provider.
export { authClient } from "@workspace/api/auth-client";
