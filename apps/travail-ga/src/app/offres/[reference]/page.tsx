/**
 * Détail d'offre TRAVAIL.GA — design éditorial.
 *
 * Source : Claude Design `c2f97b31` DetailScreen.
 *  - Breadcrumb compact
 *  - Header : avatar 72 + badges (type / urgent / featured / verified) + titre H1
 *  - Meta grid 4 colonnes (contrat / lieu / rémunération / expérience)
 *  - Sections : Le poste / Missions / Profil recherché
 *  - Bandeau "Offre validée PNPE"
 *  - Sticky CTA panel à droite (matching + salaire + Postuler/Sauvegarder)
 *  - Antenne PNPE référente
 *
 * Données : `api.functions.pnpe.offresPubliques.getByReferenceEnriched`
 * (fallback `MOCK_OFFRES` par référence).
 */
"use client";

import { use, useState } from "react";
import Link from "next/link";
import { useQuery } from "convex/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icons } from "@/components/design/icons";
import {
  Avatar,
  Badge,
  Button,
  EmetteurPill,
  formatXAF,
} from "@/components/design/ui";
import { MOCK_OFFRES } from "@/lib/travail-mock-data";
import { PROVINCES, CONTRATS } from "@/lib/travail-constants";
import { api } from "@convex/_generated/api";

