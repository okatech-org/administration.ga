/**
 * Footer TRAVAIL.GA — design éditorial.
 * Grille 4 colonnes : brand + Plateforme + Ressources + Écosystème.
 * Source : design Claude `app.jsx` (Footer).
 */
import Link from "next/link";

type FooterCol = {
  title: string;
  links: { label: string; href: string; external?: boolean }[];
};

const COLS: FooterCol[] = [
  {
    title: "Plateforme",
    links: [
      { label: "Catalogue d'offres", href: "/offres" },
      { label: "Publier une annonce", href: "/publier-annonce" },
      { label: "7 antennes PNPE", href: "/antennes" },
      {
        label: "Programme Auto-Emploi",
        href: "https://emploi.administration.ga/auto-emploi/presentation",
        external: true,
      },
    ],
  },
  {
    title: "Ressources",
    links: [
      { label: "Statistiques publiques", href: "/statistiques" },
      { label: "Code du Travail", href: "/code-du-travail" },
      { label: "Conditions d'embauche", href: "/conditions-embauche" },
      { label: "FAQ", href: "/faq" },
    ],
  },
  {
    title: "Écosystème",
    links: [
      { label: "PNPE.GA", href: "https://emploi.administration.ga", external: true },
      { label: "DEMARCHE.GA", href: "https://demarche.ga", external: true },
      {
        label: "ADMINISTRATION.GA",
        href: "https://administration.ga",
        external: true,
      },
      {
        label: "ANPI-Gabon",
        href: "https://anpi-gabon.com",
        external: true,
      },
    ],
  },
];

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
          fontSize: 21,
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

export function SiteFooter() {
  return (
    <footer
      style={{
        borderTop: "1px solid var(--border)",
        background: "var(--bg-elev-1)",
        marginTop: 40,
      }}
    >
      <div
        className="travail-container"
        style={{
          display: "grid",
          gridTemplateColumns: "1.5fr 1fr 1fr 1fr",
          gap: 48,
          padding: "48px 0 32px",
        }}
      >
        <div>
          <div style={{ marginBottom: 16 }}>
            <LogoMark />
          </div>
          <p
            style={{
              margin: 0,
              fontSize: 13,
              color: "var(--fg-muted)",
              lineHeight: 1.55,
              maxWidth: 360,
            }}
          >
            Marché de l&apos;emploi gabonais — offres validées par le PNPE,
            opérateur public sous tutelle du Ministère du Travail.
            <br />
            <br />
            Partenariat technique ANINF · Protocole 17 février 2025.
          </p>
        </div>
        {COLS.map((col) => (
          <div key={col.title}>
            <h4
              style={{
                margin: "0 0 14px",
                fontSize: 12,
                textTransform: "uppercase",
                letterSpacing: "0.07em",
                color: "var(--fg-subtle)",
                fontWeight: 600,
              }}
            >
              {col.title}
            </h4>
            <ul
              style={{
                margin: 0,
                padding: 0,
                listStyle: "none",
                display: "flex",
                flexDirection: "column",
                gap: 9,
              }}
            >
              {col.links.map((l) =>
                l.external ? (
                  <li key={l.label}>
                    <a
                      href={l.href}
                      target="_blank"
                      rel="noreferrer"
                      style={{
                        fontSize: 13,
                        color: "var(--fg-muted)",
                        textDecoration: "none",
                      }}
                    >
                      {l.label}
                    </a>
                  </li>
                ) : (
                  <li key={l.label}>
                    <Link
                      href={l.href}
                      style={{
                        fontSize: 13,
                        color: "var(--fg-muted)",
                        textDecoration: "none",
                      }}
                    >
                      {l.label}
                    </Link>
                  </li>
                ),
              )}
            </ul>
          </div>
        ))}
      </div>
      <div style={{ borderTop: "1px solid var(--border-faint)" }}>
        <div
          className="travail-container"
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            padding: "16px 0",
            fontSize: 12,
            color: "var(--fg-subtle)",
            flexWrap: "wrap",
            gap: 10,
          }}
        >
          <span>
            © {new Date().getFullYear()} Pôle National de Promotion de
            l&apos;Emploi — République Gabonaise
          </span>
          <div style={{ display: "flex", gap: 16 }}>
            <Link href="/mentions-legales" style={{ color: "inherit" }}>
              Mentions légales
            </Link>
            <Link href="/confidentialite" style={{ color: "inherit" }}>
              Confidentialité
            </Link>
            <Link href="/accessibilite" style={{ color: "inherit" }}>
              Accessibilité
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
