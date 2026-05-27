"use client";

/**
 * Notifications — TRAVAIL.GA.
 *
 * Centre de notifications : alertes d'offres, messages recruteurs,
 * relances conseiller PNPE. Tant que le canal temps réel Convex
 * `iNotifications` n'est pas câblé sur TRAVAIL.GA, on rend des
 * notifications mockées + un CTA pour la boîte complète sur PNPE.GA.
 */

import Link from "next/link";
import { useMemo, useState } from "react";
import { Icons } from "@/components/design/icons";
import { Badge, Button } from "@/components/design/ui";
import { pnpeLink } from "@/lib/utils";

type NotifCategory = "matching" | "candidature" | "message" | "systeme";

type Notif = {
  id: string;
  category: NotifCategory;
  title: string;
  body: string;
  date: string;
  unread: boolean;
};

const CATEGORY_META: Record<
  NotifCategory,
  { label: string; tone: "blue" | "emerald" | "ember" | "neutral"; icon: React.ReactNode }
> = {
  matching: {
    label: "Matching",
    tone: "blue",
    icon: <Icons.Sparkles size={13} />,
  },
  candidature: {
    label: "Candidature",
    tone: "emerald",
    icon: <Icons.Briefcase size={13} />,
  },
  message: {
    label: "Message",
    tone: "ember",
    icon: <Icons.Mail size={13} />,
  },
  systeme: {
    label: "Système",
    tone: "neutral",
    icon: <Icons.Bell size={13} />,
  },
};

const MOCK_NOTIFS: Notif[] = [
  {
    id: "n1",
    category: "matching",
    title: "12 nouvelles offres correspondent à votre profil",
    body: "Secteur Mines & Métallurgie · Province Haut-Ogooué. Le matching IA PNPE a identifié ces opportunités.",
    date: "il y a 2h",
    unread: true,
  },
  {
    id: "n2",
    category: "candidature",
    title: "Votre candidature COMILOG a été vue",
    body: "Ingénieur Méthodes Maintenance — Moanda. Le recruteur a consulté votre dossier.",
    date: "il y a 5h",
    unread: true,
  },
  {
    id: "n3",
    category: "message",
    title: "Nouveau message du conseiller PNPE",
    body: "Antenne Libreville · Mme NDONG vous propose un point de suivi cette semaine.",
    date: "hier",
    unread: false,
  },
  {
    id: "n4",
    category: "systeme",
    title: "Compte vérifié",
    body: "Votre adresse email a été confirmée avec succès. Bienvenue sur TRAVAIL.GA.",
    date: "il y a 3 jours",
    unread: false,
  },
];

