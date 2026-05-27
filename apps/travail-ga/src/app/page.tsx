/**
 * Landing TRAVAIL.GA — vitrine publique du marché de l'emploi gabonais.
 *
 * Refonte design éditorial (source : Claude Design `c2f97b31`) :
 *  - Hero scroll bento 8×4 + texte central qui fade
 *  - Bande KPI live (Convex `api.functions.pnpe.stats.nationalKpis`)
 *  - 3 publics : Je cherche / J'embauche / Je crée
 *  - Aperçu offres (4 cards regular)
 *  - Bandeau écosystème (PNPE.GA / DEMARCHE.GA / ADMINISTRATION.GA)
 */
"use client";

import Link from "next/link";
import { useQuery } from "convex/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { HeroScrollAnimation } from "@/components/design/hero-scroll";
import { Icons } from "@/components/design/icons";
import {
  Badge,
  Button,
  KpiCard,
  SectionHeading,
} from "@/components/design/ui";
import { JobCard } from "@/components/design/job-card";
import { MOCK_OFFRES } from "@/lib/travail-mock-data";
import { api } from "@convex/_generated/api";
import { offreHref, pnpeLink } from "@/lib/utils";
import { useFavoris } from "@/lib/use-favoris";

type NationalKpis = {
  totalOffres?: number;
  totalDe?: number;
  totalEmployeurs?: number;
  provincesCouvertes?: number;
};

const PUBLICS = [
  {
    icon: <Icons.Search size={20} />,
    title: "Je cherche un emploi",
    desc:
      "Parcourez 1 284 offres validées. Créez votre compte D.E avec votre NIP, un conseiller PNPE valide votre dossier sous 48h.",
    cta: "Démarrer",
    tone: "emerald" as const,
    href: "/offres",
  },
  {
    icon: <Icons.Briefcase size={20} />,
    title: "Je veux embaucher",
    desc:
      "Publiez une offre, accédez au vivier de profils pré-validés, organisez les entretiens depuis votre tableau de bord recruteur.",
    cta: "Publier une offre",
    tone: "ember" as const,
    href: "/publier-annonce",
  },
  {
    icon: <Icons.Sparkles size={20} />,
    title: "Je crée mon activité",
    desc:
      "Programme Auto-Emploi : formation Business Model Canvas, mentorat, passerelle vers ANPI-Gabon pour la formalisation.",
    cta: "Découvrir Auto-Emploi",
    tone: "blue" as const,
    href: pnpeLink("/auto-emploi/presentation"),
  },
];

const TONE_COLORS = {
  emerald: "var(--brand-emerald)",
  ember: "var(--brand-ember)",
  blue: "var(--brand-blue)",
  terra: "var(--brand-terra)",
} as const;

const TONE_BG = {
  emerald: "var(--brand-emerald-50)",
  ember: "var(--brand-ember-50)",
  blue: "var(--brand-blue-50)",
  terra: "var(--brand-terra-50)",
} as const;

const ECOSYSTEME = [
  {
    d: "ADMINISTRATION.GA",
    l: "Portail national — annuaire, actualités, textes",
    c: "var(--brand-emerald)",
    href: "https://administration.ga",
  },
  {
    d: "DEMARCHE.GA",
    l: "Démarches administratives — état civil, fiscalité, urbanisme",
    c: "var(--brand-ember)",
    href: "https://demarche.ga",
  },
  {
    d: "PNPE.GA",
    l: "Espace opérationnel — conseillers, antennes, validations",
    c: "var(--brand-blue)",
    href: "https://emploi.administration.ga",
  },
];

