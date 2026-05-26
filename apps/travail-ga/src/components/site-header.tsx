"use client";

/**
 * Header TRAVAIL.GA — design éditorial, 1:1 avec l'app de référence.
 *
 * Source : design Claude `app.jsx` (InstitutionalBandeau + Header).
 *
 * Composition :
 *  - Bandeau institutionnel République Gabonaise (top, fond #15161A)
 *  - Header sticky avec backdrop-blur
 *    · Logo carré T + label TRAVAIL.GA (`.GA` en émeraude)
 *    · Nav 4 items : Offres / Mes candidatures / Messages / Antennes
 *    · Trigger ⌘K Search (240px, ouvre la CommandPalette)
 *    · Cycle thème (Sun/Moon/Monitor)
 *    · Bell notifications (point ember pour unread)
 *    · Bouton user (initiales + avatar)
 *  - Menu mobile hamburger (<900px)
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { Icons } from "@/components/design/icons";
import { useTheme } from "@/components/design/theme-provider";
import { CommandPalette } from "@/components/design/command-palette";
import { UserButton } from "@/components/auth/user-button";

type NavItem = { href: string; label: string; disabled?: boolean };

const NAV: NavItem[] = [
  { href: "/offres", label: "Offres" },
  { href: "/mon-compte/candidatures", label: "Mes candidatures" },
  { href: "/messages", label: "Messages", disabled: true },
  { href: "/antennes", label: "Antennes" },
];

function InstitutionalBandeau() {
  return (
    <div
      style={{
        background: "var(--bg-inverse)",
        color: "var(--bg)",
        fontSize: 11.5,
        letterSpacing: "0.005em",
      }}
    >
      <div
        className="travail-container"
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "6px 0",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <span
            style={{
              fontFamily: "var(--font-display)",
              fontWeight: 700,
              letterSpacing: "-0.01em",
              opacity: 0.92,
            }}
          >
            République Gabonaise
          </span>
          <span style={{ opacity: 0.38 }}>—</span>
          <span style={{ opacity: 0.65 }}>
            Ministère du Travail · Pôle National de Promotion de l&apos;Emploi
          </span>
        </div>
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            opacity: 0.85,
          }}
        >
          <a
            href="https://administration.ga"
            style={{ cursor: "pointer", opacity: 0.65 }}
          >
            administration.ga
          </a>
          <span style={{ opacity: 0.4 }}>·</span>
          <a
            href="https://demarche.ga"
            style={{ cursor: "pointer", opacity: 0.65 }}
          >
            demarche.ga
          </a>
          <span style={{ opacity: 0.4 }}>·</span>
          <span style={{ color: "var(--brand-emerald)", fontWeight: 600 }}>
            travail.ga
          </span>
        </div>
      </div>
    </div>
  );
}

function LogoMark() {
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: 10 }}>
      <span
        style={{
          width: 30,
          height: 30,
          borderRadius: 8,
          background: "var(--brand-blue)",
          color: "#fff",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          position: "relative",
          overflow: "hidden",
        }}
      >
        <span
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 900,
            fontSize: 17,
            letterSpacing: "-0.04em",
            lineHeight: 1,
          }}
        >
          T
        </span>
        <span
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 4,
            background: "var(--brand-emerald)",
          }}
        />
      </span>
      <span
        style={{
          fontFamily: "var(--font-display)",
          fontWeight: 900,
          fontSize: 19,
          letterSpacing: "-0.04em",
          color: "var(--fg)",
        }}
      >
        TRAVAIL
        <span style={{ color: "var(--brand-emerald)" }}>.GA</span>
      </span>
    </span>
  );
}

function ThemeButton() {
  const { theme, cycleTheme } = useTheme();
  const Icon =
    theme === "dark" ? Icons.Moon : theme === "system" ? Icons.Monitor : Icons.Sun;
  return (
    <button
      type="button"
      onClick={cycleTheme}
      title={`Thème : ${theme}`}
      aria-label={`Changer le thème (actuel : ${theme})`}
      style={{
        width: 36,
        height: 36,
        borderRadius: 10,
        border: "1px solid var(--border)",
        background: "var(--bg-elev-1)",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        cursor: "pointer",
        color: "var(--fg-muted)",
        transition: "color var(--dur-fast)",
      }}
      onMouseEnter={(e) => (e.currentTarget.style.color = "var(--fg)")}
      onMouseLeave={(e) => (e.currentTarget.style.color = "var(--fg-muted)")}
    >
      <Icon size={15} />
    </button>
  );
}

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [mobileOpen, setMobileOpen] = useState(false);
  const [cmdOpen, setCmdOpen] = useState(false);

  // ⌘K keyboard shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setCmdOpen((o) => !o);
      }
      if (e.key === "Escape" && cmdOpen) setCmdOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [cmdOpen]);

  return (
    <>
      <InstitutionalBandeau />
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background: "color-mix(in oklab, var(--bg) 88%, transparent)",
          backdropFilter: "blur(20px) saturate(160%)",
          WebkitBackdropFilter: "blur(20px) saturate(160%)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div
          className="travail-container"
          style={{
            height: 64,
            display: "flex",
            alignItems: "center",
            gap: 28,
          }}
        >
          <Link
            href="/"
            style={{
              display: "flex",
              alignItems: "center",
              flexShrink: 0,
              textDecoration: "none",
            }}
          >
            <LogoMark />
          </Link>

          <nav
            className="travail-nav-desktop"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
          >
            {NAV.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href));
              if (it.disabled) {
                return (
                  <span
                    key={it.href}
                    style={{
                      padding: "8px 12px",
                      borderRadius: 8,
                      fontSize: 13.5,
                      fontWeight: 500,
                      color: "var(--fg-faint)",
                      cursor: "default",
                      opacity: 0.55,
                    }}
                  >
                    {it.label}
                  </span>
                );
              }
              return (
                <Link
                  key={it.href}
                  href={it.href}
                  style={{
                    padding: "8px 12px",
                    borderRadius: 8,
                    fontSize: 13.5,
                    fontWeight: 500,
                    color: active ? "var(--fg)" : "var(--fg-muted)",
                    background: active ? "var(--bg-elev-2)" : "transparent",
                    transition: "all var(--dur-fast)",
                    textDecoration: "none",
                  }}
                >
                  {it.label}
                </Link>
              );
            })}
          </nav>

          <div style={{ flex: 1 }} />

          {/* ⌘K search trigger */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="travail-cmd-trigger"
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              width: 240,
              height: 36,
              padding: "0 10px 0 12px",
              background: "var(--bg-elev-2)",
              border: "1px solid var(--border)",
              borderRadius: 10,
              color: "var(--fg-muted)",
              fontSize: 13,
              fontFamily: "var(--font-sans)",
              cursor: "pointer",
              transition: "border var(--dur-fast)",
            }}
            onMouseEnter={(e) =>
              (e.currentTarget.style.borderColor = "var(--border-strong)")
            }
            onMouseLeave={(e) =>
              (e.currentTarget.style.borderColor = "var(--border)")
            }
          >
            <Icons.Search size={14} />
            <span style={{ flex: 1, textAlign: "left" }}>Rechercher…</span>
            <kbd
              style={{
                fontFamily: "var(--font-mono)",
                fontSize: 11,
                padding: "2px 6px",
                borderRadius: 5,
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
              }}
            >
              ⌘K
            </kbd>
          </button>

          <ThemeButton />

          <button
            type="button"
            aria-label="Notifications"
            style={{
              position: "relative",
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-elev-1)",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--fg-muted)",
            }}
          >
            <Icons.Bell size={15} />
            <span
              style={{
                position: "absolute",
                top: 6,
                right: 6,
                width: 7,
                height: 7,
                borderRadius: 999,
                background: "var(--brand-ember)",
                border: "1.5px solid var(--bg-elev-1)",
              }}
            />
          </button>

          <UserButton />

          <button
            type="button"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
            className="travail-nav-mobile-trigger"
            style={{
              width: 36,
              height: 36,
              borderRadius: 10,
              border: "1px solid var(--border)",
              background: "var(--bg-elev-1)",
              display: "none",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "var(--fg-muted)",
            }}
          >
            {mobileOpen ? <Icons.Close size={15} /> : <Icons.Menu size={15} />}
          </button>
        </div>

        {mobileOpen && (
          <div
            className="travail-nav-mobile-panel"
            style={{
              borderTop: "1px solid var(--border)",
              background: "var(--bg-elev-1)",
            }}
          >
            <nav
              className="travail-container"
              style={{
                padding: "12px 32px",
                display: "flex",
                flexDirection: "column",
                gap: 4,
              }}
            >
              {NAV.map((it) =>
                it.disabled ? (
                  <span
                    key={it.href}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--fg-faint)",
                      opacity: 0.55,
                    }}
                  >
                    {it.label}
                  </span>
                ) : (
                  <Link
                    key={it.href}
                    href={it.href}
                    onClick={() => setMobileOpen(false)}
                    style={{
                      padding: "10px 12px",
                      borderRadius: 8,
                      fontSize: 14,
                      fontWeight: 500,
                      color: "var(--fg)",
                      textDecoration: "none",
                    }}
                  >
                    {it.label}
                  </Link>
                ),
              )}
            </nav>
          </div>
        )}

        <style>{`
          @media (max-width: 1100px) {
            .travail-cmd-trigger { width: 180px !important; }
            .travail-user-btn span:first-child { display: none !important; }
          }
          @media (max-width: 900px) {
            .travail-nav-desktop { display: none !important; }
            .travail-cmd-trigger { display: none !important; }
            .travail-nav-mobile-trigger { display: inline-flex !important; }
          }
          @media (min-width: 901px) {
            .travail-nav-mobile-panel { display: none !important; }
          }
        `}</style>
      </header>

      <CommandPalette open={cmdOpen} onClose={() => setCmdOpen(false)} />
    </>
  );
}
