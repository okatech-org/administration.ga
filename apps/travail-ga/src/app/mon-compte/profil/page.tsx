"use client";

/**
 * Mon profil — TRAVAIL.GA.
 *
 * Vitrine du profil candidat (lecture seule sur TRAVAIL.GA). Les
 * informations sont fédérées via Better Auth et complétées par PNPE.GA
 * (CV, compétences, expériences). Cet écran propose une synthèse +
 * deeplink vers le profil complet sur PNPE.GA pour édition.
 */

import Link from "next/link";
import { authClient } from "@/lib/auth-client";
import { pnpeLink } from "@/lib/utils";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";

function CompletionBar({ value }: { value: number }) {
  const v = Math.max(0, Math.min(100, value));
  return (
    <div
      style={{
        height: 6,
        borderRadius: 999,
        background: "var(--bg-elev-2)",
        overflow: "hidden",
        position: "relative",
      }}
    >
      <div
        style={{
          position: "absolute",
          inset: 0,
          width: `${v}%`,
          background: "var(--brand-emerald)",
          borderRadius: 999,
          transition: "width var(--dur-base) var(--ease-out)",
        }}
      />
    </div>
  );
}

function ProfilSection({
  title,
  hint,
  icon,
  status,
  ctaLabel,
  ctaHref,
  children,
}: {
  title: string;
  hint?: string;
  icon: React.ReactNode;
  status: "vide" | "partiel" | "complet";
  ctaLabel?: string;
  ctaHref?: string;
  children?: React.ReactNode;
}) {
  const statusBadge =
    status === "complet" ? (
      <Badge tone="emerald" icon={<Icons.Check size={11} />}>
        Complet
      </Badge>
    ) : status === "partiel" ? (
      <Badge tone="ember">En cours</Badge>
    ) : (
      <Badge tone="neutral">À renseigner</Badge>
    );

  return (
    <section
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 20,
      }}
    >
      <header
        style={{
          display: "flex",
          alignItems: "center",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div
          style={{
            width: 36,
            height: 36,
            borderRadius: 9,
            background: "var(--bg-elev-2)",
            color: "var(--brand-blue)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexShrink: 0,
          }}
        >
          {icon}
        </div>
        <div style={{ flex: 1, minWidth: 0 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              letterSpacing: "-0.01em",
              color: "var(--fg)",
            }}
          >
            {title}
          </h3>
          {hint && (
            <div
              style={{ fontSize: 12.5, color: "var(--fg-muted)", marginTop: 2 }}
            >
              {hint}
            </div>
          )}
        </div>
        {statusBadge}
      </header>

      {children}

      {ctaLabel && ctaHref && (
        <div style={{ marginTop: 14 }}>
          <a href={ctaHref} style={{ textDecoration: "none" }}>
            <Button
              variant="secondary"
              size="sm"
              iconRight={<Icons.ArrowUR size={12} />}
            >
              {ctaLabel}
            </Button>
          </a>
        </div>
      )}
    </section>
  );
}

