"use client";

/**
 * Bouton user du header — reflète l'état de session Better Auth.
 *
 * - Non connecté : "Connexion" → /mon-compte (qui propose le DEV switcher
 *   ou la redirection PNPE selon l'environnement).
 * - Connecté : initiales + prénom dérivés de `session.user.name` ou
 *   `session.user.email`. Le clic ouvre un menu déroulant avec les
 *   raccourcis vers le compte (profil, candidatures, paramètres) +
 *   un bouton de déconnexion explicite.
 *
 * Tant que ConvexBetterAuth hydrate la session, on rend un placeholder
 * neutre (pas de flicker label "Connexion" qui passerait à "Sylvianne").
 */

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components/design/icons";
import { pnpeLink } from "@/lib/utils";

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
  const [open, setOpen] = useState(false);
  const [signingOut, setSigningOut] = useState(false);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);

  const view = useMemo(() => {
    if (isPending) return { state: "loading" as const };
    if (!session?.user) return { state: "anon" as const };
    return {
      state: "auth" as const,
      label: deriveFirstName(session.user.name, session.user.email),
      initials: deriveInitials(session.user.name, session.user.email),
      fullName: session.user.name ?? null,
      email: session.user.email ?? null,
    };
  }, [isPending, session]);

  // Fermer sur clic extérieur + Escape
  useEffect(() => {
    if (!open) return;
    const onDown = (e: MouseEvent) => {
      const t = e.target as Node;
      if (
        menuRef.current?.contains(t) ||
        triggerRef.current?.contains(t)
      ) {
        return;
      }
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Déconnecté avec succès");
      setOpen(false);
      await new Promise((r) => setTimeout(r, 400));
      window.location.href = "/";
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error("Échec de la déconnexion", { description: m });
      setSigningOut(false);
    }
  };

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
    <div style={{ position: "relative" }}>
      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="travail-user-btn"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          height: 36,
          padding: "0 4px 0 10px",
          borderRadius: 10,
          background: open ? "var(--bg-elev-2)" : "var(--bg-elev-1)",
          border: "1px solid",
          borderColor: open ? "var(--border-strong)" : "var(--border)",
          color: "var(--fg)",
          fontSize: 13,
          fontWeight: 550,
          cursor: "pointer",
          fontFamily: "inherit",
          transition: "all var(--dur-fast)",
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
      </button>

      {open && (
        <div
          ref={menuRef}
          role="menu"
          style={{
            position: "absolute",
            top: "calc(100% + 8px)",
            right: 0,
            width: 280,
            background: "var(--bg-elev-1)",
            border: "1px solid var(--border)",
            borderRadius: "var(--r-card)",
            boxShadow: "var(--shadow-3)",
            padding: 6,
            zIndex: 40,
            animation: "travail-user-menu-in 160ms var(--ease-out)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "10px 12px 12px",
              borderBottom: "1px solid var(--border-faint)",
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
            }}
          >
            <div
              style={{
                width: 38,
                height: 38,
                borderRadius: 10,
                background: "var(--brand-blue)",
                color: "#fff",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                fontFamily: "var(--font-display)",
                fontWeight: 800,
                fontSize: 14,
                flexShrink: 0,
              }}
            >
              {view.initials}
            </div>
            <div style={{ minWidth: 0, flex: 1 }}>
              <div
                style={{
                  fontSize: 13.5,
                  fontWeight: 600,
                  color: "var(--fg)",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  whiteSpace: "nowrap",
                }}
              >
                {view.fullName || view.email || "Compte"}
              </div>
              {view.email && view.fullName && (
                <div
                  style={{
                    fontSize: 11.5,
                    color: "var(--fg-subtle)",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                    marginTop: 1,
                  }}
                >
                  {view.email}
                </div>
              )}
            </div>
          </div>

          {/* Items */}
          {[
            { href: "/mon-compte", icon: Icons.Home, label: "Vue d'ensemble" },
            { href: "/mon-compte/candidatures", icon: Icons.Briefcase, label: "Mes candidatures" },
            { href: "/mon-compte/profil", icon: Icons.User, label: "Mon profil" },
            { href: "/mon-compte/favoris", icon: Icons.Heart, label: "Favoris" },
            { href: "/mon-compte/parametres", icon: Icons.Settings, label: "Paramètres" },
          ].map((it) => {
            const Icon = it.icon;
            return (
              <Link
                key={it.href}
                href={it.href}
                onClick={() => setOpen(false)}
                role="menuitem"
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 10,
                  padding: "8px 10px",
                  borderRadius: 8,
                  textDecoration: "none",
                  color: "var(--fg-muted)",
                  fontSize: 13.5,
                  fontWeight: 500,
                  transition: "all var(--dur-fast)",
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = "var(--bg-elev-2)";
                  e.currentTarget.style.color = "var(--fg)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--fg-muted)";
                }}
              >
                <Icon size={15} style={{ color: "var(--fg-subtle)" }} />
                <span style={{ flex: 1 }}>{it.label}</span>
              </Link>
            );
          })}

          <a
            href={pnpeLink("/dashboard")}
            target="_blank"
            rel="noreferrer"
            role="menuitem"
            onClick={() => setOpen(false)}
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "8px 10px",
              borderRadius: 8,
              textDecoration: "none",
              color: "var(--brand-blue)",
              fontSize: 13.5,
              fontWeight: 600,
              marginTop: 4,
              transition: "all var(--dur-fast)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "var(--brand-blue-50)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "transparent";
            }}
          >
            <Icons.Sparkles size={15} />
            <span style={{ flex: 1 }}>Ouvrir PNPE.GA</span>
            <Icons.ArrowUR size={12} style={{ opacity: 0.7 }} />
          </a>

          {/* Logout */}
          <div
            style={{
              marginTop: 6,
              paddingTop: 6,
              borderTop: "1px solid var(--border-faint)",
            }}
          >
            <button
              type="button"
              role="menuitem"
              onClick={handleSignOut}
              disabled={signingOut}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                padding: "9px 10px",
                width: "100%",
                background: "transparent",
                border: "none",
                borderRadius: 8,
                color: "var(--color-danger, #C24343)",
                fontSize: 13.5,
                fontWeight: 600,
                cursor: signingOut ? "wait" : "pointer",
                opacity: signingOut ? 0.6 : 1,
                textAlign: "left",
                fontFamily: "inherit",
                transition: "all var(--dur-fast)",
              }}
              onMouseEnter={(e) => {
                if (!signingOut)
                  e.currentTarget.style.background = "rgba(194,67,67,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "transparent";
              }}
            >
              <Icons.LogOut size={15} />
              <span style={{ flex: 1 }}>
                {signingOut ? "Déconnexion…" : "Se déconnecter"}
              </span>
            </button>
          </div>

          <style>{`
            @keyframes travail-user-menu-in {
              from { opacity: 0; transform: translateY(-4px); }
              to { opacity: 1; transform: translateY(0); }
            }
          `}</style>
        </div>
      )}
    </div>
  );
}