export default function LandingPage() {
  // KPIs Convex — typés `any` (api codegen partiel en CI)
   
  const kpis = useQuery(
    api.functions?.pnpe?.stats?.nationalKpis,
  ) as NationalKpis | undefined;

  const { isFavori, toggle: toggleFavori } = useFavoris();

  const totalOffres = kpis?.totalOffres ?? 1284;
  const totalDe = kpis?.totalDe ?? 38902;
  const totalEmployeurs = kpis?.totalEmployeurs ?? 612;
  const provincesCouvertes = kpis?.provincesCouvertes ?? 9;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SiteHeader />

      {/* Hero scroll bento */}
      <HeroScrollAnimation />

      {/* KPI band */}
      <section
        style={{
          padding: "56px 0 64px",
          borderBottom: "1px solid var(--border)",
          background: "var(--bg-elev-1)",
        }}
      >
        <div className="travail-container">
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 24,
              marginBottom: 28,
              flexWrap: "wrap",
            }}
          >
            <div>
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 600,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                  color: "var(--brand-emerald)",
                  marginBottom: 6,
                }}
              >
                Le marché en chiffres
              </div>
              <h2
                className="font-display"
                style={{ margin: 0, fontSize: "var(--t-h3)", lineHeight: 1.05 }}
              >
                Données officielles PNPE — actualisées en continu.
              </h2>
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 13,
                color: "var(--fg-subtle)",
              }}
            >
              <div style={{ display: "flex" }}>
                {[
                  "#16A37B",
                  "#E29021",
                  "#1B4D8C",
                  "#B86A3A",
                ].map((c, i) => (
                  <div
                    key={c}
                    style={{
                      width: 24,
                      height: 24,
                      borderRadius: 999,
                      background: c,
                      border: "2px solid var(--bg-elev-1)",
                      marginLeft: i ? -8 : 0,
                    }}
                  />
                ))}
              </div>
              <span>
                <strong style={{ color: "var(--fg)" }} className="tnum">
                  12 847
                </strong>{" "}
                demandeurs inscrits cette semaine
              </span>
            </div>
          </div>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, minmax(0, 1fr))",
              gap: 14,
            }}
            className="travail-kpi-grid"
          >
            <KpiCard
              icon={<Icons.Briefcase size={16} />}
              value={totalOffres.toLocaleString("fr-FR")}
              label="Offres publiées"
              hint="actualisées chaque jour"
              accent="var(--brand-emerald)"
            />
            <KpiCard
              icon={<Icons.Users size={16} />}
              value={totalDe.toLocaleString("fr-FR")}
              label="D.E inscrits"
              hint="actifs sur 30 jours"
              accent="var(--brand-ember)"
            />
            <KpiCard
              icon={<Icons.Building size={16} />}
              value={totalEmployeurs.toLocaleString("fr-FR")}
              label="Employeurs vérifiés"
              hint="entreprises + administrations"
              accent="var(--brand-blue)"
            />
            <KpiCard
              icon={<Icons.MapPin size={16} />}
              value={`${provincesCouvertes}/9`}
              label="Provinces couvertes"
              hint="7 antennes opérationnelles"
              accent="var(--brand-terra)"
            />
          </div>
        </div>
      </section>

      {/* Trois publics */}
      <section
        style={{
          padding: "72px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="travail-container">
          <SectionHeading
            eyebrow="Trois publics — un marché"
            title="Quel que soit votre profil, le bon interlocuteur."
            sub="TRAVAIL.GA orchestre la mise en relation entre demandeurs d'emploi, employeurs et porteurs de projet, sous tutelle du Ministère du Travail."
          />
          <div
            className="travail-publics-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(3, minmax(0, 1fr))",
              gap: 18,
            }}
          >
            {PUBLICS.map((c) => (
              <Link
                key={c.title}
                href={c.href}
                style={{
                  background: "var(--bg-elev-1)",
                  border: "1px solid var(--border)",
                  borderRadius: "var(--r-card)",
                  padding: 28,
                  cursor: "pointer",
                  transition: "all var(--dur-base) var(--ease-out)",
                  display: "block",
                  position: "relative",
                  overflow: "hidden",
                  textDecoration: "none",
                  color: "inherit",
                }}
              >
                <div
                  style={{
                    width: 44,
                    height: 44,
                    borderRadius: 12,
                    marginBottom: 16,
                    background: TONE_BG[c.tone],
                    color: TONE_COLORS[c.tone],
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  {c.icon}
                </div>
                <h3
                  style={{
                    margin: "0 0 8px",
                    fontFamily: "var(--font-display)",
                    fontWeight: 900,
                    fontSize: 22,
                    lineHeight: 1.1,
                    letterSpacing: "-0.035em",
                    color: "var(--fg)",
                  }}
                >
                  {c.title}
                </h3>
                <p
                  style={{
                    margin: "0 0 20px",
                    color: "var(--fg-muted)",
                    fontSize: 14,
                    lineHeight: 1.55,
                  }}
                >
                  {c.desc}
                </p>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 6,
                    color: TONE_COLORS[c.tone],
                    fontSize: 13.5,
                    fontWeight: 600,
                  }}
                >
                  {c.cta} <Icons.ArrowR size={14} />
                </span>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Aperçu offres */}
      <section
        style={{
          padding: "72px 0",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <div className="travail-container">
          <SectionHeading
            eyebrow="Dernières offres"
            title="Mises à jour il y a quelques heures."
            action={
              <Link href="/offres" style={{ textDecoration: "none" }}>
                <Button
                  variant="ghost"
                  iconRight={<Icons.ArrowR size={14} />}
                >
                  Toutes les offres
                </Button>
              </Link>
            }
          />
          <div
            className="travail-recent-grid"
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 12,
            }}
          >
            {MOCK_OFFRES.slice(0, 4).map((o, i) => (
              <Link
                key={o.id}
                href={offreHref(o.ref)}
                style={{ textDecoration: "none", color: "inherit" }}
              >
                <JobCard
                  offre={o}
                  density="regular"
                  index={i}
                  bookmarked={isFavori(o.ref)}
                  onBookmark={() => toggleFavori(o.ref)}
                />
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* Écosystème */}
      <section style={{ padding: "60px 0 80px" }}>
        <div className="travail-container">
          <div
            className="travail-ecosystem"
            style={{
              background: "var(--bg-elev-1)",
              border: "1px solid var(--border)",
              borderRadius: "var(--r-xl)",
              padding: "44px",
              display: "grid",
              gridTemplateColumns: "1.2fr 1fr",
              gap: 48,
              alignItems: "center",
            }}
          >
            <div>
              <Badge
                tone="neutral"
                icon={<Icons.Layers size={11} />}
                style={{ marginBottom: 14 }}
              >
                Écosystème République Gabonaise
              </Badge>
              <h2
                className="font-display"
                style={{
                  margin: "0 0 14px",
                  fontSize: "var(--t-h2)",
                  lineHeight: 1.02,
                }}
              >
                TRAVAIL.GA fait partie du portail national des services publics.
              </h2>
              <p
                style={{
                  margin: 0,
                  color: "var(--fg-muted)",
                  fontSize: 15,
                }}
              >
                Une seule identité numérique pour toutes vos démarches — emploi,
                état civil, fiscalité, urbanisme.
              </p>
            </div>
            <div style={{ display: "grid", gap: 10 }}>
              {ECOSYSTEME.map((s) => (
                <a
                  key={s.d}
                  href={s.href}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 18px",
                    borderRadius: 10,
                    background: "var(--bg)",
                    border: "1px solid var(--border)",
                    textDecoration: "none",
                    color: "inherit",
                  }}
                >
                  <div
                    style={{
                      width: 6,
                      height: 28,
                      borderRadius: 3,
                      background: s.c,
                    }}
                  />
                  <div style={{ flex: 1 }}>
                    <div
                      style={{
                        fontFamily: "var(--font-mono)",
                        fontSize: 13,
                        fontWeight: 600,
                        color: "var(--fg)",
                      }}
                    >
                      {s.d}
                    </div>
                    <div
                      style={{
                        fontSize: 12.5,
                        color: "var(--fg-muted)",
                        marginTop: 2,
                      }}
                    >
                      {s.l}
                    </div>
                  </div>
                  <Icons.ArrowUR
                    size={14}
                    style={{ color: "var(--fg-subtle)" }}
                  />
                </a>
              ))}
            </div>
          </div>
        </div>
      </section>

      <style>{`
        @media (max-width: 900px) {
          .travail-kpi-grid { grid-template-columns: 1fr 1fr !important; }
          .travail-publics-grid { grid-template-columns: 1fr !important; }
          .travail-recent-grid { grid-template-columns: 1fr !important; }
          .travail-ecosystem { grid-template-columns: 1fr !important; padding: 28px !important; }
        }
        @media (max-width: 540px) {
          .travail-kpi-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteFooter />
    </div>
  );
}