export default function NotificationsPage() {
  const [filter, setFilter] = useState<"all" | "unread" | NotifCategory>("all");
  const [notifs, setNotifs] = useState(MOCK_NOTIFS);

  const filtered = useMemo(() => {
    if (filter === "all") return notifs;
    if (filter === "unread") return notifs.filter((n) => n.unread);
    return notifs.filter((n) => n.category === filter);
  }, [filter, notifs]);

  const unreadCount = notifs.filter((n) => n.unread).length;

  const markAllRead = () =>
    setNotifs((arr) => arr.map((n) => ({ ...n, unread: false })));

  const FilterChip = ({
    label,
    value,
    count,
  }: {
    label: string;
    value: typeof filter;
    count?: number;
  }) => {
    const active = filter === value;
    return (
      <button
        type="button"
        onClick={() => setFilter(value)}
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
        {count !== undefined && count > 0 && (
          <span
            style={{
              marginLeft: 6,
              padding: "1px 6px",
              borderRadius: 999,
              background: active
                ? "rgba(255,255,255,0.2)"
                : "var(--bg-elev-2)",
              fontSize: 11,
            }}
          >
            {count}
          </span>
        )}
      </button>
    );
  };

  return (
    <>
      <div style={{ marginBottom: 24 }}>
        <Badge
          tone="ember"
          icon={<Icons.Bell size={11} />}
          style={{ marginBottom: 12 }}
        >
          Centre de notifications
        </Badge>
        <h1
          className="font-display"
          style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1.05 }}
        >
          Notifications
          {unreadCount > 0 && (
            <span
              style={{
                marginLeft: 12,
                fontSize: 16,
                color: "var(--brand-ember)",
                fontWeight: 600,
                verticalAlign: "middle",
                letterSpacing: 0,
              }}
            >
              · {unreadCount} non lu{unreadCount > 1 ? "es" : "e"}
            </span>
          )}
        </h1>
        <p
          style={{
            margin: "8px 0 0",
            color: "var(--fg-muted)",
            fontSize: 14.5,
            maxWidth: 580,
          }}
        >
          Alertes d&apos;offres, messages recruteurs, relances conseiller.
          La boîte complète + actions est disponible sur PNPE.GA.
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 16,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <FilterChip label="Tout" value="all" count={notifs.length} />
        <FilterChip label="Non lues" value="unread" count={unreadCount} />
        <FilterChip label="Matching" value="matching" />
        <FilterChip label="Candidatures" value="candidature" />
        <FilterChip label="Messages" value="message" />
        <div style={{ flex: 1 }} />
        {unreadCount > 0 && (
          <Button variant="ghost" size="sm" onClick={markAllRead}>
            <Icons.Check size={13} /> Tout marquer comme lu
          </Button>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          style={{
            background: "var(--bg-elev-1)",
            border: "1px dashed var(--border-strong)",
            borderRadius: "var(--r-card)",
            padding: 36,
            textAlign: "center",
          }}
        >
          <Icons.Bell
            size={32}
            style={{ color: "var(--fg-subtle)", margin: "0 auto 10px" }}
          />
          <p style={{ margin: 0, color: "var(--fg-muted)", fontSize: 14 }}>
            Aucune notification dans cette catégorie.
          </p>
        </div>
      ) : (
        <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 8 }}>
          {filtered.map((n) => {
            const meta = CATEGORY_META[n.category];
            return (
              <li
                key={n.id}
                style={{
                  position: "relative",
                  display: "grid",
                  gridTemplateColumns: "auto 1fr auto",
                  gap: 14,
                  padding: 16,
                  background: n.unread
                    ? "var(--bg-elev-1)"
                    : "var(--bg-elev-1)",
                  border: "1px solid",
                  borderColor: n.unread
                    ? "var(--brand-ember-50)"
                    : "var(--border)",
                  borderRadius: "var(--r-card)",
                  alignItems: "start",
                }}
              >
                {n.unread && (
                  <span
                    aria-hidden
                    style={{
                      position: "absolute",
                      top: 18,
                      right: 14,
                      width: 7,
                      height: 7,
                      borderRadius: 999,
                      background: "var(--brand-ember)",
                    }}
                  />
                )}
                <div
                  style={{
                    width: 36,
                    height: 36,
                    borderRadius: 9,
                    background: "var(--bg-elev-2)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    color:
                      meta.tone === "blue"
                        ? "var(--brand-blue)"
                        : meta.tone === "emerald"
                          ? "var(--brand-emerald)"
                          : meta.tone === "ember"
                            ? "var(--brand-ember)"
                            : "var(--fg-muted)",
                    flexShrink: 0,
                  }}
                >
                  {meta.icon}
                </div>
                <div style={{ minWidth: 0 }}>
                  <div
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 8,
                      marginBottom: 4,
                      flexWrap: "wrap",
                    }}
                  >
                    <Badge tone={meta.tone}>{meta.label}</Badge>
                    <span style={{ fontSize: 12, color: "var(--fg-subtle)" }}>
                      {n.date}
                    </span>
                  </div>
                  <div
                    style={{
                      fontSize: 14,
                      fontWeight: n.unread ? 600 : 500,
                      color: "var(--fg)",
                      lineHeight: 1.4,
                      marginBottom: 4,
                    }}
                  >
                    {n.title}
                  </div>
                  <p
                    style={{
                      margin: 0,
                      fontSize: 13,
                      color: "var(--fg-muted)",
                      lineHeight: 1.5,
                    }}
                  >
                    {n.body}
                  </p>
                </div>
              </li>
            );
          })}
        </ul>
      )}

      <div
        style={{
          marginTop: 24,
          padding: 16,
          background: "var(--bg-elev-1)",
          border: "1px solid var(--border)",
          borderRadius: "var(--r-card)",
          display: "flex",
          alignItems: "center",
          gap: 14,
          flexWrap: "wrap",
        }}
      >
        <Icons.Inbox size={22} style={{ color: "var(--brand-blue)" }} />
        <div style={{ flex: 1, minWidth: 220 }}>
          <div style={{ fontWeight: 600, fontSize: 14 }}>Inbox complète</div>
          <div
            style={{
              fontSize: 12.5,
              color: "var(--fg-muted)",
              marginTop: 2,
            }}
          >
            Réponses recruteurs, threads avec votre conseiller, pièces jointes.
          </div>
        </div>
        <a href={pnpeLink("/demandeur/messages")} style={{ textDecoration: "none" }}>
          <Button
            variant="secondary"
            iconRight={<Icons.ArrowUR size={13} />}
          >
            Ouvrir sur PNPE.GA
          </Button>
        </a>
      </div>
    </>
  );
}