export default function MonProfilPage() {
  const { data: session, isPending } = authClient.useSession();
  const isAuthed = !!session?.user;
  const userName = session?.user?.name ?? null;
  const userEmail = session?.user?.email ?? null;

  if (isPending) {
    return (
      <div style={{ color: "var(--fg-muted)", fontSize: 14 }}>Chargement…</div>
    );
  }

  if (!isAuthed) {
    return (
      <div
        style={{
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 36,
          textAlign: "center",
        }}
      >
        <Icons.User
          size={36}
          style={{ color: "var(--fg-subtle)", margin: "0 auto 12px" }}
        />
        <h2
          className="font-display"
          style={{ margin: "0 0 8px", fontSize: 22 }}
        >
          Connectez-vous pour voir votre profil
        </h2>
        <p
          style={{
            margin: "0 0 20px",
            color: "var(--fg-muted)",
            fontSize: 14,
          }}
        >
          Le profil est rattaché à votre identité Better Auth.
        </p>
        <Link href="/mon-compte" style={{ textDecoration: "none" }}>
          <Button>Aller à l&apos;accueil compte</Button>
        </Link>
      </div>
    );
  }

  // Sur TRAVAIL.GA, on n'a pas le détail CV/compétences. On affiche
  // un état placeholder cohérent et on propose la migration PNPE.
  const completion = userName ? 25 : 10;

  return (
    <>
      <div style={{ marginBottom: 28 }}>
        <Badge
          tone="blue"
          icon={<Icons.User size={11} />}
          style={{ marginBottom: 12 }}
        >
          Profil candidat
        </Badge>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1.05 }}
        >
          Mon profil
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-muted)",
            fontSize: 14.5,
            maxWidth: 580,
          }}
        >
          Complétez votre profil pour augmenter vos chances. Les recruteurs
          consultent ces informations lors de leur sourcing.
        </p>
      </div>

      {/* Carte progression */}
      <section
        style={{
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          padding: 22,
          marginBottom: 18,
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 12,
            gap: 16,
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
              Complétion globale
            </div>
            <div
              className="font-display"
              style={{
                fontSize: 32,
                fontWeight: 900,
                letterSpacing: "-0.03em",
                lineHeight: 1,
              }}
            >
              {completion}%
            </div>
          </div>
          <a href={pnpeLink("/demandeur/profil")} style={{ textDecoration: "none" }}>
            <Button iconRight={<Icons.ArrowUR size={14} />}>
              Compléter sur PNPE.GA
            </Button>
          </a>
        </div>
        <CompletionBar value={completion} />
        <p
          style={{
            marginTop: 12,
            fontSize: 12.5,
            color: "var(--fg-subtle)",
            lineHeight: 1.5,
          }}
        >
          Migrer vers un compte Demandeur d&apos;Emploi PNPE pour débloquer le
          CV intelligent, les compétences validées et le matching IA.
        </p>
      </section>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 14,
        }}
        className="travail-profil-grid"
      >
        <ProfilSection
          title="Identité"
          hint="Nom, email, téléphone"
          icon={<Icons.User size={18} />}
          status={userName ? "partiel" : "vide"}
        >
          <dl
            style={{
              margin: 0,
              display: "grid",
              gap: 8,
              fontSize: 13.5,
              color: "var(--fg)",
            }}
          >
            <div>
              <dt
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: 2,
                }}
              >
                Nom complet
              </dt>
              <dd style={{ margin: 0 }}>
                {userName ?? (
                  <span style={{ color: "var(--fg-faint)" }}>Non renseigné</span>
                )}
              </dd>
            </div>
            <div>
              <dt
                style={{
                  fontSize: 11,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginBottom: 2,
                }}
              >
                Email
              </dt>
              <dd style={{ margin: 0 }}>
                {userEmail ?? (
                  <span style={{ color: "var(--fg-faint)" }}>Non renseigné</span>
                )}
              </dd>
            </div>
          </dl>
        </ProfilSection>

        <ProfilSection
          title="CV"
          hint="Document PDF + scoring automatique"
          icon={<Icons.FileText size={18} />}
          status="vide"
          ctaLabel="Téléverser sur PNPE.GA"
          ctaHref={pnpeLink("/demandeur/cv")}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            Importez votre CV pour activer le matching automatique avec les
            offres publiées par les recruteurs.
          </p>
        </ProfilSection>

        <ProfilSection
          title="Compétences"
          hint="Référentiel PNPE — 5 niveaux"
          icon={<Icons.Sparkles size={18} />}
          status="vide"
          ctaLabel="Configurer sur PNPE.GA"
          ctaHref={pnpeLink("/demandeur/competences")}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            Déclarez vos compétences depuis le référentiel ROME pour apparaître
            dans les recherches recruteurs.
          </p>
        </ProfilSection>

        <ProfilSection
          title="Expériences"
          hint="Postes occupés + missions"
          icon={<Icons.Briefcase size={18} />}
          status="vide"
          ctaLabel="Saisir mes expériences"
          ctaHref={pnpeLink("/demandeur/experiences")}
        >
          <p
            style={{
              margin: 0,
              fontSize: 13.5,
              color: "var(--fg-muted)",
              lineHeight: 1.5,
            }}
          >
            Listez vos postes précédents, formations et certifications.
          </p>
        </ProfilSection>
      </div>

      <div
        style={{
          marginTop: 20,
          padding: 18,
          background: "var(--brand-blue-50)",
          border: "1px solid var(--brand-blue-50)",
          borderRadius: "var(--r-card)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          color: "var(--brand-blue)",
        }}
      >
        <Icons.Shield size={22} style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: 13.5, lineHeight: 1.5 }}>
          <strong>Vos données restent à vous.</strong> Conformément à la
          politique de confidentialité, vous pouvez à tout moment exporter ou
          supprimer votre profil depuis les{" "}
          <Link
            href="/mon-compte/parametres"
            style={{
              color: "inherit",
              fontWeight: 600,
              textDecoration: "underline",
            }}
          >
            paramètres du compte
          </Link>
          .
        </div>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .travail-profil-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
