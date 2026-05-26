"use client";

/**
 * Paramètres — TRAVAIL.GA.
 *
 * Réglages du compte :
 *  - Identité fédérée (lecture seule, édition sur PNPE.GA)
 *  - Préférences notifications (toggles locaux)
 *  - Apparence (thème : géré par TravailThemeProvider via le header)
 *  - Zone danger : déconnexion + suppression compte (CTA PNPE)
 */

import { useState } from "react";
import { toast } from "sonner";
import { authClient } from "@/lib/auth-client";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";
import { useTheme } from "@/components/design/theme-provider";
import { pnpeLink } from "@/lib/utils";

function Card({
  title,
  hint,
  children,
}: {
  title: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 20,
        marginBottom: 14,
      }}
    >
      <header style={{ marginBottom: 14 }}>
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
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              color: "var(--fg-muted)",
            }}
          >
            {hint}
          </p>
        )}
      </header>
      {children}
    </section>
  );
}

function ToggleRow({
  label,
  hint,
  value,
  onChange,
}: {
  label: string;
  hint?: string;
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        padding: "10px 0",
        borderBottom: "1px solid var(--border-faint)",
        gap: 16,
      }}
    >
      <div style={{ minWidth: 0 }}>
        <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
          {label}
        </div>
        {hint && (
          <div
            style={{
              fontSize: 12.5,
              color: "var(--fg-muted)",
              marginTop: 2,
            }}
          >
            {hint}
          </div>
        )}
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={value}
        onClick={() => onChange(!value)}
        style={{
          width: 38,
          height: 22,
          borderRadius: 999,
          background: value ? "var(--brand-emerald)" : "var(--bg-elev-2)",
          border: "1px solid",
          borderColor: value ? "var(--brand-emerald)" : "var(--border)",
          position: "relative",
          cursor: "pointer",
          transition: "all var(--dur-fast)",
          flexShrink: 0,
        }}
      >
        <span
          style={{
            position: "absolute",
            top: 1,
            left: value ? 17 : 1,
            width: 18,
            height: 18,
            borderRadius: 999,
            background: "#fff",
            transition: "left var(--dur-fast) var(--ease-out)",
            boxShadow: "0 1px 2px rgba(0,0,0,0.15)",
          }}
        />
      </button>
    </div>
  );
}

