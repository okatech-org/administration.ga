"use client";

/**
 * Sidebar TRAVAIL.GA — menu latéral de l'espace candidat.
 *
 * Affiche :
 *  - Carte identité (avatar + nom + email)
 *  - Navigation 7 items (vue d'ensemble, candidatures, profil, favoris,
 *    notifications, paramètres, aide)
 *  - Lien rapide vers PNPE.GA (workflows complets)
 *  - Bouton de déconnexion (toast + reload)
 *
 * Le bouton de déconnexion est volontairement séparé visuellement
 * (border-top + tone danger discret) pour qu'il soit toujours visible
 * sans être agressif. Le composant gère lui-même l'appel
 * `authClient.signOut()` puis recharge la page pour purger la session.
 *
 * Responsive : sur mobile (<900px), le rendu est inline (mt-0) plutot que
 * fixe ; le layout parent décide comment l'afficher (drawer ou inline).
 */

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { toast } from "sonner";
import { Icons, type IconComponent } from "@/components/design/icons";
import { authClient } from "@/lib/auth-client";
import { pnpeLink } from "@/lib/utils";

type NavItem = {
  href: string;
  label: string;
  icon: IconComponent;
  hint?: string;
};

const NAV_ITEMS: NavItem[] = [
  {
    href: "/mon-compte",
    label: "Vue d'ensemble",
    icon: Icons.Home,
    hint: "Synthèse de votre activité",
  },
  {
    href: "/mon-compte/candidatures",
    label: "Mes candidatures",
    icon: Icons.Briefcase,
    hint: "Postulations & statuts",
  },
  {
    href: "/mon-compte/profil",
    label: "Mon profil",
    icon: Icons.User,
    hint: "CV, compétences, identité",
  },
  {
    href: "/mon-compte/favoris",
    label: "Offres favorites",
    icon: Icons.Heart,
    hint: "Offres mises de côté",
  },
  {
    href: "/mon-compte/notifications",
    label: "Notifications",
    icon: Icons.Bell,
    hint: "Alertes & messages",
  },
  {
    href: "/mon-compte/parametres",
    label: "Paramètres",
    icon: Icons.Settings,
    hint: "Compte, sécurité, préférences",
  },
  {
    href: "/mon-compte/aide",
    label: "Aide & support",
    icon: Icons.HelpCircle,
    hint: "FAQ, contact PNPE",
  },
];

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function AccountSidebar({
  userName,
  userEmail,
  onNavigate,
}: {
  userName?: string | null;
  userEmail?: string | null;
  onNavigate?: () => void;
}) {
  const pathname = usePathname() ?? "/mon-compte";
  const router = useRouter();
  const [signingOut, setSigningOut] = useState(false);

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Vous êtes déconnecté");
      // Petite pause pour laisser le toast s'afficher avant le reload.
      await new Promise((r) => setTimeout(r, 400));
      // Reload pour rehydrater la session Convex/BetterAuth.
      router.refresh();
      window.location.href = "/";
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error("Échec de la déconnexion", { description: m });
      setSigningOut(false);
    }
  };

  return (
    <aside
      className="travail-account-sidebar"
      style={{
        width: 268,
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
        gap: 14,
      }}
    >
      {/* Carte identité */}
      <div
        style={{
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 16,
          display: "flex",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div
          style={{
            width: 44,
            height: 44,
            borderRadius: 11,
            background: "var(--brand-blue)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontFamily: "var(--font-display)",
            fontWeight: 800,
            fontSize: 16,
            letterSpacing: "-0.02em",
            flexShrink: 0,
          }}
        >
          {initialsFrom(userName, userEmail)}
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
              letterSpacing: "-0.01em",
            }}
          >
            {userName ?? userEmail ?? "Compte"}
          </div>
          {userEmail && userName && (
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
              {userEmail}
            </div>
          )}
        </div>
      </div>

      {/* Navigation */}
      <nav
        style={{
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 6,
          display: "flex",
          flexDirection: "column",
          gap: 1,
        }}
      >
        {NAV_ITEMS.map((item) => {
          const active =
            item.href === "/mon-compte"
              ? pathname === "/mon-compte"
              : pathname === item.href || pathname.startsWith(item.href + "/");
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 11,
                padding: "9px 11px",
                borderRadius: 9,
                textDecoration: "none",
                color: active ? "var(--fg)" : "var(--fg-muted)",
                background: active ? "var(--bg-elev-2)" : "transparent",
                fontSize: 13.5,
                fontWeight: active ? 600 : 500,
                letterSpacing: "-0.005em",
                transition: "all var(--dur-fast)",
                position: "relative",
              }}
              onMouseEnter={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "var(--bg-elev-2)";
                  e.currentTarget.style.color = "var(--fg)";
                }
              }}
              onMouseLeave={(e) => {
                if (!active) {
                  e.currentTarget.style.background = "transparent";
                  e.currentTarget.style.color = "var(--fg-muted)";
                }
              }}
            >
              {active && (
                <span
                  aria-hidden
                  style={{
                    position: "absolute",
                    left: -7,
                    top: 8,
                    bottom: 8,
                    width: 3,
                    borderRadius: 2,
                    background: "var(--brand-blue)",
                  }}
                />
              )}
              <Icon
                size={16}
                style={{
                  color: active ? "var(--brand-blue)" : "var(--fg-subtle)",
                  flexShrink: 0,
                }}
              />
              <span style={{ flex: 1 }}>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* CTA PNPE */}
      <a
        href={pnpeLink("/dashboard")}
        target="_blank"
        rel="noreferrer"
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "12px 14px",
          background: "var(--brand-blue-50)",
          border: "1px solid var(--brand-blue-50)",
          borderRadius: "var(--r-card)",
          textDecoration: "none",
          color: "var(--brand-blue)",
          fontSize: 13,
          fontWeight: 600,
          transition: "all var(--dur-fast)",
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = "translateY(-1px)";
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = "translateY(0)";
        }}
      >
        <Icons.Sparkles size={15} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ lineHeight: 1.2 }}>Espace PNPE.GA</div>
          <div
            style={{
              fontSize: 11,
              fontWeight: 500,
              color: "var(--brand-blue)",
              opacity: 0.7,
              marginTop: 2,
            }}
          >
            Workflows complets
          </div>
        </div>
        <Icons.ArrowUR size={13} style={{ opacity: 0.7 }} />
      </a>

      {/* Déconnexion */}
      <button
        type="button"
        onClick={handleSignOut}
        disabled={signingOut}
        style={{
          display: "flex",
          alignItems: "center",
          gap: 11,
          padding: "11px 14px",
          background: "transparent",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          color: "var(--color-danger, #C24343)",
          fontSize: 13,
          fontWeight: 600,
          cursor: signingOut ? "wait" : "pointer",
          opacity: signingOut ? 0.6 : 1,
          width: "100%",
          textAlign: "left",
          fontFamily: "inherit",
          transition: "all var(--dur-fast)",
        }}
        onMouseEnter={(e) => {
          if (!signingOut) {
            e.currentTarget.style.background = "rgba(194,67,67,0.06)";
            e.currentTarget.style.borderColor = "var(--color-danger, #C24343)";
          }
        }}
        onMouseLeave={(e) => {
          if (!signingOut) {
            e.currentTarget.style.background = "transparent";
            e.currentTarget.style.borderColor = "var(--border)";
          }
        }}
      >
        <Icons.LogOut size={15} style={{ flexShrink: 0 }} />
        <span style={{ flex: 1 }}>
          {signingOut ? "Déconnexion…" : "Se déconnecter"}
        </span>
      </button>
    </aside>
  );
}
