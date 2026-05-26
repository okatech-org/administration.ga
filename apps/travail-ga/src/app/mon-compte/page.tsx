/**
 * Mon compte — TRAVAIL.GA.
 *
 * Vue d'ensemble du compte. Deux états :
 *  - Non connecté → CTA PNPE.GA + indication "DEV switcher" en bas à gauche
 *    (en dev local uniquement).
 *  - Connecté (session Better Auth) → en-tête identité + KPIs placeholder
 *    + raccourcis vers /mon-compte/candidatures, /offres et PNPE.GA.
 *
 * Les workflows métier authentifiés (candidatures réelles, matching, messages
 * recruteurs) restent dans PNPE.GA. TRAVAIL.GA est une vitrine + transit
 * d'identité tant que `BMC Auto-Emploi` n'est pas câblé côté backoffice.
 */
"use client";

import Link from "next/link";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icons } from "@/components/design/icons";
import { Badge, Button, KpiCard } from "@/components/design/ui";
import { pnpeLink } from "@/lib/utils";
import { authClient } from "@/lib/auth-client";

function initialsFrom(name?: string | null, email?: string | null): string {
  const source = (name || email || "?").trim();
  if (!source) return "?";
  const parts = source.split(/[\s@.]+/).filter(Boolean);
  if (parts.length === 0) return source.slice(0, 2).toUpperCase();
  if (parts.length === 1) return parts[0]!.slice(0, 2).toUpperCase();
  return ((parts[0]?.[0] ?? "") + (parts[1]?.[0] ?? "")).toUpperCase();
}