export default function OffreDetailPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference } = use(params);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const convex = useQuery(
    (api as any).functions?.pnpe?.offresPubliques?.getByReferenceEnriched,
    { reference },
  ) as Record<string, unknown> | null | undefined;

  // Fallback mock — par ref ou premier
  const fallback =
    MOCK_OFFRES.find((o) => o.ref === reference) ?? MOCK_OFFRES[0]!;
  const offre = convex
    ? mergeWithMock(convex, fallback, reference)
    : fallback;

  const province = PROVINCES.find((p) => p.code === offre.province)?.label;
  const [applied, setApplied] = useState(false);

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <SiteHeader />

      <main style={{ flex: 1, background: "var(--bg)" }}>
        {/* Breadcrumb */}
        <div style={{ borderBottom: "1px solid var(--border)" }}>
          <div
            className="travail-container"
            style={{
              padding: "14px 0",
              fontSize: 12.5,
              color: "var(--fg-subtle)",
            }}
          >
            <Link href="/" style={{ color: "inherit" }}>
              Accueil
            </Link>
            <Icons.ChevronR
              size={12}
              style={{
                display: "inline",
                margin: "0 6px",
                verticalAlign: -2,
              }}
            />
            <Link href="/offres" style={{ color: "inherit" }}>
              Catalogue
            </Link>
            <Icons.ChevronR
              size={12}
              style={{
                display: "inline",
                margin: "0 6px",
                verticalAlign: -2,
              }}
            />
            <span
              style={{
                color: "var(--fg-muted)",
                fontFamily: "var(--font-mono)",
              }}
            >
              {offre.ref}
            </span>
          </div>
        </div>

        <div
          className="travail-container travail-detail-grid"
          style={{
            padding: "32px 0 80px",
            display: "grid",
            gridTemplateColumns: "1.5fr 0.85fr",
            gap: 40,
            alignItems: "flex-start",
          }}
        >
          {/* LEFT — content */}
          <article>
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: 20,
                marginBottom: 28,
              }}
            >
              <Avatar logo={offre.logo} size={72} verified={offre.verified} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    flexWrap: "wrap",
                    gap: 8,
                    marginBottom: 12,
                  }}
                >
                  <EmetteurPill type={offre.type} size="md" />
                  {offre.featured && (
                    <Badge tone="gold" icon={<Icons.Star size={11} />}>
                      À la une
                    </Badge>
                  )}
                  {offre.urgent && (
                    <Badge tone="ember" icon={<Icons.Fire size={11} />}>
                      Urgent
                    </Badge>
                  )}
                  {offre.verified && (
                    <Badge tone="blue" icon={<Icons.ShieldCheck size={11} />}>
                      Vérifiée PNPE
                    </Badge>
                  )}
                </div>
                <h1
                  className="font-display"
                  style={{
                    margin: 0,
                    fontSize: "var(--t-h1)",
                    lineHeight: 0.98,
                    color: "var(--fg)",
                  }}
                >
                  {offre.titre}
                </h1>
                <div
                  style={{
                    marginTop: 14,
                    display: "flex",
                    alignItems: "center",
                    gap: 18,
                    color: "var(--fg-muted)",
                    fontSize: 14,
                    flexWrap: "wrap",
                  }}
                >
                  <span style={{ fontWeight: 550, color: "var(--fg)" }}>
                    {offre.employeurFull || offre.employeur}
                  </span>
                  <span>·</span>
                  <span
                    style={{
                      fontFamily: "var(--font-mono)",
                      fontSize: 12,
                      color: "var(--fg-subtle)",
                    }}
                  >
                    {offre.ref}
                  </span>
                </div>
              </div>
            </div>

            {/* meta grid 4 cols */}
            <div
              className="travail-meta-grid"
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(4, 1fr)",
                gap: 1,
                background: "var(--border)",
                borderRadius: 12,
                overflow: "hidden",
                marginBottom: 36,
                border: "1px solid var(--border)",
              }}
            >
              {[
                {
                  i: <Icons.Briefcase size={14} />,
                  l: "Contrat",
                  v: CONTRATS[offre.contrat] ?? offre.contrat,
                },
                {
                  i: <Icons.MapPin size={14} />,
                  l: "Lieu",
                  v: `${offre.ville}, ${province ?? offre.province}`,
                },
                {
                  i: <Icons.Wallet size={14} />,
                  l: "Rémunération",
                  v: offre.salaireMin
                    ? `${formatXAF(offre.salaireMin)}${offre.salaireMax ? `–${formatXAF(offre.salaireMax)}` : ""} ${offre.devise ?? "XAF"}`
                    : "Non précisée",
                },
                {
                  i: <Icons.Clock size={14} />,
                  l: "Expérience",
                  v: offre.experience || "—",
                },
              ].map((m, i) => (
                <div
                  key={i}
                  style={{
                    background: "var(--bg-elev-1)",
                    padding: "14px 18px",
                  }}
                >
                  <div
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 5,
                      fontSize: 11.5,
                      color: "var(--fg-subtle)",
                      marginBottom: 6,
                      textTransform: "uppercase",
                      letterSpacing: "0.04em",
                      fontWeight: 600,
                    }}
                  >
                    {m.i}
                    {m.l}
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: 550,
                      color: "var(--fg)",
                    }}
                  >
                    {m.v}
                  </div>
                </div>
              ))}
            </div>

            {offre.description && (
              <>
                <h2
                  className="font-display"
                  style={{
                    fontSize: "var(--t-h3)",
                    margin: "0 0 12px",
                  }}
                >
                  Le poste
                </h2>
                <p
                  style={{
                    fontSize: 15,
                    lineHeight: 1.65,
                    color: "var(--fg)",
                    margin: "0 0 28px",
                  }}
                >
                  {offre.description}
                </p>
              </>
            )}

            {offre.missions && offre.missions.length > 0 && (
              <>
                <h2
                  className="font-display"
                  style={{
                    fontSize: "var(--t-h3)",
                    margin: "0 0 14px",
                  }}
                >
                  Missions principales
                </h2>
                <ul style={{ margin: "0 0 28px", padding: 0, listStyle: "none" }}>
                  {offre.missions.map((m, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 14,
                        padding: "10px 0",
                        borderBottom: "1px dashed var(--border-faint)",
                      }}
                    >
                      <div
                        style={{
                          flexShrink: 0,
                          width: 22,
                          height: 22,
                          borderRadius: 999,
                          background: "var(--brand-blue-50)",
                          color: "var(--brand-blue)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontFamily: "var(--font-mono)",
                          fontSize: 11,
                          fontWeight: 600,
                        }}
                      >
                        {i + 1}
                      </div>
                      <span
                        style={{
                          fontSize: 14.5,
                          lineHeight: 1.55,
                          color: "var(--fg)",
                        }}
                      >
                        {m}
                      </span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            {offre.profil && offre.profil.length > 0 && (
              <>
                <h2
                  className="font-display"
                  style={{
                    fontSize: "var(--t-h3)",
                    margin: "0 0 14px",
                    letterSpacing: "-0.01em",
                  }}
                >
                  Profil recherché
                </h2>
                <ul
                  style={{ margin: "0 0 28px", padding: 0, listStyle: "none" }}
                >
                  {offre.profil.map((m, i) => (
                    <li
                      key={i}
                      style={{
                        display: "flex",
                        gap: 12,
                        padding: "8px 0",
                        fontSize: 14.5,
                        color: "var(--fg)",
                        alignItems: "flex-start",
                      }}
                    >
                      <Icons.Check
                        size={16}
                        style={{
                          color: "var(--brand-emerald)",
                          marginTop: 2,
                          flexShrink: 0,
                        }}
                      />
                      <span style={{ lineHeight: 1.55 }}>{m}</span>
                    </li>
                  ))}
                </ul>
              </>
            )}

            <div
              style={{
                marginTop: 36,
                padding: 20,
                background: "var(--brand-blue-50)",
                borderRadius: 12,
                border: "1px solid var(--brand-blue-100)",
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <Icons.ShieldCheck
                size={20}
                style={{ color: "var(--brand-blue)", marginTop: 2, flexShrink: 0 }}
              />
              <div>
                <div
                  style={{
                    fontWeight: 600,
                    fontSize: 14,
                    color: "var(--brand-blue-700)",
                    marginBottom: 4,
                  }}
                >
                  Offre validée par le PNPE
                </div>
                <div
                  style={{
                    fontSize: 13,
                    color: "var(--fg-muted)",
                    lineHeight: 1.55,
                  }}
                >
                  L&apos;employeur a été vérifié (NIF, statuts, conformité Code
                  du Travail). Cette offre respecte le SMIG gabonais et les
                  conditions légales d&apos;embauche.
                </div>
              </div>
            </div>
          </article>

          {/* RIGHT — sticky CTA */}
          <aside
            className="travail-detail-aside"
            style={{
              position: "sticky",
              top: 92,
              alignSelf: "flex-start",
            }}
          >
            <div
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: 24,
                marginBottom: 16,
                boxShadow: "var(--shadow-2)",
              }}
            >
              {offre.matching != null && (
                <div
                  style={{
                    marginBottom: 18,
                    paddingBottom: 18,
                    borderBottom: "1px solid var(--border-faint)",
                  }}
                >
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      marginBottom: 8,
                    }}
                  >
                    <span
                      style={{
                        fontSize: 11.5,
                        fontWeight: 600,
                        color: "var(--fg-subtle)",
                        letterSpacing: "0.05em",
                        textTransform: "uppercase",
                      }}
                    >
                      Matching
                    </span>
                    <span
                      className="font-display"
                      style={{
                        fontSize: 30,
                        color:
                          offre.matching >= 85
                            ? "var(--brand-emerald)"
                            : "var(--brand-blue)",
                      }}
                    >
                      <span className="tnum">{offre.matching}</span>
                      <span style={{ fontSize: 16 }}>%</span>
                    </span>
                  </div>
                  <div
                    style={{
                      height: 6,
                      borderRadius: 4,
                      background: "var(--bg-elev-2)",
                      overflow: "hidden",
                    }}
                  >
                    <div
                      style={{
                        width: `${offre.matching}%`,
                        height: "100%",
                        background:
                          offre.matching >= 85
                            ? "var(--brand-emerald)"
                            : "var(--brand-blue)",
                        borderRadius: 4,
                      }}
                    />
                  </div>
                  <p
                    style={{
                      margin: "10px 0 0",
                      fontSize: 12,
                      color: "var(--fg-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    Basé sur votre profil D.E (NIP vérifié), votre expérience et
                    vos préférences.
                  </p>
                </div>
              )}

              <div
                style={{ fontSize: 12, color: "var(--fg-muted)", marginBottom: 4 }}
              >
                Rémunération brute mensuelle
              </div>
              <div
                className="font-display"
                style={{
                  fontSize: 32,
                  color: "var(--fg)",
                  marginBottom: 20,
                }}
              >
                {offre.salaireMin
                  ? `${formatXAF(offre.salaireMin)}${offre.salaireMax ? `–${formatXAF(offre.salaireMax)}` : ""}`
                  : "—"}
                <span
                  style={{
                    fontSize: 14,
                    color: "var(--fg-muted)",
                    marginLeft: 4,
                  }}
                >
                  {offre.devise ?? "XAF"}
                </span>
              </div>

              <Link
                href={`/postuler/${offre.ref}`}
                style={{ textDecoration: "none", display: "block" }}
              >
                <Button
                  size="lg"
                  style={{ width: "100%", marginBottom: 8 }}
                  icon={applied ? <Icons.CheckCircle size={16} /> : undefined}
                  onClick={() => setApplied(true)}
                  variant={applied ? "secondary" : "primary"}
                >
                  {applied ? "Candidature envoyée" : "Postuler à cette offre"}
                </Button>
              </Link>
              <Button
                size="md"
                variant="ghost"
                style={{ width: "100%" }}
                icon={<Icons.Bookmark size={14} />}
              >
                Sauvegarder
              </Button>

              <div
                style={{
                  marginTop: 20,
                  paddingTop: 20,
                  borderTop: "1px solid var(--border-faint)",
                  fontSize: 12.5,
                  color: "var(--fg-muted)",
                }}
              >
                <Row label="Publiée" value={offre.poste} />
                <Row
                  label="Candidatures reçues"
                  value={
                    <span className="tnum" style={{ fontWeight: 550 }}>
                      {offre.candidats}
                    </span>
                  }
                />
                {offre.secteur && <Row label="Secteur" value={offre.secteur} />}
              </div>
            </div>

            {/* Antenne PNPE référente */}
            <div
              style={{
                background: "var(--bg-elev-2)",
                borderRadius: "var(--r-lg)",
                padding: 18,
                fontSize: 13,
              }}
            >
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <Icons.Landmark
                  size={14}
                  style={{ color: "var(--brand-emerald)" }}
                />
                <span style={{ fontWeight: 600, color: "var(--fg)" }}>
                  Antenne PNPE référente
                </span>
              </div>
              <div style={{ color: "var(--fg-muted)", lineHeight: 1.5 }}>
                {offre.ville} · Permanence Lun–Ven 8h–16h ·{" "}
                <Link
                  href="/antennes"
                  style={{ color: "var(--brand-blue)" }}
                >
                  Voir contact
                </Link>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <style>{`
        @media (max-width: 980px) {
          .travail-detail-grid { grid-template-columns: 1fr !important; }
          .travail-detail-aside { position: static !important; }
          .travail-meta-grid { grid-template-columns: 1fr 1fr !important; }
        }
        @media (max-width: 540px) {
          .travail-meta-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteFooter />
    </div>
  );
}

function Row({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        padding: "4px 0",
      }}
    >
      <span>{label}</span>
      <span style={{ color: "var(--fg)" }}>{value}</span>
    </div>
  );
}

// Fusionne la réponse Convex avec le mock pour ne jamais avoir d'affichage cassé.
function mergeWithMock(
  convex: Record<string, unknown>,
  fallback: import("@/components/design/job-card").OffreCard,
  reference: string,
): import("@/components/design/job-card").OffreCard {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const c = convex as any;
  return {
    ...fallback,
    id: c._id ?? fallback.id,
    ref: c.reference ?? reference,
    titre: c.titre ?? fallback.titre,
    description: c.description ?? fallback.description,
    type: (c.typeEmployeur ?? fallback.type) as typeof fallback.type,
    contrat: (c.contrat ?? c.typeContrat ?? fallback.contrat) as typeof fallback.contrat,
    ville: c.lieuTravail?.ville ?? fallback.ville,
    province: (c.lieuTravail?.province ?? fallback.province) as typeof fallback.province,
    salaireMin: c.salaire?.min ?? fallback.salaireMin,
    salaireMax: c.salaire?.max ?? fallback.salaireMax,
    devise: c.salaire?.devise ?? fallback.devise,
    candidats: c.nbCandidatures ?? fallback.candidats,
    employeur:
      c.employeurInfo?.raisonSociale ??
      c.orgInfo?.nom ??
      (c.particulierInfo
        ? `${c.particulierInfo.prenoms} ${c.particulierInfo.nom}`
        : fallback.employeur),
    employeurFull:
      c.employeurInfo?.raisonSociale ??
      c.orgInfo?.nom ??
      fallback.employeurFull,
    verified: c.employeurInfo?.verified ?? fallback.verified,
  };
}
