"use client";

/**
 * Aide & support — TRAVAIL.GA.
 *
 * FAQ catégorisée + canaux de contact PNPE (téléphone, email, antenne
 * référente). Cet écran est un point d'entrée — les workflows de
 * réclamation et de support conseiller restent côté PNPE.GA.
 */

import Link from "next/link";
import { useState } from "react";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";
import { pnpeLink } from "@/lib/utils";

type FaqItem = {
  q: string;
  a: string;
  category: "compte" | "candidature" | "pnpe" | "donnees";
};

const FAQ: FaqItem[] = [
  {
    category: "compte",
    q: "Comment me connecter à mon espace TRAVAIL.GA ?",
    a: "Votre compte TRAVAIL.GA utilise la même identité que PNPE.GA et DEMARCHE.GA (Better Auth). Si vous avez déjà un compte sur l'une de ces plateformes, vous pouvez vous connecter directement avec les mêmes identifiants.",
  },
  {
    category: "compte",
    q: "J'ai oublié mon mot de passe.",
    a: "Rendez-vous sur PNPE.GA et utilisez la fonction « Mot de passe oublié ». Un email de réinitialisation vous sera envoyé à l'adresse associée à votre compte.",
  },
  {
    category: "candidature",
    q: "Comment postuler à une offre ?",
    a: "Sur la fiche d'une offre, cliquez sur « Postuler ». Si vous n'êtes pas inscrit comme Demandeur d'Emploi PNPE, vous pourrez d'abord candidater en tant que citoyen avec votre NIP, puis migrer votre dossier ensuite.",
  },
  {
    category: "candidature",
    q: "Comment suivre mes candidatures ?",
    a: "Toutes vos candidatures envoyées via TRAVAIL.GA sont visibles dans la section « Mes candidatures ». Pour le suivi avancé (entretiens, retours recruteur), votre conseiller PNPE assure le lien.",
  },
  {
    category: "pnpe",
    q: "Quelle est la différence entre TRAVAIL.GA et PNPE.GA ?",
    a: "TRAVAIL.GA est la vitrine publique du marché de l'emploi gabonais (catalogue d'offres, annuaire antennes, KPIs). PNPE.GA est l'espace opérationnel authentifié du Pôle National de Promotion de l'Emploi : conseillers, validations, matching IA, BMC Auto-Emploi.",
  },
  {
    category: "pnpe",
    q: "Comment être pris en charge par un conseiller PNPE ?",
    a: "Migrez votre compte en Demandeur d'Emploi via la section « Migrer vers D.E ». Vous serez automatiquement rattaché à l'antenne PNPE de votre province. Un conseiller validera votre dossier sous 48h.",
  },
  {
    category: "donnees",
    q: "Mes données sont-elles protégées ?",
    a: "Oui. TRAVAIL.GA respecte la loi gabonaise sur la protection des données personnelles. Vos informations ne sont jamais cédées à des tiers commerciaux. Vous pouvez exporter ou supprimer votre compte à tout moment depuis les paramètres.",
  },
];

const CATEGORIES = {
  compte: { label: "Mon compte", tone: "blue" as const },
  candidature: { label: "Candidatures", tone: "emerald" as const },
  pnpe: { label: "PNPE & écosystème", tone: "ember" as const },
  donnees: { label: "Données personnelles", tone: "neutral" as const },
};

function FaqAccordion({ item, isOpen, onToggle }: {
  item: FaqItem;
  isOpen: boolean;
  onToggle: () => void;
}) {
  const cat = CATEGORIES[item.category];
  return (
    <li
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        overflow: "hidden",
      }}
    >
      <button
        type="button"
        onClick={onToggle}
        style={{
          width: "100%",
          padding: "14px 16px",
          background: "transparent",
          border: "none",
          color: "var(--fg)",
          fontSize: 14,
          fontWeight: 500,
          textAlign: "left",
          cursor: "pointer",
          display: "flex",
          alignItems: "center",
          gap: 12,
          fontFamily: "inherit",
        }}
      >
        <Badge tone={cat.tone}>{cat.label}</Badge>
        <span style={{ flex: 1, minWidth: 0 }}>{item.q}</span>
        <span
          style={{
            color: "var(--fg-subtle)",
            transform: isOpen ? "rotate(180deg)" : "rotate(0)",
            transition: "transform var(--dur-fast)",
            flexShrink: 0,
          }}
        >
          <Icons.ChevronD size={15} />
        </span>
      </button>
      {isOpen && (
        <div
          style={{
            padding: "0 16px 16px",
            color: "var(--fg-muted)",
            fontSize: 13.5,
            lineHeight: 1.6,
            borderTop: "1px solid var(--border-faint)",
            paddingTop: 12,
          }}
        >
          {item.a}
        </div>
      )}
    </li>
  );
}

