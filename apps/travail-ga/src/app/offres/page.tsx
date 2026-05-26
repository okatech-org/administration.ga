/**
 * Catalogue d'offres TRAVAIL.GA — design éditorial.
 *
 * Refonte intégrale (source : Claude Design `c2f97b31` FeedScreen) :
 *  - Toolbar avec compte d'offres + recherche full-text + sort
 *  - Chips de filtres (Type / Contrat / Province / Télétravail)
 *  - Layout switch List / Grid
 *  - JobCard regular avec animations
 *  - SkeletonCard pendant chargement
 *
 * Données : `api.functions.pnpe.offresPubliques.listAllPublished` Convex
 * (fallback `MOCK_OFFRES` quand vide / hors-ligne).
 */
"use client";

import Link from "next/link";
import { useMemo, useState, type ReactNode } from "react";
import { useQuery } from "convex/react";
import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { Icons } from "@/components/design/icons";
import { Button, SkeletonCard } from "@/components/design/ui";
import { JobCard, type OffreCard } from "@/components/design/job-card";
import {
  CONTRATS,
  PROVINCES,
  type ContratCode,
  type ProvinceCode,
  type EmetteurCode,
} from "@/lib/travail-constants";
import { MOCK_OFFRES } from "@/lib/travail-mock-data";
import { offreHref } from "@/lib/utils";
import { useFavoris } from "@/lib/use-favoris";
import { api } from "@convex/_generated/api";

type FeedFilters = {
  province: ProvinceCode | null;
  contrat: ContratCode | null;
  type: EmetteurCode | null;
  teletravail: boolean;
};

type SortKey = "recent" | "salaire" | "matching";

const INITIAL_LOGO_PALETTE = [
  "#1B4D8C",
  "#16A37B",
  "#E29021",
  "#B86A3A",
  "#0F3F7A",
  "#7A1F2B",
  "#5A7E5F",
];

function pickLogo(employeurName: string, idx: number) {
  const initials = employeurName
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w.charAt(0))
    .join("")
    .toUpperCase()
    .slice(0, 2);
  return {
    txt: initials || "?",
    bg: INITIAL_LOGO_PALETTE[idx % INITIAL_LOGO_PALETTE.length] ?? "#1B4D8C",
    fg: "#fff",
  };
}

type ConvexOffre = {
  _id: string;
  reference: string;
  titre: string;
  description?: string;
  typeEmployeur: EmetteurCode;
  contrat?: ContratCode;
  typeContrat?: ContratCode;
  lieuTravail?: { ville: string; province: ProvinceCode };
  salaire?: { min: number; max: number; devise: string };
  dateExpiration?: number;
  _creationTime?: number;
  nbCandidatures?: number;
  particulierInfo?: { nom: string; prenoms: string };
  employeurInfo?: { raisonSociale: string; verified?: boolean };
  orgInfo?: { nom: string };
};

function fromConvex(o: ConvexOffre, idx: number): OffreCard {
  const employeur =
    o.employeurInfo?.raisonSociale ||
    o.orgInfo?.nom ||
    (o.particulierInfo
      ? `${o.particulierInfo.prenoms} ${o.particulierInfo.nom}`
      : o.reference);
  const days = o._creationTime
    ? Math.max(0, Math.floor((Date.now() - o._creationTime) / 86_400_000))
    : 0;
  const poste =
    days === 0
      ? "aujourd'hui"
      : days === 1
        ? "hier"
        : days < 7
          ? `il y a ${days} jours`
          : days < 14
            ? "il y a 1 semaine"
            : `il y a ${Math.floor(days / 7)} semaines`;
  return {
    id: o._id,
    ref: o.reference,
    titre: o.titre,
    employeur,
    verified: o.employeurInfo?.verified ?? o.typeEmployeur !== "PARTICULIER",
    logo: pickLogo(employeur, idx),
    type: o.typeEmployeur,
    contrat: (o.contrat ?? o.typeContrat ?? "CDI") as ContratCode,
    ville: o.lieuTravail?.ville ?? "Libreville",
    province: (o.lieuTravail?.province ?? "ESTUAIRE") as ProvinceCode,
    salaireMin: o.salaire?.min,
    salaireMax: o.salaire?.max,
    devise: o.salaire?.devise ?? "XAF",
    poste,
    postePoint: days,
    candidats: o.nbCandidatures ?? 0,
    description: o.description,
  };
}

