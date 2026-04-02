/**
 * startupChecks.ts — Verification de securite de tous les secrets au demarrage.
 *
 * Appele au debut des endpoints HTTP critiques pour garantir
 * que l'environnement est correctement configure.
 * En production : throw hard. En dev : log warnings.
 */

interface SecretRule {
  name: string;
  envVar: string;
  minLength?: number;
  required: boolean;
  /** Si true, requis uniquement en production */
  prodOnly?: boolean;
}

const SECRET_RULES: SecretRule[] = [
  { name: "Better Auth Secret", envVar: "BETTER_AUTH_SECRET", minLength: 32, required: true },
  { name: "Trusted Origins", envVar: "TRUSTED_ORIGINS", required: true },
  { name: "Convex Site URL", envVar: "CONVEX_SITE_URL", required: true },
  { name: "Gemini API Key", envVar: "GEMINI_API_KEY", minLength: 20, required: true },
  { name: "Stripe Secret Key", envVar: "STRIPE_SECRET_KEY", minLength: 20, required: false, prodOnly: true },
  { name: "Stripe Webhook Secret", envVar: "STRIPE_WEBHOOK_SECRET", minLength: 20, required: false, prodOnly: true },
  { name: "LiveKit API Key", envVar: "LIVEKIT_API_KEY", required: false, prodOnly: true },
  { name: "LiveKit API Secret", envVar: "LIVEKIT_API_SECRET", minLength: 20, required: false, prodOnly: true },
  { name: "Bird API Key", envVar: "BIRD_API_KEY", minLength: 20, required: false, prodOnly: true },
  { name: "PostHog Warehouse Key", envVar: "POSTHOG_WAREHOUSE_API_KEY", required: false, prodOnly: true },
  { name: "Field Encryption Key", envVar: "FIELD_ENCRYPTION_KEY", minLength: 40, required: false, prodOnly: true },
];

let _checked = false;

/**
 * Valider que tous les secrets requis sont configures.
 * Cache le resultat : ne s'execute qu'une seule fois par instance.
 */
export function validateAllSecrets(): void {
  if (_checked) return;
  _checked = true;

  const siteUrl = process.env.CONVEX_SITE_URL ?? "";
  const isProduction = ["consulat.ga", "diplomate.ga", "admin.consulat.ga"].some(
    (d) => siteUrl.includes(d),
  );

  const errors: string[] = [];
  const warnings: string[] = [];

  for (const rule of SECRET_RULES) {
    const value = process.env[rule.envVar];

    // Skip prodOnly rules en dev
    if (rule.prodOnly && !isProduction) continue;

    if (!value) {
      if (rule.required) {
        errors.push(`${rule.name} (${rule.envVar}) est manquant`);
      } else if (isProduction) {
        warnings.push(`${rule.name} (${rule.envVar}) recommande en production`);
      }
      continue;
    }

    if (rule.minLength && value.length < rule.minLength) {
      errors.push(`${rule.name} (${rule.envVar}) trop court : ${value.length} < ${rule.minLength}`);
    }
  }

  // Dev signin JAMAIS en production
  if (isProduction && process.env.DEV_SIGNIN_ENABLED === "true") {
    errors.push("DEV_SIGNIN_ENABLED=true interdit en production");
  }

  // Trusted origins doit contenir HTTPS en production
  if (isProduction) {
    const origins = process.env.TRUSTED_ORIGINS ?? "";
    if (!origins.includes("https://")) {
      errors.push("TRUSTED_ORIGINS doit contenir au moins une origine HTTPS en production");
    }
  }

  if (warnings.length > 0) {
    console.warn(`[SECURITY] Avertissements :\n  - ${warnings.join("\n  - ")}`);
  }

  if (errors.length > 0) {
    const message = `[SECURITY STARTUP FAILURE]\n  - ${errors.join("\n  - ")}`;
    if (isProduction) {
      throw new Error(message);
    } else {
      console.warn(message);
    }
  }
}
