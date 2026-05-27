/**
 * Postulation publique (citoyen) — TRAVAIL.GA.
 *
 * Permet à un user Better Auth de candidater à une offre sans avoir un
 * profil D.E PNPE complet. Le candidat fournit son contact direct ;
 * l'employeur le recontactera.
 *
 * Si l'utilisateur est aussi D.E PNPE inscrit, il est invité à utiliser
 * l'espace D.E sur PNPE.GA pour candidater avec son profil complet.
 *
 * Design : 1:1 avec la charte éditoriale TRAVAIL.GA (CSS vars,
 * composants `@/components/design/ui`). Pas de Tailwind/shadcn brut.
 */
"use client";

import { use, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useMutation, useQuery } from "convex/react";
import { toast } from "sonner";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";
import { authClient } from "@/lib/auth-client";
import { offreHref, pnpeLink } from "@/lib/utils";
import { api } from "@convex/_generated/api";
import type { Id } from "@convex/_generated/dataModel";

type FormState = {
  nom: string;
  prenoms: string;
  email: string;
  telephone: string;
  niveauEtudes: string;
  experienceText: string;
  lettreMotivation: string;
};

const NIVEAU_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "Non renseigné" },
  { value: "AUCUN", label: "Aucun" },
  { value: "CEP", label: "CEP" },
  { value: "BEPC", label: "BEPC" },
  { value: "BAC", label: "Baccalauréat" },
  { value: "BAC_PLUS_2", label: "Bac+2 (BTS, DUT)" },
  { value: "BAC_PLUS_3", label: "Bac+3 (Licence)" },
  { value: "BAC_PLUS_5", label: "Bac+5 (Master)" },
  { value: "DOCTORAT", label: "Doctorat" },
];

/**
 * Convention gabonaise : le NOM de famille est généralement en CAPITALES
 * (ex. "MBOUMBA Jean", "Sophie NTSAGA"). On strip d'abord les
 * parenthèses (souvent une ville ou un rôle), puis :
 *   - si un mot est en ALL CAPS → c'est le nom, le reste est prénoms ;
 *   - sinon fallback : dernier mot = nom, début = prénoms.
 */
function splitName(full?: string | null): { prenoms: string; nom: string } {
  if (!full) return { prenoms: "", nom: "" };
  const cleaned = full.replace(/\s*\([^)]*\)\s*/g, " ").trim();
  if (!cleaned) return { prenoms: "", nom: "" };
  const parts = cleaned.split(/\s+/);
  if (parts.length === 1) return { prenoms: "", nom: parts[0]! };

  const upperIdx = parts.findIndex(
    (p) => p.length > 1 && p === p.toUpperCase() && /[A-ZÀ-Ý]/.test(p),
  );
  if (upperIdx >= 0) {
    const nom = parts[upperIdx]!;
    const prenoms = parts.filter((_, i) => i !== upperIdx).join(" ");
    return { prenoms, nom };
  }
  return {
    prenoms: parts.slice(0, -1).join(" "),
    nom: parts[parts.length - 1]!,
  };
}

