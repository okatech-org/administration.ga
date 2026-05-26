/**
 * JobCard TRAVAIL.GA — composant stratégique du catalogue.
 * 3 densités : compact / regular / detailed.
 * Source : design Claude `components.jsx`.
 */
"use client";

import { useState, type ReactNode } from "react";
import { Icons } from "./icons";
import {
  Avatar,
  Badge,
  BookmarkBtn,
  Button,
  EmetteurPill,
  Salaire,
  type EmetteurType,
} from "./ui";
import { PROVINCES, CONTRATS } from "@/lib/travail-constants";

export type OffreCard = {
  id: string;
  ref: string;
  titre: string;
  employeur: string;
  employeurFull?: string;
  verified?: boolean;
  logo: { txt: string; bg: string; fg: string };
  type: EmetteurType;
  contrat: keyof typeof CONTRATS;
  ville: string;
  province: string;
  salaireMin?: number;
  salaireMax?: number;
  devise?: string;
  poste: string;
  postePoint?: number;
  candidats: number;
  teletravail?: string;
  experience?: string;
  secteur?: string;
  featured?: boolean;
  urgent?: boolean;
  description?: string;
  matching?: number;
  vu?: boolean;
  missions?: string[];
  profil?: string[];
};

type Density = "compact" | "regular" | "detailed";

