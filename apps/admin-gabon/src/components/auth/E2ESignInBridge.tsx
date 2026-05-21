"use client";

import { useEffect } from "react";
import { authClient } from "@/lib/auth-client";

/**
 * E2E Sign-In Bridge — Sprint 6
 *
 * Expose `window.__e2eDevSignIn(email)` pour permettre à Playwright
 * de signer un utilisateur sans clic dans DevAccountSwitcher.
 *
 * Actif uniquement si `NEXT_PUBLIC_E2E_MODE === "true"` ET pas en production.
 * Ne rend rien visuellement.
 *
 * Flow :
 *  1. POST /api/dev/sign-in avec { email } → récupère tempPassword.
 *  2. authClient.signIn.email({ email, password: tempPassword }).
 *  3. Retourne { ok, error? }.
 *
 * Utilisation Playwright (global-setup.ts) :
 *  await page.goto("/login");
 *  await page.evaluate(() => window.__e2eDevSignIn("test-agent@consulat.ga"));
 *  await page.context().storageState({ path: "tests/e2e/.auth/agent.json" });
 */
declare global {
  interface Window {
    __e2eDevSignIn?: (
      email: string,
    ) => Promise<{ ok: boolean; error?: string }>;
  }
}

export function E2ESignInBridge() {
  const enabled = process.env.NEXT_PUBLIC_E2E_MODE === "true";

  useEffect(() => {
    if (!enabled) return;
    if (process.env.NODE_ENV === "production") return;

    window.__e2eDevSignIn = async (email: string) => {
      try {
        const devRes = await fetch("/api/dev/sign-in", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email }),
        });
        if (!devRes.ok) {
          const data = await devRes.json().catch(() => ({}));
          return { ok: false, error: data.error || `HTTP ${devRes.status}` };
        }
        const { tempPassword } = await devRes.json();
        const signIn = await authClient.signIn.email({
          email,
          password: tempPassword,
        });
        if (signIn.error) {
          return { ok: false, error: signIn.error.message };
        }
        return { ok: true };
      } catch (err) {
        return {
          ok: false,
          error: err instanceof Error ? err.message : String(err),
        };
      }
    };

    return () => {
      delete window.__e2eDevSignIn;
    };
  }, [enabled]);

  if (!enabled) return null;

  // Indicator visuel discret pour que le dev sache que E2E mode est actif
  return (
    <div
      data-testid="e2e-mode-indicator"
      className="fixed bottom-0 left-0 z-[9999] rounded-tr-md bg-amber-500/90 px-1.5 py-0.5 text-[9px] font-extrabold uppercase tracking-widest text-black"
    >
      E2E
    </div>
  );
}