export default function PostulerPage({
  params,
}: {
  params: Promise<{ reference: string }>;
}) {
  const { reference: rawReference } = use(params);
  const reference = decodeURIComponent(rawReference);
  const router = useRouter();
  const { data: session, isPending: sessionPending } = authClient.useSession();

  const initial: FormState = useMemo(() => {
    const { prenoms, nom } = splitName(session?.user?.name);
    return {
      nom,
      prenoms,
      email: session?.user?.email ?? "",
      telephone: "",
      niveauEtudes: "",
      experienceText: "",
      lettreMotivation: "",
    };
  }, [session?.user?.name, session?.user?.email]);

  const [form, setForm] = useState<FormState>(initial);
  const [submitting, setSubmitting] = useState(false);

  // Pré-remplir quand la session arrive après le 1er render
  useEffect(() => {
    setForm((prev) => ({
      ...prev,
      nom: prev.nom || initial.nom,
      prenoms: prev.prenoms || initial.prenoms,
      email: prev.email || initial.email,
    }));
  }, [initial]);

   
  const offre = useQuery(
    api.functions.pnpe.offres?.getByReference,
    { reference },
  ) as { _id: string; titre: string } | null | undefined;

   
  const apply = useMutation(
    api.functions.pnpe.candidaturesPubliques?.applyAsCitizen,
  );

  const update = <K extends keyof FormState>(k: K, v: FormState[K]) =>
    setForm((s) => ({ ...s, [k]: v }));

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!session?.user) {
      toast.error("Connectez-vous pour postuler.");
      return;
    }
    if (!offre) return;
    setSubmitting(true);
    try {
      await apply({
        offreId: offre._id as Id<"offresEmploi">,
        contact: {
          nom: form.nom,
          prenoms: form.prenoms,
          email: form.email,
          telephone: form.telephone,
          niveauEtudes: form.niveauEtudes || undefined,
          experienceText: form.experienceText || undefined,
        },
        lettreMotivation: form.lettreMotivation || undefined,
      });
      toast.success("Candidature envoyée — l'employeur vous recontactera.");
      router.push(offreHref(reference));
    } catch (err) {
      const m = err instanceof Error ? err.message : "Erreur";
      if (m.includes("ALREADY_APPLIED")) {
        toast.error("Vous avez déjà postulé à cette offre.");
      } else {
        toast.error(m);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const isAuthed = !!session?.user;

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
              style={{ display: "inline", margin: "0 6px", verticalAlign: -2 }}
            />
            <Link href="/offres" style={{ color: "inherit" }}>
              Catalogue
            </Link>
            <Icons.ChevronR
              size={12}
              style={{ display: "inline", margin: "0 6px", verticalAlign: -2 }}
            />
            <Link href={offreHref(reference)} style={{ color: "inherit" }}>
              <span style={{ fontFamily: "var(--font-mono)" }}>
                {reference}
              </span>
            </Link>
            <Icons.ChevronR
              size={12}
              style={{ display: "inline", margin: "0 6px", verticalAlign: -2 }}
            />
            <span style={{ color: "var(--fg-muted)" }}>Postuler</span>
          </div>
        </div>

        <div
          className="travail-container"
          style={{ padding: "40px 0 80px", maxWidth: 720 }}
        >
          <Badge
            tone="emerald"
            icon={<Icons.ShieldCheck size={11} />}
            style={{ marginBottom: 14 }}
          >
            Candidature publique TRAVAIL.GA
          </Badge>
          <h1
            className="font-display"
            style={{
              margin: 0,
              fontSize: "var(--t-h1)",
              lineHeight: 0.96,
            }}
          >
            Postuler à cette offre
          </h1>
          <p
            style={{
              margin: "10px 0 0",
              color: "var(--fg-muted)",
              fontSize: 15,
            }}
          >
            {offre?.titre ? (
              <>
                Offre :{" "}
                <strong style={{ color: "var(--fg)" }}>{offre.titre}</strong>
              </>
            ) : (
              "Chargement de l'offre…"
            )}
          </p>

          {/* Bandeau D.E PNPE */}
          <div
            style={{
              marginTop: 24,
              padding: 18,
              background: "var(--brand-blue-50)",
              border: "1px solid var(--brand-blue-100)",
              borderRadius: 12,
              display: "flex",
              gap: 14,
              alignItems: "flex-start",
            }}
          >
            <Icons.ShieldCheck
              size={18}
              style={{
                color: "var(--brand-blue)",
                marginTop: 2,
                flexShrink: 0,
              }}
            />
            <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
              <strong style={{ color: "var(--brand-blue-700)" }}>
                Déjà inscrit comme D.E au PNPE ?
              </strong>{" "}
              <span style={{ color: "var(--fg-muted)" }}>
                Connectez-vous sur{" "}
                <a
                  href={pnpeLink(`/demandeur/offres/${encodeURIComponent(reference)}`)}
                  style={{
                    color: "var(--brand-blue)",
                    textDecoration: "underline",
                    fontWeight: 600,
                  }}
                >
                  PNPE.GA
                </a>{" "}
                pour candidater avec votre profil complet (CV, parcours,
                compétences validées).
              </span>
            </div>
          </div>

          {/* Auth gate */}
          {!sessionPending && !isAuthed && (
            <div
              style={{
                marginTop: 18,
                padding: 18,
                background: "var(--bg-elev-1)",
                border: "1px dashed var(--border-strong)",
                borderRadius: 12,
                display: "flex",
                gap: 14,
                alignItems: "flex-start",
              }}
            >
              <Icons.User
                size={18}
                style={{
                  color: "var(--brand-ember)",
                  marginTop: 2,
                  flexShrink: 0,
                }}
              />
              <div style={{ fontSize: 13.5, lineHeight: 1.55 }}>
                <strong style={{ color: "var(--fg)" }}>
                  Connectez-vous pour postuler.
                </strong>{" "}
                <span style={{ color: "var(--fg-muted)" }}>
                  Un compte est nécessaire pour suivre votre candidature et
                  recevoir la réponse de l&apos;employeur. Utilisez le bouton{" "}
                  <em>Connexion</em> en haut à droite — ou, en démo locale, le
                  bouton{" "}
                  <strong style={{ color: "var(--brand-emerald)" }}>
                    DEV
                  </strong>{" "}
                  en bas à droite.
                </span>
              </div>
            </div>
          )}

          <form
            onSubmit={onSubmit}
            style={{
              marginTop: 24,
              display: "flex",
              flexDirection: "column",
              gap: 16,
            }}
          >
            <Section title="Vos coordonnées">
              <div
                style={{
                  display: "grid",
                  gridTemplateColumns: "1fr 1fr",
                  gap: 12,
                }}
                className="travail-postuler-grid"
              >
                <Field
                  label="Nom *"
                  value={form.nom}
                  onChange={(v) => update("nom", v)}
                  required
                />
                <Field
                  label="Prénoms *"
                  value={form.prenoms}
                  onChange={(v) => update("prenoms", v)}
                  required
                />
                <Field
                  label="Email *"
                  type="email"
                  value={form.email}
                  onChange={(v) => update("email", v)}
                  required
                />
                <Field
                  label="Téléphone *"
                  type="tel"
                  value={form.telephone}
                  onChange={(v) => update("telephone", v)}
                  required
                  placeholder="+241 …"
                />
              </div>
            </Section>

            <Section title="Votre profil">
              <FieldLabel>Niveau d&apos;études (optionnel)</FieldLabel>
              <select
                value={form.niveauEtudes}
                onChange={(e) => update("niveauEtudes", e.target.value)}
                style={selectStyle}
              >
                {NIVEAU_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>

              <div style={{ marginTop: 14 }}>
                <FieldLabel>Expérience résumée (optionnel)</FieldLabel>
                <textarea
                  value={form.experienceText}
                  onChange={(e) => update("experienceText", e.target.value)}
                  rows={3}
                  placeholder="Ex : 3 ans dans la vente, 5 ans en garde d'enfants…"
                  style={textareaStyle}
                />
              </div>

              <div style={{ marginTop: 14 }}>
                <FieldLabel>Lettre de motivation (optionnel)</FieldLabel>
                <textarea
                  value={form.lettreMotivation}
                  onChange={(e) => update("lettreMotivation", e.target.value)}
                  rows={5}
                  placeholder="Pourquoi ce poste vous intéresse…"
                  style={textareaStyle}
                />
              </div>
            </Section>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                justifyContent: "flex-end",
                paddingTop: 8,
              }}
            >
              <Link
                href={offreHref(reference)}
                style={{ textDecoration: "none" }}
              >
                <Button variant="ghost" size="md" type="button">
                  Annuler
                </Button>
              </Link>
              <Button
                type="submit"
                size="lg"
                variant="primary"
                disabled={submitting || !isAuthed || !offre}
                iconRight={
                  submitting ? undefined : <Icons.ArrowUR size={16} />
                }
              >
                {submitting ? "Envoi…" : "Envoyer ma candidature"}
              </Button>
            </div>
          </form>
        </div>
      </main>

      <style>{`
        @media (max-width: 640px) {
          .travail-postuler-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteFooter />
    </div>
  );
}

const selectStyle = {
  width: "100%",
  height: 42,
  padding: "0 14px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--fg)",
  outline: "none",
} as const;

const textareaStyle = {
  width: "100%",
  padding: "10px 14px",
  background: "var(--bg)",
  border: "1px solid var(--border)",
  borderRadius: 10,
  fontFamily: "var(--font-sans)",
  fontSize: 14,
  color: "var(--fg)",
  outline: "none",
  resize: "vertical" as const,
  lineHeight: 1.55,
} as const;

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-xl)",
        padding: 22,
        boxShadow: "var(--shadow-1)",
      }}
    >
      <h2
        className="font-display"
        style={{
          margin: "0 0 14px",
          fontSize: 16,
          letterSpacing: "-0.01em",
          color: "var(--fg)",
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  );
}

function FieldLabel({ children }: { children: React.ReactNode }) {
  return (
    <label
      style={{
        display: "block",
        fontSize: 12.5,
        fontWeight: 600,
        color: "var(--fg-muted)",
        marginBottom: 6,
        letterSpacing: "0.01em",
      }}
    >
      {children}
    </label>
  );
}

function Field({
  label,
  value,
  onChange,
  type = "text",
  required = false,
  placeholder,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}) {
  return (
    <div>
      <FieldLabel>{label}</FieldLabel>
      <input
        type={type}
        value={value}
        onChange={(e) => onChange(e.target.value)}
        required={required}
        placeholder={placeholder}
        style={{
          width: "100%",
          height: 42,
          padding: "0 14px",
          background: "var(--bg)",
          border: "1px solid var(--border)",
          borderRadius: 10,
          fontFamily: "var(--font-sans)",
          fontSize: 14,
          color: "var(--fg)",
          outline: "none",
        }}
      />
    </div>
  );
}