export default function MonComptePage() {
  const { data: session, isPending } = authClient.useSession();
  const isAuthed = !!session?.user;
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;

  return (
    <div
      style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}
    >
      <SiteHeader />

      <main style={{ flex: 1, background: "var(--bg)" }}>
        <div
          className="travail-container"
          style={{ padding: "48px 0 80px" }}
        >
          <div style={{ marginBottom: 32 }}>
            <Badge
              tone={isAuthed ? "blue" : "emerald"}
              icon={<Icons.ShieldCheck size={11} />}
              style={{ marginBottom: 14 }}
            >
              {isAuthed
                ? "Session active · TRAVAIL.GA"
                : "Vitrine publique TRAVAIL.GA"}
            </Badge>
            <h1
              className="font-display"
              style={{
                margin: 0,
                fontSize: "var(--t-h1)",
                lineHeight: 0.96,
              }}
            >
              {isAuthed
                ? `Bonjour, ${userName?.split(" ")[0] ?? "Compte"}`
                : "Mon espace candidat"}
            </h1>
            <p
              style={{
                margin: "10px 0 0",
                color: "var(--fg-muted)",
                fontSize: 15,
                maxWidth: 640,
              }}
            >
              {isAuthed
                ? "Vous êtes connecté. Les workflows complets (matching IA, candidatures, suivi conseiller) restent sur PNPE.GA."
                : "Connectez-vous sur PNPE.GA pour gérer vos candidatures, suivre votre pipeline et accéder à votre profil D.E."}
            </p>
          </div>

          {/* Carte identité authentifiée OU CTA PNPE */}
          {isAuthed ? (
            <div
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: 28,
                marginBottom: 24,
                display: "grid",
                gridTemplateColumns: "auto 1fr auto",
                gap: 24,
                alignItems: "center",
                boxShadow: "var(--shadow-2)",
              }}
              className="travail-mon-compte-card"
            >
              <div
                style={{
                  width: 64,
                  height: 64,
                  borderRadius: 14,
                  background: "var(--brand-blue)",
                  color: "#fff",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 22,
                  letterSpacing: "-0.02em",
                }}
              >
                {initialsFrom(userName, userEmail)}
              </div>
              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--brand-blue)",
                    marginBottom: 6,
                  }}
                >
                  Identité fédérée
                </div>
                <h2
                  className="font-display"
                  style={{
                    margin: "0 0 4px",
                    fontSize: 22,
                    lineHeight: 1.1,
                    letterSpacing: "-0.02em",
                    overflow: "hidden",
                    textOverflow: "ellipsis",
                    whiteSpace: "nowrap",
                  }}
                >
                  {userName ?? userEmail ?? "Compte"}
                </h2>
                {userEmail && (
                  <div
                    style={{
                      fontSize: 13,
                      color: "var(--fg-muted)",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                      whiteSpace: "nowrap",
                    }}
                  >
                    {userEmail}
                  </div>
                )}
              </div>
              <a
                href={pnpeLink("/dashboard")}
                style={{ textDecoration: "none" }}
              >
                <Button
                  size="lg"
                  iconRight={<Icons.ArrowUR size={16} />}
                >
                  Ouvrir PNPE.GA
                </Button>
              </a>
            </div>
          ) : (
            <div
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-xl)",
                padding: 32,
                marginBottom: 24,
                display: "grid",
                gridTemplateColumns: "1fr auto",
                gap: 32,
                alignItems: "center",
                boxShadow: "var(--shadow-2)",
              }}
              className="travail-mon-compte-card"
            >
              <div>
                <div
                  style={{
                    fontSize: 11,
                    fontWeight: 600,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    color: "var(--brand-blue)",
                    marginBottom: 8,
                  }}
                >
                  Accès D.E
                </div>
                <h2
                  className="font-display"
                  style={{
                    margin: "0 0 10px",
                    fontSize: "var(--t-h2)",
                    lineHeight: 1.05,
                  }}
                >
                  Connectez-vous à PNPE.GA pour gérer votre dossier.
                </h2>
                <p
                  style={{
                    margin: 0,
                    color: "var(--fg-muted)",
                    fontSize: 15,
                    lineHeight: 1.55,
                    maxWidth: 560,
                  }}
                >
                  PNPE.GA est l&apos;espace opérationnel du Pôle National de
                  Promotion de l&apos;Emploi. Une fois connecté, vous y
                  retrouvez vos candidatures actives, votre matching IA et
                  votre antenne référente.
                </p>
                {!isPending &&
                  process.env.NODE_ENV !== "production" && (
                    <p
                      style={{
                        marginTop: 14,
                        fontSize: 12.5,
                        color: "var(--fg-faint)",
                      }}
                    >
                      Astuce dev : utilisez le bouton{" "}
                      <strong style={{ color: "var(--brand-emerald)" }}>
                        DEV
                      </strong>{" "}
                      en bas à droite pour basculer entre comptes de démo.
                    </p>
                  )}
              </div>
              <a
                href={pnpeLink("/auth/sign-in")}
                style={{ textDecoration: "none" }}
              >
                <Button size="lg" iconRight={<Icons.ArrowUR size={16} />}>
                  Aller sur PNPE.GA
                </Button>
              </a>
            </div>
          )}

          {/* Aperçu KPIs (placeholders — données réelles côté PNPE) */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4, 1fr)",
              gap: 14,
              marginBottom: 24,
            }}
            className="travail-mon-compte-kpis"
          >
            <KpiCard
              icon={<Icons.Briefcase size={16} />}
              value={isAuthed ? "0" : "—"}
              label="Candidatures actives"
              hint={isAuthed ? "Synchronisé avec PNPE" : "Visible après connexion"}
              accent="var(--brand-emerald)"
            />
            <KpiCard
              icon={<Icons.Eye size={16} />}
              value={isAuthed ? "0" : "—"}
              label="Vues du profil"
              hint="Sur 7 jours"
              accent="var(--brand-ember)"
            />
            <KpiCard
              icon={<Icons.Mail size={16} />}
              value={isAuthed ? "0" : "—"}
              label="Messages recruteurs"
              hint="Inbox PNPE"
              accent="var(--brand-blue)"
            />
            <KpiCard
              icon={<Icons.Sparkles size={16} />}
              value="—"
              label="Complétion profil"
              hint="CV + compétences"
              accent="var(--brand-terra)"
            />
          </div>

          {/* Accès rapides */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 14,
            }}
            className="travail-mon-compte-quick"
          >
            <Link
              href="/mon-compte/candidatures"
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-card)",
                padding: 24,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "all var(--dur-base) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-blue)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "var(--shadow-3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--brand-blue-50)",
                  color: "var(--brand-blue)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Icons.Layers size={18} />
              </div>
              <h3
                className="font-display"
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  letterSpacing: "-0.025em",
                }}
              >
                Mes candidatures
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                Suivez l&apos;avancement de vos postulations. Pipeline et
                statuts en temps réel.
              </p>
            </Link>

            <Link
              href="/offres"
              style={{
                background: "var(--bg-elev-1)",
                border: "1px solid var(--border)",
                borderRadius: "var(--r-card)",
                padding: 24,
                textDecoration: "none",
                color: "inherit",
                display: "block",
                transition: "all var(--dur-base) var(--ease-out)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.borderColor = "var(--brand-emerald)";
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.boxShadow = "var(--shadow-3)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.borderColor = "var(--border)";
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <div
                style={{
                  width: 40,
                  height: 40,
                  borderRadius: 10,
                  background: "var(--brand-emerald-50)",
                  color: "var(--brand-emerald)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  marginBottom: 14,
                }}
              >
                <Icons.Briefcase size={18} />
              </div>
              <h3
                className="font-display"
                style={{
                  margin: "0 0 6px",
                  fontSize: 18,
                  letterSpacing: "-0.025em",
                }}
              >
                Parcourir les offres
              </h3>
              <p
                style={{
                  margin: 0,
                  fontSize: 13.5,
                  color: "var(--fg-muted)",
                  lineHeight: 1.5,
                }}
              >
                Catalogue validé par le PNPE. Filtres par secteur, province,
                contrat.
              </p>
            </Link>
          </div>

          {isAuthed && (
            <div style={{ marginTop: 20 }}>
              <button
                type="button"
                onClick={async () => {
                  await authClient.signOut();
                  window.location.reload();
                }}
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 8,
                  height: 36,
                  padding: "0 14px",
                  borderRadius: 10,
                  background: "transparent",
                  border: "1px solid var(--border)",
                  color: "var(--fg-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                }}
              >
                Se déconnecter
              </button>
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 768px) {
          .travail-mon-compte-card { grid-template-columns: 1fr !important; }
          .travail-mon-compte-kpis { grid-template-columns: 1fr 1fr !important; }
          .travail-mon-compte-quick { grid-template-columns: 1fr !important; }
        }
        @media (max-width: 480px) {
          .travail-mon-compte-kpis { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteFooter />
    </div>
  );
}