function ContactCard({
  icon,
  title,
  value,
  hint,
  href,
}: {
  icon: React.ReactNode;
  title: string;
  value: string;
  hint?: string;
  href: string;
}) {
  return (
    <a
      href={href}
      target={href.startsWith("http") ? "_blank" : undefined}
      rel="noreferrer"
      style={{
        background: "var(--bg-elev-1)",
        border: "1px solid var(--border)",
        borderRadius: "var(--r-card)",
        padding: 20,
        textDecoration: "none",
        color: "inherit",
        display: "flex",
        flexDirection: "column",
        gap: 10,
        transition: "all var(--dur-fast)",
      }}
      onMouseEnter={(e) => {
        e.currentTarget.style.borderColor = "var(--brand-blue)";
        e.currentTarget.style.transform = "translateY(-1px)";
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.borderColor = "var(--border)";
        e.currentTarget.style.transform = "translateY(0)";
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
        }}
      >
        {icon}
      </div>
      <div>
        <div style={{ fontSize: 12, color: "var(--fg-subtle)", marginBottom: 2 }}>
          {title}
        </div>
        <div
          style={{
            fontFamily: "var(--font-display)",
            fontWeight: 700,
            fontSize: 17,
            letterSpacing: "-0.02em",
            color: "var(--fg)",
          }}
        >
          {value}
        </div>
        {hint && (
          <div
            style={{ fontSize: 12, color: "var(--fg-muted)", marginTop: 4 }}
          >
            {hint}
          </div>
        )}
      </div>
    </a>
  );
}

export default function AidePage() {
  const [openId, setOpenId] = useState<number | null>(null);
  const [filter, setFilter] = useState<"all" | FaqItem["category"]>("all");

  const filteredFaq =
    filter === "all" ? FAQ : FAQ.filter((f) => f.category === filter);

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Badge
          tone="blue"
          icon={<Icons.HelpCircle size={11} />}
          style={{ marginBottom: 12 }}
        >
          Aide & support
        </Badge>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1.05 }}
        >
          Comment pouvons-nous vous aider ?
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-muted)",
            fontSize: 14.5,
            maxWidth: 580,
          }}
        >
          Consultez la FAQ ou contactez le Pôle National de Promotion de
          l&apos;Emploi via les canaux ci-dessous.
        </p>
      </div>

      {/* Canaux de contact */}
      <section style={{ marginBottom: 28 }}>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--fg-subtle)",
          }}
        >
          Canaux de contact PNPE
        </h2>
        <div
          className="travail-aide-contact-grid"
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3, 1fr)",
            gap: 12,
          }}
        >
          <ContactCard
            icon={<Icons.Phone size={18} />}
            title="Hotline emploi"
            value="+241 11 12 13 14"
            hint="Lun-Ven · 8h–17h"
            href="tel:+241111213"
          />
          <ContactCard
            icon={<Icons.Mail size={18} />}
            title="Email support"
            value="support@pnpe.ga"
            hint="Réponse sous 48h"
            href="mailto:support@pnpe.ga"
          />
          <ContactCard
            icon={<Icons.MapPin size={18} />}
            title="Antenne référente"
            value="Trouver mon antenne"
            hint="7 antennes au Gabon"
            href="/antennes"
          />
        </div>
      </section>

      {/* FAQ */}
      <section>
        <h2
          style={{
            margin: "0 0 12px",
            fontSize: 13,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--fg-subtle)",
          }}
        >
          Questions fréquentes
        </h2>

        <div
          style={{
            display: "flex",
            gap: 8,
            marginBottom: 14,
            flexWrap: "wrap",
          }}
        >
          {(["all", "compte", "candidature", "pnpe", "donnees"] as const).map(
            (k) => {
              const active = filter === k;
              const label = k === "all" ? "Tout" : CATEGORIES[k].label;
              return (
                <button
                  key={k}
                  type="button"
                  onClick={() => setFilter(k)}
                  style={{
                    padding: "6px 12px",
                    borderRadius: 999,
                    border: "1px solid",
                    borderColor: active ? "var(--brand-blue)" : "var(--border)",
                    background: active ? "var(--brand-blue)" : "var(--bg-elev-1)",
                    color: active ? "#fff" : "var(--fg-muted)",
                    fontSize: 12.5,
                    fontWeight: 600,
                    cursor: "pointer",
                    transition: "all var(--dur-fast)",
                  }}
                >
                  {label}
                </button>
              );
            },
          )}
        </div>

        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "grid",
            gap: 8,
          }}
        >
          {filteredFaq.map((item, i) => (
            <FaqAccordion
              key={`${item.category}-${i}`}
              item={item}
              isOpen={openId === i}
              onToggle={() => setOpenId(openId === i ? null : i)}
            />
          ))}
        </ul>
      </section>

      {/* CTA */}
      <div
        style={{
          marginTop: 28,
          padding: 20,
          background: "var(--brand-emerald-50)",
          border: "1px solid var(--brand-emerald-50)",
          borderRadius: "var(--r-xl)",
          display: "flex",
          alignItems: "center",
          gap: 16,
          flexWrap: "wrap",
        }}
      >
        <Icons.Compass size={32} style={{ color: "var(--brand-emerald)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div
            style={{
              fontWeight: 700,
              fontSize: 15.5,
              color: "var(--brand-emerald)",
              letterSpacing: "-0.01em",
            }}
          >
            Besoin d&apos;un accompagnement personnalisé ?
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--brand-emerald)",
              opacity: 0.8,
              marginTop: 2,
              lineHeight: 1.5,
            }}
          >
            Devenez Demandeur d&apos;Emploi PNPE pour bénéficier d&apos;un
            conseiller dédié, du matching IA et de l&apos;atelier BMC
            Auto-Emploi.
          </div>
        </div>
        <Link
          href="/mon-compte/migrer-vers-de"
          style={{ textDecoration: "none" }}
        >
          <Button iconRight={<Icons.ArrowR size={14} />}>
            Devenir D.E PNPE
          </Button>
        </Link>
      </div>

      <style>{`
        @media (max-width: 720px) {
          .travail-aide-contact-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>
    </>
  );
}
