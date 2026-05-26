"use client";

/**
 * Bouton user du header — reflète l'état de session Better Auth.
 *
 * - Non connecté : "Connexion" → /mon-compte (qui propose le DEV switcher
 *   ou la redirection PNPE selon l'environnement).
 * - Connecté : initiales + prénom dérivés de `session.user.name` ou
 *   `session.user.email`, lien vers /mon-compte.
 *
 * Tant que ConvexBetterAuth hydrate la session, on rend un placeholder
 * neutre (pas de flicker label "Connexion" qui passerait à "Sylvianne").
 */

import Link from "next/link";
import { useMemo } from "react";
import { authClient } from "@/lib/auth-client";

function deriveInitials(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

function deriveFirstName(name?: string | null, email?: string | null): string {
  if (name && name.trim()) return name.trim().split(/\s+/)[0]!;
  if (email) return email.split("@")[0]!.split(/[._-]/)[0]!;
  return "Compte";
}

export function UserButton() {
  const { data: session, isPending } = authClient.useSession();

  const view = useMemo(() => {
    if (isPending) return { state: "loading" as const };
    if (!session?.user) return { state: "anon" as const };
    return {
      state: "auth" as const,
      label: deriveFirstName(session.user.name, session.user.email),
      initials: deriveInitials(session.user.name, session.user.email),
    };
  }, [isPending, session]);

  if (view.state === "loading") {
    return (
      <span
        className="travail-user-btn"
        aria-busy
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 4px 0 10px",
          borderRadius: 10,
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          color: "var(--fg-muted)",
          fontSize: 13,
          fontWeight: 550,
          opacity: 0.7,
        }}
      >
        <span
          style={{
            width: 48,
            height: 12,
            borderRadius: 6,
            background: "var(--bg-elev-2)",
          }}
        />
        <span
          style={{
            width: 28,
            height: 28,
            borderRadius: 7,
            background: "var(--bg-elev-2)",
          }}
        />
      </span>
    );
  }

  if (view.state === "anon") {
    return (
      <Link
        href="/mon-compte"
        className="travail-user-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 12px",
          borderRadius: 10,
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          color: "var(--fg)",
          textDecoration: "none",
          fontSize: 13,
          fontWeight: 600,
        }}
      >
        Connexion
      </Link>
    );
  }

  return (
    <Link
      href="/mon-compte"
      className="travail-user-btn"
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        height: 36,
        padding: "0 4px 0 10px",
        borderRadius: 10,
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        color: "var(--fg)",
        textDecoration: "none",
        fontSize: 13,
        fontWeight: 550,
      }}
    >
      <span>{view.label}</span>
      <span
        style={{
          width: 28,
          height: 28,
          borderRadius: 7,
          background: "var(--brand-blue)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: 12,
          fontWeight: 600,
        }}
      >
        {view.initials}
      </span>
    </Link>
  );
}
