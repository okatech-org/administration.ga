// Réexporter l'authClient unique du package partagé.
// Cela garantit que SignInCard, DevAccountSwitcher, etc. utilisent
// la MEME instance que ConvexBetterAuthProvider dans le provider.
export { authClient } from "@workspace/api/auth-client";
