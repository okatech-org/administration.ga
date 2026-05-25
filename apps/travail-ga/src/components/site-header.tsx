"use client";

/**
 * Header TRAVAIL.GA — design éditorial.
 * - Bandeau institutionnel République Gabonaise (1 ligne)
 * - Header sticky avec logo T·.GA, nav, recherche ⌘K, theme switch, profil
 * Source : design Claude `app.jsx` (InstitutionalBandeau + Header).
 */

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { Icons } from "@/components/design/icons";
import { pnpeLink } from "@/lib/utils";

const NAV: { href: string; label: string }[] = [
  { href: "/offres", label: "Offres" },
  { href: "/publier-annonce", label: "Publier une annonce" },
  { href: "/antennes", label: "Antennes" },
  { href: "/statistiques", label: "Stats" },
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
          <span
            style={{
              color: "var(--brand-emerald)",
              fontWeight: 600,
            }}
          >
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

export function SiteHeader() {
  const pathname = usePathname() ?? "/";
  const [open, setOpen] = useState(false);

  return (
    <>
      <InstitutionalBandeau />
      <header
        style={{
          position: "sticky",
          top: 0,
          zIndex: 30,
          background:
            "color-mix(in oklab, var(--bg) 88%, transparent)",
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
            style={{
              display: "flex",
              alignItems: "center",
              gap: 2,
              flexShrink: 0,
            }}
            className="travail-nav-desktop"
          >
            {NAV.map((it) => {
              const active =
                pathname === it.href ||
                (it.href !== "/" && pathname.startsWith(it.href));
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
          </button>

          <a
            href={pnpeLink("/")}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              height: 36,
              padding: "0 14px",
              borderRadius: 10,
              background: "var(--brand-blue)",
              color: "#fff",
              fontSize: 13.5,
              fontWeight: 600,
              textDecoration: "none",
            }}
          >
            Mon espace PNPE
            <Icons.ArrowR size={13} />
          </a>

          <button
            type="button"
            onClick={() => setOpen(!open)}
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
            {open ? <Icons.Close size={15} /> : <Icons.Menu size={15} />}
          </button>
        </div>

        {open && (
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
              {NAV.map((it) => (
                <Link
                  key={it.href}
                  href={it.href}
                  onClick={() => setOpen(false)}
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
              ))}
            </nav>
          </div>
        )}

        <style>{`
          @media (max-width: 900px) {
            .travail-nav-desktop { display: none !important; }
            .travail-nav-mobile-trigger { display: inline-flex !important; }
          }
          @media (min-width: 901px) {
            .travail-nav-mobile-panel { display: none !important; }
          }
        `}</style>
      </header>
    </>
  );
}