export default function ParametresPage() {
  const { data: session, isPending } = authClient.useSession();
  const { theme, setTheme } = useTheme();
  const [signingOut, setSigningOut] = useState(false);

  // Préférences locales (placeholders — vraie persistance côté PNPE)
  const [prefs, setPrefs] = useState({
    emailMatching: true,
    emailMessages: true,
    smsMatching: false,
    smsCandidatures: false,
    weeklyDigest: true,
  });

  const updatePref = (key: keyof typeof prefs, value: boolean) => {
    setPrefs((s) => ({ ...s, [key]: value }));
    toast.success("Préférence enregistrée localement");
  };

  const handleSignOut = async () => {
    setSigningOut(true);
    try {
      await authClient.signOut();
      toast.success("Déconnecté avec succès");
      await new Promise((r) => setTimeout(r, 400));
      window.location.href = "/";
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      toast.error("Échec de la déconnexion", { description: m });
      setSigningOut(false);
    }
  };

  if (isPending) {
    return (
      <div style={{ color: "var(--fg-muted)", fontSize: 14 }}>Chargement…</div>
    );
  }

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Badge
          tone="neutral"
          icon={<Icons.Settings size={11} />}
          style={{ marginBottom: 12 }}
        >
          Paramètres du compte
        </Badge>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1.05 }}
        >
          Paramètres
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-muted)",
            fontSize: 14.5,
            maxWidth: 580,
          }}
        >
          Gérez vos préférences, votre confidentialité et votre session.
        </p>
      </div>

      <Card title="Compte" hint="Identifiants fédérés Better Auth">
        <dl style={{ margin: 0, display: "grid", gap: 12 }}>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <dt style={{ fontSize: 13, color: "var(--fg-muted)" }}>Nom</dt>
            <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>
              {session?.user?.name ?? "Non renseigné"}
            </dd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <dt style={{ fontSize: 13, color: "var(--fg-muted)" }}>Email</dt>
            <dd style={{ margin: 0, fontSize: 13.5, fontWeight: 500 }}>
              {session?.user?.email ?? "—"}
            </dd>
          </div>
          <div style={{ display: "flex", justifyContent: "space-between", gap: 12 }}>
            <dt style={{ fontSize: 13, color: "var(--fg-muted)" }}>Statut</dt>
            <dd style={{ margin: 0 }}>
              <Badge tone="emerald" icon={<Icons.ShieldCheck size={11} />}>
                Vérifié
              </Badge>
            </dd>
          </div>
        </dl>
        <div style={{ marginTop: 14 }}>
          <a href={pnpeLink("/demandeur/parametres")} style={{ textDecoration: "none" }}>
            <Button
              variant="secondary"
              size="sm"
              iconRight={<Icons.ArrowUR size={12} />}
            >
              Modifier sur PNPE.GA
            </Button>
          </a>
        </div>
      </Card>

      <Card
        title="Notifications par email"
        hint="Choisissez les alertes que vous souhaitez recevoir"
      >
        <ToggleRow
          label="Nouvelles offres correspondant à mon profil"
          hint="Recommandations basées sur le matching IA"
          value={prefs.emailMatching}
          onChange={(v) => updatePref("emailMatching", v)}
        />
        <ToggleRow
          label="Messages des recruteurs"
          hint="Lorsqu'un recruteur consulte ou contacte votre profil"
          value={prefs.emailMessages}
          onChange={(v) => updatePref("emailMessages", v)}
        />
        <ToggleRow
          label="Digest hebdomadaire"
          hint="Synthèse de votre activité tous les lundis"
          value={prefs.weeklyDigest}
          onChange={(v) => updatePref("weeklyDigest", v)}
        />
      </Card>

      <Card title="Notifications SMS" hint="Activez pour les alertes urgentes">
        <ToggleRow
          label="Matching d'offres prioritaires"
          value={prefs.smsMatching}
          onChange={(v) => updatePref("smsMatching", v)}
        />
        <ToggleRow
          label="Statut de candidature"
          value={prefs.smsCandidatures}
          onChange={(v) => updatePref("smsCandidatures", v)}
        />
      </Card>

      <Card title="Apparence" hint="Personnalisez le rendu de l'interface">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {(["light", "dark", "system"] as const).map((t) => {
            const active = theme === t;
            const Icon =
              t === "dark"
                ? Icons.Moon
                : t === "system"
                  ? Icons.Monitor
                  : Icons.Sun;
            return (
              <button
                key={t}
                type="button"
                onClick={() => setTheme(t)}
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 8,
                  padding: "10px 16px",
                  borderRadius: 10,
                  background: active ? "var(--bg-elev-2)" : "transparent",
                  border: "1px solid",
                  borderColor: active ? "var(--brand-blue)" : "var(--border)",
                  color: active ? "var(--fg)" : "var(--fg-muted)",
                  fontSize: 13,
                  fontWeight: 600,
                  cursor: "pointer",
                  transition: "all var(--dur-fast)",
                  textTransform: "capitalize",
                }}
              >
                <Icon size={15} />
                {t === "system" ? "Système" : t === "dark" ? "Sombre" : "Clair"}
              </button>
            );
          })}
        </div>
      </Card>

      <Card
        title="Confidentialité"
        hint="Vos données sont protégées par la loi gabonaise"
      >
        <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
          <a href={pnpeLink("/demandeur/donnees-personnelles")} style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="sm" icon={<Icons.FileText size={13} />}>
              Télécharger mes données
            </Button>
          </a>
          <a href={pnpeLink("/demandeur/donnees-personnelles")} style={{ textDecoration: "none" }}>
            <Button variant="secondary" size="sm" icon={<Icons.Shield size={13} />}>
              Politique de confidentialité
            </Button>
          </a>
        </div>
      </Card>

      {/* Zone danger */}
      <section
        style={{
          background: "var(--bg-elev-1)",
          border: "1px solid var(--color-danger, #C24343)",
          borderRadius: "var(--r-card)",
          padding: 20,
          marginTop: 24,
        }}
      >
        <header style={{ marginBottom: 14 }}>
          <h3
            style={{
              margin: 0,
              fontSize: 15,
              fontWeight: 600,
              color: "var(--color-danger, #C24343)",
            }}
          >
            Zone sensible
          </h3>
          <p
            style={{
              margin: "4px 0 0",
              fontSize: 12.5,
              color: "var(--fg-muted)",
            }}
          >
            Actions définitives ou affectant l&apos;accès à votre espace.
          </p>
        </header>

        <div style={{ display: "grid", gap: 12 }}>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              padding: "12px 0",
              borderBottom: "1px solid var(--border-faint)",
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 220, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                Déconnexion
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--fg-muted)",
                  marginTop: 2,
                }}
              >
                Termine votre session sur cet appareil. Vos données restent
                intactes.
              </div>
            </div>
            <Button
              variant="danger"
              size="sm"
              onClick={handleSignOut}
              disabled={signingOut}
              icon={<Icons.LogOut size={13} />}
            >
              {signingOut ? "Déconnexion…" : "Se déconnecter"}
            </Button>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 16,
              paddingTop: 4,
              flexWrap: "wrap",
            }}
          >
            <div style={{ minWidth: 220, flex: 1 }}>
              <div style={{ fontSize: 14, fontWeight: 500, color: "var(--fg)" }}>
                Suppression du compte
              </div>
              <div
                style={{
                  fontSize: 12.5,
                  color: "var(--fg-muted)",
                  marginTop: 2,
                }}
              >
                La suppression est définitive et passe par PNPE.GA (validation
                conseiller obligatoire si vous êtes Demandeur d&apos;Emploi).
              </div>
            </div>
            <a href={pnpeLink("/demandeur/suppression")} style={{ textDecoration: "none" }}>
              <Button
                variant="secondary"
                size="sm"
                iconRight={<Icons.ArrowUR size={12} />}
              >
                Procédure sur PNPE.GA
              </Button>
            </a>
          </div>
        </div>
      </section>
    </>
  );
}
