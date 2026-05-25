/**
 * CommandPalette TRAVAIL.GA — ⌘K modal.
 *
 * Recherche groupée (Navigation / Offres / Écosystème) avec keyboard
 * shortcuts (↑↓ navigate, ↵ select, ESC close). Backdrop blur. Animation
 * fadeUp à l'ouverture.
 *
 * Source : design Claude `app.jsx` (CommandPalette).
 */
"use client";

import {
  type ReactNode,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { useRouter } from "next/navigation";
import { Icons } from "./icons";
import { Avatar } from "./ui";
import { MOCK_OFFRES } from "@/lib/travail-mock-data";

type Action = {
  id: string;
  group: "Navigation" | "Offres" | "Écosystème";
  label: string;
  sub?: string;
  icon: ReactNode;
  run: () => void;
};

const kbdStyle = {
  fontFamily: "var(--font-mono)",
  fontSize: 10,
  padding: "1px 5px",
  borderRadius: 4,
  background: "var(--bg-elev-1)",
  border: "1px solid var(--border)",
  color: "var(--fg-muted)",
  marginRight: 4,
} as const;

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [activeIdx, setActiveIdx] = useState(0);
  const inputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 50);
    else setQ("");
  }, [open]);

  const actions = useMemo<Action[]>(() => {
    const nav: Action[] = [
      {
        id: "nav-feed",
        group: "Navigation",
        label: "Catalogue d'offres",
        icon: <Icons.Briefcase size={14} />,
        run: () => router.push("/offres"),
      },
      {
        id: "nav-dashboard",
        group: "Navigation",
        label: "Mes candidatures",
        icon: <Icons.Layers size={14} />,
        run: () => router.push("/mon-compte"),
      },
      {
        id: "nav-antennes",
        group: "Navigation",
        label: "Antennes PNPE",
        icon: <Icons.Landmark size={14} />,
        run: () => router.push("/antennes"),
      },
      {
        id: "nav-stats",
        group: "Navigation",
        label: "Statistiques",
        icon: <Icons.TrendUp size={14} />,
        run: () => router.push("/statistiques"),
      },
      {
        id: "nav-publier",
        group: "Navigation",
        label: "Publier une annonce",
        icon: <Icons.Plus size={14} />,
        run: () => router.push("/publier-annonce"),
      },
      {
        id: "nav-landing",
        group: "Navigation",
        label: "Accueil",
        icon: <Icons.Home size={14} />,
        run: () => router.push("/"),
      },
    ];
    const offres: Action[] = MOCK_OFFRES.slice(0, 8).map((o) => ({
      id: o.id,
      group: "Offres",
      label: o.titre,
      sub: `${o.employeur} · ${o.ville}`,
      icon: <Avatar logo={o.logo} size={20} />,
      run: () => router.push(`/offres/${o.ref}`),
    }));
    const eco: Action[] = [
      {
        id: "ext-pnpe",
        group: "Écosystème",
        label: "PNPE.GA — Espace opérationnel",
        icon: <Icons.ArrowUR size={14} />,
        run: () => {
          window.open("https://emploi.administration.ga", "_blank");
        },
      },
      {
        id: "ext-demarche",
        group: "Écosystème",
        label: "DEMARCHE.GA — Démarches administratives",
        icon: <Icons.ArrowUR size={14} />,
        run: () => {
          window.open("https://demarche.ga", "_blank");
        },
      },
      {
        id: "ext-admin",
        group: "Écosystème",
        label: "ADMINISTRATION.GA — Portail national",
        icon: <Icons.ArrowUR size={14} />,
        run: () => {
          window.open("https://administration.ga", "_blank");
        },
      },
    ];
    return [...nav, ...offres, ...eco];
  }, [router]);

  const filtered = useMemo(() => {
    if (!q) return actions;
    const s = q.toLowerCase();
    return actions.filter(
      (a) =>
        a.label.toLowerCase().includes(s) ||
        a.sub?.toLowerCase().includes(s),
    );
  }, [q, actions]);

  const grouped = useMemo(() => {
    const g: Record<string, Action[]> = {};
    filtered.forEach((a) => {
      g[a.group] ||= [];
      g[a.group]!.push(a);
    });
    return g;
  }, [filtered]);

  useEffect(() => {
    setActiveIdx(0);
  }, [q]);

  if (!open) return null;

  const run = (a: Action) => {
    a.run();
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 80,
        background: "color-mix(in oklab, var(--bg-inverse) 50%, transparent)",
        backdropFilter: "blur(4px)",
        WebkitBackdropFilter: "blur(4px)",
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: "10vh",
        animation: "fadeUp 180ms var(--ease-out) both",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          width: "min(640px, 92vw)",
          maxHeight: "70vh",
          background: "var(--bg-elev-1)",
          borderRadius: 16,
          boxShadow: "var(--shadow-4)",
          border: "1px solid var(--border)",
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            padding: "16px 18px",
            borderBottom: "1px solid var(--border)",
          }}
        >
          <Icons.Search size={16} style={{ color: "var(--fg-muted)" }} />
          <input
            ref={inputRef}
            type="text"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Rechercher une offre, une page, une action…"
            onKeyDown={(e) => {
              if (e.key === "Escape") onClose();
              if (e.key === "Enter" && filtered[activeIdx]) {
                run(filtered[activeIdx]);
              }
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIdx((i) => Math.min(i + 1, filtered.length - 1));
              }
              if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIdx((i) => Math.max(i - 1, 0));
              }
            }}
            style={{
              flex: 1,
              marginLeft: 12,
              background: "transparent",
              border: "none",
              outline: "none",
              fontFamily: "var(--font-sans)",
              fontSize: 15,
              color: "var(--fg)",
            }}
          />
          <kbd
            style={{
              fontFamily: "var(--font-mono)",
              fontSize: 11,
              padding: "3px 8px",
              borderRadius: 6,
              background: "var(--bg-elev-2)",
              border: "1px solid var(--border)",
              color: "var(--fg-subtle)",
            }}
          >
            ESC
          </kbd>
        </div>
        <div style={{ flex: 1, overflow: "auto", padding: 8 }}>
          {Object.entries(grouped).map(([group, items]) => (
            <div key={group} style={{ marginBottom: 8 }}>
              <div
                style={{
                  fontSize: 10.5,
                  fontWeight: 600,
                  color: "var(--fg-subtle)",
                  textTransform: "uppercase",
                  letterSpacing: "0.08em",
                  padding: "8px 12px 4px",
                }}
              >
                {group}
              </div>
              {items.map((a) => {
                const idx = filtered.indexOf(a);
                const isActive = idx === activeIdx;
                return (
                  <button
                    key={a.id}
                    onClick={() => run(a)}
                    onMouseEnter={() => setActiveIdx(idx)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      width: "100%",
                      padding: "9px 12px",
                      borderRadius: 8,
                      background: isActive ? "var(--bg-elev-2)" : "transparent",
                      border: "none",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "background var(--dur-fast)",
                    }}
                  >
                    <span style={{ color: "var(--fg-muted)", display: "inline-flex" }}>
                      {a.icon}
                    </span>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: 13.5,
                          color: "var(--fg)",
                          fontWeight: 500,
                        }}
                      >
                        {a.label}
                      </div>
                      {a.sub && (
                        <div
                          style={{ fontSize: 11.5, color: "var(--fg-subtle)" }}
                        >
                          {a.sub}
                        </div>
                      )}
                    </div>
                    {isActive && (
                      <Icons.ArrowR
                        size={13}
                        style={{ color: "var(--fg-subtle)" }}
                      />
                    )}
                  </button>
                );
              })}
            </div>
          ))}
          {filtered.length === 0 && (
            <div
              style={{
                padding: 32,
                textAlign: "center",
                color: "var(--fg-subtle)",
                fontSize: 13,
              }}
            >
              Aucun résultat pour <em>« {q} »</em>
            </div>
          )}
        </div>
        <div
          style={{
            display: "flex",
            gap: 16,
            padding: "10px 18px",
            borderTop: "1px solid var(--border)",
            background: "var(--bg-elev-2)",
            fontSize: 11,
            color: "var(--fg-subtle)",
          }}
        >
          <span>
            <kbd style={kbdStyle}>↑↓</kbd> Naviguer
          </span>
          <span>
            <kbd style={kbdStyle}>↵</kbd> Sélectionner
          </span>
          <span>
            <kbd style={kbdStyle}>ESC</kbd> Fermer
          </span>
        </div>
      </div>
    </div>
  );
}