export default function OffresPage() {
   
  const offresQuery = useQuery(
    api.functions?.pnpe?.offresPubliques?.listAllPublished,
    {},
  ) as ConvexOffre[] | undefined;

  const [query, setQuery] = useState("");
  const [filters, setFilters] = useState<FeedFilters>({
    province: null,
    contrat: null,
    type: null,
    teletravail: false,
  });
  const [sort, setSort] = useState<SortKey>("recent");
  const [layout, setLayout] = useState<"list" | "grid">("list");
  const [showFavorisOnly, setShowFavorisOnly] = useState(false);
  const { isFavori, toggle, count: favorisCount } = useFavoris();

  const offres: OffreCard[] = useMemo(() => {
    if (offresQuery && offresQuery.length > 0) {
      return offresQuery.map(fromConvex);
    }
    return MOCK_OFFRES;
  }, [offresQuery]);

  const filtered = useMemo(() => {
    let list = offres.filter((o) => {
      if (
        query &&
        !(
          o.titre.toLowerCase().includes(query.toLowerCase()) ||
          o.employeur.toLowerCase().includes(query.toLowerCase())
        )
      )
        return false;
      if (filters.province && o.province !== filters.province) return false;
      if (filters.contrat && o.contrat !== filters.contrat) return false;
      if (filters.type && o.type !== filters.type) return false;
      if (filters.teletravail && (!o.teletravail || o.teletravail === "Non"))
        return false;
      if (showFavorisOnly && !isFavori(o.ref)) return false;
      return true;
    });
    if (sort === "salaire") {
      list = [...list].sort(
        (a, b) => (b.salaireMax ?? 0) - (a.salaireMax ?? 0),
      );
    }
    if (sort === "matching") {
      list = [...list].sort((a, b) => (b.matching ?? 0) - (a.matching ?? 0));
    }
    if (sort === "recent") {
      list = [...list].sort(
        (a, b) => (a.postePoint ?? 99) - (b.postePoint ?? 99),
      );
    }
    return list;
  }, [offres, query, filters, sort, showFavorisOnly, isFavori]);

  const resetFilters = () =>
    setFilters({
      province: null,
      contrat: null,
      type: null,
      teletravail: false,
    });
  const activeFilterCount = Object.values(filters).filter(Boolean).length;

  const loading = offresQuery === undefined;

  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column" }}>
      <SiteHeader />

      <main style={{ flex: 1, background: "var(--bg)" }}>
        <div
          style={{
            borderBottom: "1px solid var(--border)",
            background: "var(--bg-elev-1)",
          }}
        >
          <div className="travail-container" style={{ padding: "20px 0 18px" }}>
            <div
              style={{
                display: "flex",
                alignItems: "baseline",
                justifyContent: "space-between",
                gap: 16,
                marginBottom: 18,
                flexWrap: "wrap",
              }}
            >
              <div>
                <h1
                  className="font-display"
                  style={{ margin: 0, fontSize: "var(--t-h2)", lineHeight: 1 }}
                >
                  Catalogue d&apos;offres
                </h1>
                <p
                  style={{
                    margin: "6px 0 0",
                    color: "var(--fg-muted)",
                    fontSize: 14,
                  }}
                >
                  <span
                    className="tnum"
                    style={{ fontWeight: 550, color: "var(--fg)" }}
                  >
                    {filtered.length}
                  </span>{" "}
                  offre{filtered.length > 1 ? "s" : ""} sur{" "}
                  <span className="tnum">{offres.length}</span> — validées par le
                  PNPE
                </p>
              </div>
              <Link href="/publier-annonce" style={{ textDecoration: "none" }}>
                <Button variant="ghost" size="sm" icon={<Icons.Plus size={14} />}>
                  Publier une annonce
                </Button>
              </Link>
            </div>

            <div
              style={{
                display: "flex",
                gap: 10,
                alignItems: "center",
                flexWrap: "wrap",
              }}
            >
              <div style={{ flex: "1 1 320px", position: "relative" }}>
                <Icons.Search
                  size={16}
                  style={{
                    position: "absolute",
                    left: 14,
                    top: "50%",
                    transform: "translateY(-50%)",
                    color: "var(--fg-subtle)",
                  }}
                />
                <input
                  type="search"
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Rechercher un poste, une entreprise, un secteur…"
                  style={{
                    width: "100%",
                    height: 44,
                    paddingLeft: 42,
                    paddingRight: 16,
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
              <select
                value={sort}
                onChange={(e) => setSort(e.target.value as SortKey)}
                style={{
                  height: 44,
                  padding: "0 16px",
                  background: "var(--bg)",
                  border: "1px solid var(--border)",
                  borderRadius: 10,
                  fontFamily: "var(--font-sans)",
                  fontSize: 14,
                  color: "var(--fg)",
                }}
              >
                <option value="recent">Plus récentes</option>
                <option value="salaire">Salaire ↓</option>
                <option value="matching">Matching ↓</option>
              </select>
            </div>

            <div
              style={{
                display: "flex",
                gap: 8,
                marginTop: 14,
                flexWrap: "wrap",
                alignItems: "center",
              }}
            >
              <span
                style={{
                  fontSize: 11.5,
                  fontWeight: 600,
                  letterSpacing: "0.06em",
                  textTransform: "uppercase",
                  color: "var(--fg-subtle)",
                  marginRight: 4,
                }}
              >
                Filtres
              </span>
              <ChipSelect
                label="Type d'émetteur"
                value={filters.type}
                options={[
                  { v: "ENTREPRISE", l: "Entreprises" },
                  { v: "ADMINISTRATION", l: "Administrations" },
                  { v: "PARTICULIER", l: "Particuliers" },
                ]}
                onChange={(v) =>
                  setFilters({ ...filters, type: v as EmetteurCode | null })
                }
              />
              <ChipSelect
                label="Contrat"
                value={filters.contrat}
                options={Object.entries(CONTRATS).map(([v, l]) => ({
                  v,
                  l,
                }))}
                onChange={(v) =>
                  setFilters({ ...filters, contrat: v as ContratCode | null })
                }
              />
              <ChipSelect
                label="Province"
                value={filters.province}
                options={PROVINCES.map((p) => ({ v: p.code, l: p.label }))}
                onChange={(v) =>
                  setFilters({ ...filters, province: v as ProvinceCode | null })
                }
              />
              <ChipToggle
                active={filters.teletravail}
                onClick={() =>
                  setFilters({ ...filters, teletravail: !filters.teletravail })
                }
              >
                <Icons.Home size={11} /> Télétravail
              </ChipToggle>
              {favorisCount > 0 && (
                <ChipToggle
                  active={showFavorisOnly}
                  onClick={() => setShowFavorisOnly((v) => !v)}
                >
                  <Icons.Bookmark size={11} /> Favoris{" "}
                  <span className="tnum" style={{ opacity: 0.7 }}>
                    ({favorisCount})
                  </span>
                </ChipToggle>
              )}
              {activeFilterCount > 0 && (
                <button
                  onClick={resetFilters}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "var(--brand-ember)",
                    fontSize: 12.5,
                    fontWeight: 550,
                    padding: "4px 8px",
                    cursor: "pointer",
                  }}
                >
                  Réinitialiser ({activeFilterCount})
                </button>
              )}
              <div style={{ flex: 1 }} />
              <div
                style={{
                  display: "inline-flex",
                  padding: 3,
                  background: "var(--bg-elev-2)",
                  borderRadius: 8,
                  gap: 2,
                }}
              >
                {(
                  [
                    ["list", "Liste"],
                    ["grid", "Grille"],
                  ] as const
                ).map(([v, l]) => (
                  <button
                    key={v}
                    onClick={() => setLayout(v)}
                    style={{
                      padding: "5px 10px",
                      fontSize: 12,
                      fontWeight: 550,
                      borderRadius: 6,
                      background:
                        layout === v ? "var(--bg-elev-1)" : "transparent",
                      color:
                        layout === v ? "var(--fg)" : "var(--fg-muted)",
                      border: "none",
                      cursor: "pointer",
                      boxShadow: layout === v ? "var(--shadow-1)" : "none",
                    }}
                  >
                    {l}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="travail-container" style={{ padding: "28px 0 80px" }}>
          {loading ? (
            <div style={{ display: "grid", gap: 12 }}>
              {[0, 1, 2].map((i) => (
                <SkeletonCard key={i} />
              ))}
            </div>
          ) : filtered.length === 0 ? (
            <EmptyState
              query={query}
              onReset={() => {
                setQuery("");
                resetFilters();
              }}
            />
          ) : (
            <div
              className="travail-feed-grid"
              style={{
                display: "grid",
                gridTemplateColumns: layout === "grid" ? "1fr 1fr" : "1fr",
                gap: 12,
              }}
            >
              {filtered.map((o, i) => (
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
                    onBookmark={() => toggle(o.ref)}
                  />
                </Link>
              ))}
            </div>
          )}
        </div>
      </main>

      <style>{`
        @media (max-width: 720px) {
          .travail-feed-grid { grid-template-columns: 1fr !important; }
        }
      `}</style>

      <SiteFooter />
    </div>
  );
}

function ChipSelect({
  label,
  value,
  options,
  onChange,
}: {
  label: string;
  value: string | null;
  options: { v: string; l: string }[];
  onChange: (v: string | null) => void;
}) {
  const [open, setOpen] = useState(false);
  const active = value != null;
  const current = active ? options.find((o) => o.v === value)?.l : label;
  return (
    <div style={{ position: "relative" }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          display: "inline-flex",
          alignItems: "center",
          gap: 6,
          padding: "5px 10px 5px 12px",
          borderRadius: 999,
          background: active ? "var(--brand-blue-50)" : "var(--bg-elev-1)",
          border: `1px solid ${active ? "var(--brand-blue)" : "var(--border)"}`,
          color: active ? "var(--brand-blue)" : "var(--fg)",
          fontSize: 12.5,
          fontWeight: 550,
          cursor: "pointer",
          transition: "all var(--dur-fast)",
        }}
      >
        {current}
        <Icons.ChevronD size={11} style={{ opacity: 0.6 }} />
      </button>
      {open && (
        <div
          onMouseLeave={() => setOpen(false)}
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            minWidth: 220,
            maxHeight: 320,
            overflow: "auto",
            background: "var(--bg-elev-1)",
            border: "1px solid var(--border)",
            borderRadius: 12,
            boxShadow: "var(--shadow-4)",
            padding: 4,
            zIndex: 50,
          }}
        >
          {active && (
            <button
              onClick={() => {
                onChange(null);
                setOpen(false);
              }}
              style={{
                display: "block",
                width: "100%",
                textAlign: "left",
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--brand-ember)",
                background: "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                borderBottom: "1px solid var(--border-faint)",
                marginBottom: 4,
              }}
            >
              Effacer
            </button>
          )}
          {options.map((o) => (
            <button
              key={o.v}
              onClick={() => {
                onChange(o.v);
                setOpen(false);
              }}
              style={{
                display: "flex",
                width: "100%",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "8px 12px",
                fontSize: 13,
                color: "var(--fg)",
                background: value === o.v ? "var(--bg-elev-2)" : "transparent",
                border: "none",
                borderRadius: 6,
                cursor: "pointer",
                textAlign: "left",
              }}
            >
              {o.l}
              {value === o.v && (
                <Icons.Check size={13} style={{ color: "var(--brand-blue)" }} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function ChipToggle({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "5px 12px",
        borderRadius: 999,
        background: active ? "var(--brand-emerald-50)" : "var(--bg-elev-1)",
        border: `1px solid ${active ? "var(--brand-emerald)" : "var(--border)"}`,
        color: active ? "var(--brand-emerald)" : "var(--fg)",
        fontSize: 12.5,
        fontWeight: 550,
        cursor: "pointer",
        transition: "all var(--dur-fast)",
      }}
    >
      {children}
    </button>
  );
}

function EmptyState({
  query,
  onReset,
}: {
  query: string;
  onReset: () => void;
}) {
  return (
    <div
      style={{
        background: "var(--bg-elev-1)",
        border: "1px dashed var(--border-strong)",
        borderRadius: "var(--r-card)",
        padding: "64px 24px",
        textAlign: "center",
      }}
    >
      <div
        style={{
          width: 64,
          height: 64,
          borderRadius: 16,
          margin: "0 auto 18px",
          background: "var(--bg-elev-2)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--fg-subtle)",
        }}
      >
        <Icons.Compass size={28} />
      </div>
      <h3
        className="font-display"
        style={{ margin: 0, fontSize: 26, color: "var(--fg)" }}
      >
        Aucune offre ne correspond.
      </h3>
      <p
        style={{
          margin: "8px 0 20px",
          color: "var(--fg-muted)",
          fontSize: 14,
        }}
      >
        Essayez d&apos;élargir vos critères, ou créez une alerte sur{" "}
        <em>« {query || "votre recherche"} »</em>.
      </p>
      <div
        style={{ display: "inline-flex", gap: 8, justifyContent: "center" }}
      >
        <Button variant="secondary" size="sm" onClick={onReset}>
          Réinitialiser
        </Button>
        <Button variant="primary" size="sm" icon={<Icons.Bell size={13} />}>
          Créer une alerte
        </Button>
      </div>
    </div>
  );
}