export function JobCard({
  offre,
  density = "regular",
  onBookmark,
  bookmarked,
  onClick,
  index = 0,
  viewedFade = true,
}: {
  offre: OffreCard;
  density?: Density;
  onBookmark?: () => void;
  bookmarked?: boolean;
  onClick?: () => void;
  index?: number;
  viewedFade?: boolean;
}) {
  const [hover, setHover] = useState(false);
  const contratLabel: string = CONTRATS[offre.contrat] ?? offre.contrat;
  const province =
    PROVINCES.find((p) => p.code === offre.province)?.label ?? offre.province;
  const isViewed = viewedFade && offre.vu;

  return (
    <article
      className="fade-up"
      style={{
        animationDelay: `${Math.min(index * 50, 600)}ms`,
        position: "relative",
        background: "var(--bg-elev-1)",
        border: `1px solid ${hover ? "var(--border-strong)" : "var(--border)"}`,
        borderRadius: "var(--r-card)",
        padding: density === "compact" ? "14px 18px" : "20px 22px",
        cursor: "pointer",
        transition: "all var(--dur-base) var(--ease-out)",
        boxShadow: hover ? "var(--shadow-3)" : "var(--shadow-1)",
        transform: hover ? "translateY(-1px)" : "translateY(0)",
        opacity: isViewed ? 0.62 : 1,
        overflow: "hidden",
      }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={onClick}
    >
      {/* left accent bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: 0,
          bottom: 0,
          width: offre.featured ? 3 : hover ? 3 : 0,
          background: offre.urgent
            ? "var(--brand-ember)"
            : offre.featured
              ? "var(--brand-blue)"
              : "var(--brand-blue-600)",
          transition: "width var(--dur-base) var(--ease-out)",
        }}
      />

      {/* featured ribbon */}
      {offre.featured && (
        <div
          style={{
            position: "absolute",
            top: 14,
            right: 14,
            fontSize: 10,
            fontWeight: 600,
            letterSpacing: "0.06em",
            textTransform: "uppercase",
            color: "var(--brand-blue)",
            background: "var(--brand-blue-50)",
            padding: "3px 8px",
            borderRadius: 4,
          }}
        >
          <Icons.Star
            size={10}
            style={{
              display: "inline",
              marginRight: 4,
              verticalAlign: -1,
            }}
          />
          À la une
        </div>
      )}

      {density === "compact" ? (
        <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          <Avatar logo={offre.logo} size={32} verified={offre.verified} />
          <div style={{ flex: 1, minWidth: 0 }}>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 10,
                marginBottom: 4,
              }}
            >
              <h3
                style={{
                  margin: 0,
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: 16.5,
                  lineHeight: 1.25,
                  letterSpacing: "-0.025em",
                  color: "var(--fg)",
                  whiteSpace: "nowrap",
                  overflow: "hidden",
                  textOverflow: "ellipsis",
                  flex: "0 1 auto",
                  minWidth: 0,
                }}
              >
                {offre.titre}
              </h3>
              {offre.urgent && (
                <Badge tone="ember" size="sm" icon={<Icons.Fire size={10} />}>
                  Urgent
                </Badge>
              )}
            </div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 14,
                fontSize: 12.5,
                color: "var(--fg-muted)",
                flexWrap: "wrap",
              }}
            >
              <span style={{ fontWeight: 550, color: "var(--fg)" }}>
                {offre.employeur}
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Icons.MapPin size={12} />
                {offre.ville}
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 4 }}
              >
                <Icons.Briefcase size={12} />
                {contratLabel}
              </span>
              {offre.salaireMin && (
                <span className="tnum">
                  <Salaire
                    min={offre.salaireMin}
                    max={offre.salaireMax}
                    devise={offre.devise}
                    compact
                  />
                </span>
              )}
            </div>
          </div>
          <span
            style={{
              fontSize: 11,
              color: "var(--fg-subtle)",
              whiteSpace: "nowrap",
            }}
          >
            {offre.poste}
          </span>
          <BookmarkBtn active={bookmarked} onClick={onBookmark} size={16} />
        </div>
      ) : (
        <>
          <div style={{ display: "flex", alignItems: "flex-start", gap: 16 }}>
            <Avatar logo={offre.logo} size={48} verified={offre.verified} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  alignItems: "center",
                  gap: 8,
                  marginBottom: 6,
                }}
              >
                <EmetteurPill type={offre.type} />
                {offre.urgent && (
                  <Badge tone="ember" icon={<Icons.Fire size={11} />}>
                    Urgent
                  </Badge>
                )}
                <span
                  style={{
                    fontFamily: "var(--font-mono)",
                    fontSize: 11,
                    color: "var(--fg-subtle)",
                  }}
                >
                  {offre.ref}
                </span>
              </div>
              <h3
                style={{
                  margin: "0 0 4px",
                  fontFamily: "var(--font-display)",
                  fontWeight: 800,
                  fontSize: density === "detailed" ? 22 : 19,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  color: "var(--fg)",
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                  paddingRight: offre.featured ? 72 : 0,
                }}
              >
                {offre.titre}
              </h3>
              <div
                style={{
                  fontSize: 13.5,
                  color: "var(--fg-muted)",
                  marginBottom: 12,
                }}
              >
                <span style={{ fontWeight: 550, color: "var(--fg)" }}>
                  {offre.employeur}
                </span>
                {offre.verified && (
                  <span
                    style={{
                      display: "inline-flex",
                      alignItems: "center",
                      gap: 3,
                      marginLeft: 8,
                      fontSize: 11.5,
                      color: "var(--brand-blue)",
                    }}
                  >
                    <Icons.ShieldCheck size={11} /> Vérifiée PNPE
                  </span>
                )}
              </div>

              <div
                style={{
                  display: "flex",
                  flexWrap: "wrap",
                  gap: 6,
                  marginBottom: density === "detailed" ? 14 : 0,
                }}
              >
                <Badge icon={<Icons.MapPin size={11} />}>
                  {offre.ville} · {province}
                </Badge>
                <Badge icon={<Icons.Briefcase size={11} />}>{contratLabel}</Badge>
                {offre.teletravail && offre.teletravail !== "Non" && (
                  <Badge tone="emerald" icon={<Icons.Home size={11} />}>
                    {offre.teletravail}
                  </Badge>
                )}
                {offre.salaireMin && (
                  <Badge tone="blue" icon={<Icons.Wallet size={11} />}>
                    <Salaire
                      min={offre.salaireMin}
                      max={offre.salaireMax}
                      devise={offre.devise}
                      compact
                    />
                  </Badge>
                )}
                {offre.experience && <Badge>{offre.experience}</Badge>}
              </div>

              {density === "detailed" && (
                <>
                  {offre.description && (
                    <p
                      style={{
                        margin: "0 0 12px",
                        fontSize: 13.5,
                        color: "var(--fg-muted)",
                        lineHeight: 1.55,
                        display: "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical",
                        overflow: "hidden",
                      }}
                    >
                      {offre.description}
                    </p>
                  )}
                  {offre.matching != null && (
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 10,
                        marginBottom: 4,
                      }}
                    >
                      <div
                        style={{
                          flex: 1,
                          maxWidth: 180,
                          height: 4,
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
                                : offre.matching >= 70
                                  ? "var(--brand-blue)"
                                  : "var(--brand-gold)",
                            borderRadius: 4,
                          }}
                        />
                      </div>
                      <span
                        style={{
                          fontSize: 11.5,
                          color: "var(--fg-muted)",
                          fontWeight: 550,
                        }}
                      >
                        Matching{" "}
                        <span style={{ color: "var(--fg)" }} className="tnum">
                          {offre.matching}%
                        </span>
                      </span>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>

          {/* footer */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              marginTop: 14,
              paddingTop: 14,
              borderTop: "1px dashed var(--border-faint)",
              flexWrap: "wrap",
              gap: 10,
            }}
          >
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: 16,
                fontSize: 12,
                color: "var(--fg-subtle)",
                flexWrap: "wrap",
              }}
            >
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Icons.Clock size={12} />
                {offre.poste}
              </span>
              <span
                style={{ display: "inline-flex", alignItems: "center", gap: 5 }}
              >
                <Icons.Users size={12} />
                <span className="tnum">{offre.candidats}</span> candidat
                {offre.candidats > 1 ? "s" : ""}
              </span>
              {isViewed && (
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 5,
                    fontStyle: "italic",
                  }}
                >
                  <Icons.Eye size={12} /> Déjà vue
                </span>
              )}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
              <BookmarkBtn active={bookmarked} onClick={onBookmark} />
              <Button
                variant="secondary"
                size="sm"
                iconRight={<Icons.ArrowR size={13} />}
                onClick={(e) => {
                  e.stopPropagation();
                  onClick?.();
                }}
              >
                Voir l&apos;offre
              </Button>
            </div>
          </div>
        </>
      )}
    </article>
  );
}
