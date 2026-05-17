"use client";

/**
 * Affaires Diplomatiques — Paramétrages (Backoffice Superadmin)
 *
 * 2 onglets :
 * 1. Priorités Exécutives Générales — s'appliquent à toutes les représentations
 * 2. Configuration par Représentation — priorités locales du chef de mission
 */

import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"
import {
  Globe2,
  Plus,
  Trash2,
  Building2,
  Save,
  Loader2,
  Search,
  X,
  Target,
  RotateCcw,
  MapPin,
  AlertTriangle,
} from "lucide-react"
import { useMemo, useRef, useState } from "react"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover"
import { Textarea } from "@/components/ui/textarea"
import {
  useAuthenticatedConvexQuery,
  useConvexMutationQuery,
} from "@/integrations/convex/hooks"
import { PriorityDocumentImporter } from "@/components/diplomatic/priority-document-importer"
import { cn } from "@/lib/utils"
import { PageHeader } from "@/components/design-system/page-header"


// ─── Types ──────────────────────────────────────────────────────────────────

interface PriorityItem {
  title: string
  sector: string
  description?: string
  keywords: string[]
}

// ─── Recherche intelligente ────────────────────────────────────────────────

function matchesPriority(p: PriorityItem, query: string): boolean {
  if (!query.trim()) return true
  const tokens = query.toLowerCase().split(/\s+/).filter(Boolean)
  const text = [p.title, p.sector, p.description ?? "", ...p.keywords]
    .join(" ")
    .toLowerCase()
  return tokens.every((t) => text.includes(t))
}

// ─── Bande compacte de priorités (scroll horizontal + popover édition) ─────

function PriorityStrip({
  priorities,
  setPriorities,
  compact = false,
  readOnly = false,
  externalSearch,
}: {
  priorities: PriorityItem[]
  setPriorities?: React.Dispatch<React.SetStateAction<PriorityItem[]>>
  compact?: boolean
  readOnly?: boolean
  externalSearch?: string
}) {
  const [internalSearch, setInternalSearch] = useState("")
  const [activePage, setActivePage] = useState(0)
  const search = externalSearch ?? internalSearch
  const setSearch = (v: string) => setInternalSearch(v)
  const showSearchBar = externalSearch === undefined
  const [editIndex, setEditIndex] = useState<number | null>(null)
  const scrollRef = useRef<HTMLDivElement>(null)

  const filtered = useMemo(
    () =>
      priorities
        .map((p, i) => ({ ...p, _idx: i }))
        .filter((p) => matchesPriority(p, search)),
    [priorities, search]
  )

  const addPriority = () => {
    if (readOnly || !setPriorities) return
    const newIdx = priorities.length
    setPriorities((prev) => [
      ...prev,
      { title: "", sector: "", description: "", keywords: [] },
    ])
    setEditIndex(newIdx)
    setTimeout(() => {
      scrollRef.current?.scrollTo({
        left: scrollRef.current.scrollWidth,
        behavior: "smooth",
      })
    }, 50)
  }

  const removePriority = (idx: number) => {
    if (readOnly || !setPriorities) return
    setPriorities((prev) => prev.filter((_, i) => i !== idx))
    if (editIndex === idx) setEditIndex(null)
  }

  const updatePriority = (
    idx: number,
    field: keyof PriorityItem,
    value: string | string[]
  ) => {
    if (readOnly || !setPriorities) return
    setPriorities((prev) =>
      prev.map((p, i) => (i === idx ? { ...p, [field]: value } : p))
    )
  }

  if (priorities.length === 0) {
    return readOnly ? null : (
      <p className="py-3 text-center text-xs text-muted-foreground">
        Aucune priorité définie. Importez un document ou ajoutez manuellement.
      </p>
    )
  }

  // Découper les items en pages de 16 (4 colonnes × 4 lignes) pour le mode compact
  const pageSize = compact ? 16 : filtered.length
  const pages: (typeof filtered)[] = []
  for (let i = 0; i < filtered.length; i += pageSize) {
    pages.push(filtered.slice(i, i + pageSize))
  }

  // Carte de priorité réutilisable
  const renderCard = (p: (typeof filtered)[number]) => (
    <Popover
      key={p._idx}
      open={editIndex === p._idx}
      onOpenChange={(open) => setEditIndex(open ? p._idx : null)}
    >
      <PopoverTrigger asChild>
        <button
          type="button"
          className={cn(
            "group w-full rounded-xl border bg-secondary text-left transition-all",
            "hover:border-primary/30",
            editIndex === p._idx && "border-primary/40",
            compact
              ? "flex h-[110px] flex-col p-3"
              : "max-w-[230px] min-w-[190px] p-3"
          )}
        >
          {/* Badge P + Mots-clés sur la même ligne */}
          <div className="mb-1 flex items-center justify-between gap-1">
            <Badge
              variant="outline"
              className={cn("shrink-0", compact ? "text-[9px]" : "text-[10px]")}
            >
              P{p._idx + 1}
            </Badge>
            {p.keywords.length > 0 && (
              <span className="text-[11px] text-muted-foreground">
                {p.keywords.length} mot{p.keywords.length > 1 ? "s" : ""}-clé
                {p.keywords.length > 1 ? "s" : ""}
              </span>
            )}
            {!readOnly && (
              <span
                role="button"
                tabIndex={0}
                className="rounded p-0.5 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-destructive/10 hover:text-destructive"
                onClick={(e) => {
                  e.stopPropagation()
                  removePriority(p._idx)
                }}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.stopPropagation()
                    removePriority(p._idx)
                  }
                }}
              >
                <X className="h-3 w-3" />
              </span>
            )}
          </div>
          <p
            className={cn(
              "mt-1 leading-tight font-medium",
              compact ? "text-[13px]" : "line-clamp-2 text-sm"
            )}
          >
            {p.title || "Sans titre"}
          </p>
        </button>
      </PopoverTrigger>
      <PopoverContent className="w-[360px]" align="start" sideOffset={8}>
        {readOnly ? (
          <div className="space-y-2.5">
            <p className="text-sm font-medium">{p.title}</p>
            <Badge variant="secondary" className="text-[10px]">
              {p.sector}
            </Badge>
            {p.description && (
              <p className="text-xs leading-relaxed text-muted-foreground">
                {p.description}
              </p>
            )}
            {p.keywords.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {p.keywords.map((kw, j) => (
                  <Badge key={j} variant="outline" className="text-[9px]">
                    {kw}
                  </Badge>
                ))}
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <p className="text-xs font-medium">Priorité {p._idx + 1}</p>
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 text-muted-foreground hover:text-destructive"
                onClick={() => removePriority(p._idx)}
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Titre *</Label>
              <Input
                value={p.title}
                onChange={(e) =>
                  updatePriority(p._idx, "title", e.target.value)
                }
                placeholder="Construction de routes"
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Secteur *</Label>
              <Input
                value={p.sector}
                onChange={(e) =>
                  updatePriority(p._idx, "sector", e.target.value)
                }
                placeholder="BTP, Énergie, Santé..."
                className="h-8 text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Description</Label>
              <Textarea
                value={p.description ?? ""}
                onChange={(e) =>
                  updatePriority(p._idx, "description", e.target.value)
                }
                placeholder="Détails sur cette priorité..."
                rows={2}
                className="text-xs"
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-[10px]">Mots-clés (virgules)</Label>
              <Input
                value={p.keywords.join(", ")}
                onChange={(e) =>
                  updatePriority(
                    p._idx,
                    "keywords",
                    e.target.value
                      .split(",")
                      .map((k) => k.trim())
                      .filter(Boolean)
                  )
                }
                placeholder="routes, infrastructures..."
                className="h-8 text-xs"
              />
            </div>
          </div>
        )}
      </PopoverContent>
    </Popover>
  )

  return (
    <div className="space-y-2.5">
      {/* Barre de recherche intelligente (masquée si externalSearch) */}
      {showSearchBar && priorities.length > 2 && (
        <div className="flex items-center gap-3">
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Rechercher par titre, secteur, mot-clé..."
              className="h-8 pl-9 text-xs"
            />
            {search && (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                onClick={() => setSearch("")}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
          <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
            {filtered.length}/{priorities.length}
          </span>
        </div>
      )}

      {compact ? (
        /* Mode compact : grille 3×3 par page, scroll snap + indicateurs */
        <>
          <div
            ref={scrollRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none" }}
            onScroll={() => {
              if (!scrollRef.current) return
              const el = scrollRef.current
              const page = Math.round(el.scrollLeft / el.clientWidth)
              setActivePage(page)
            }}
          >
            {pages.map((page, pageIdx) => (
              <div
                key={pageIdx}
                className="w-full min-w-full shrink-0 snap-start"
              >
                <div className="grid auto-rows-auto grid-cols-4 gap-2.5">
                  {page.map((p) => renderCard(p))}
                </div>
              </div>
            ))}
          </div>

          {/* Indicateurs de page (pointillés) */}
          {pages.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-2">
              {pages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    scrollRef.current?.scrollTo({
                      left: i * (scrollRef.current?.clientWidth ?? 0),
                      behavior: "smooth",
                    })
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    activePage === i
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-border hover:bg-muted-foreground"
                  )}
                />
              ))}
              <span className="ml-2 text-[9px] text-muted-foreground">
                {activePage + 1}/{pages.length}
              </span>
            </div>
          )}
        </>
      ) : (
        /* Mode normal : une seule ligne horizontale */
        <div
          ref={scrollRef}
          className="flex items-stretch overflow-x-auto scroll-smooth pb-2"
          style={{ scrollbarWidth: "thin" }}
        >
          {filtered.map((p, idx) => (
            <div key={p._idx} className="flex shrink-0 items-stretch">
              {idx > 0 && (
                <div className="flex w-4 items-center justify-center">
                  <div className="h-3/4 border-l-2 border-dotted border-border/40" />
                </div>
              )}
              {renderCard(p)}
            </div>
          ))}
          {!readOnly && (
            <div className="flex shrink-0 items-stretch">
              {filtered.length > 0 && (
                <div className="flex w-4 items-center justify-center">
                  <div className="h-3/4 border-l-2 border-dotted border-border/40" />
                </div>
              )}
              <button
                type="button"
                onClick={addPriority}
                className="flex min-h-[80px] min-w-[120px] flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-border/30 p-3 transition-all hover:border-primary/30 hover:bg-muted/30"
              >
                <Plus className="h-4 w-4 text-muted-foreground" />
                <span className="text-[10px] text-muted-foreground">
                  Ajouter
                </span>
              </button>
            </div>
          )}
        </div>
      )}

      {/* Message vide recherche */}
      {filtered.length === 0 && search && (
        <p className="py-3 text-center text-xs text-muted-foreground">
          Aucune priorité ne correspond à « {search} »
        </p>
      )}
    </div>
  )
}

// ─── Page ───────────────────────────────────────────────────────────────────

type TabId = "global" | "representations" | "targets" | "trash"

const TABS: Array<{ id: TabId; label: string; icon: typeof Globe2 }> = [
  { id: "global", label: "Priorités Générales", icon: Globe2 },
  { id: "representations", label: "Par Représentation", icon: Building2 },
  { id: "targets", label: "Cibles", icon: Target },
  { id: "trash", label: "Corbeille", icon: Trash2 },
]

export default function AffairesDiplomatiquesSettings() {
  const [activeTab, setActiveTab] = useState<TabId>("global")

  return (
    <div className="flex min-h-full w-full flex-1 flex-col gap-4 overflow-auto px-7 pt-6 pb-[60px]">
      {/* En-tête */}
      <PageHeader
        icon={<Globe2 className="h-5 w-5" />}
        title="Affaires Diplomatiques"
        subtitle="Configurez les priorités exécutives et les paramètres diplomatiques pour chaque représentation."
      />

      {/* Onglets horizontaux */}
      <div className="flex items-center gap-1 border-b pb-px">
        {TABS.map((tab) => {
          const Icon = tab.icon
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "-mb-px flex items-center gap-2 rounded-t-lg border-b-2 px-4 py-2 text-sm transition-colors",
                activeTab === tab.id
                  ? "border-primary font-medium text-foreground"
                  : "border-transparent text-muted-foreground hover:border-border hover:text-foreground"
              )}
            >
              <Icon className="h-4 w-4" />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Contenu */}
      {activeTab === "global" && <GlobalPrioritiesTab />}
      {activeTab === "representations" && <RepresentationsTab />}
      {activeTab === "targets" && <TargetsByRepresentationTab />}
      {activeTab === "trash" && <TrashTab />}
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 1 : Priorités Exécutives Générales
// ═════════════════════════════════════════════════════════════════════════════

function GlobalPrioritiesTab() {
  const { data: globalDoc, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getGlobalPriorities,
    {}
  )

  const { mutateAsync: setGlobal, isPending: saving } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.setGlobalPriorities
  )

  const [priorities, setPriorities] = useState<PriorityItem[]>([])
  const [globalSearch, setGlobalSearch] = useState("")
  const [targetsPerSearch, setTargetsPerSearch] = useState(5)
  const [targetLimitPerYear, setTargetLimitPerYear] = useState(50)
  const [initialized, setInitialized] = useState(false)

  // Charger les priorités existantes
  if (globalDoc && !initialized) {
    setPriorities(globalDoc.priorities)
    setTargetsPerSearch(globalDoc.defaultTargetsPerSearch ?? 5)
    setTargetLimitPerYear(globalDoc.defaultTargetLimitPerYear ?? 50)
    setInitialized(true)
  }

  const handleSave = async () => {
    const valid = priorities.filter((p) => p.title.trim() && p.sector.trim())
    if (valid.length === 0) {
      toast.error("Ajoutez au moins une priorité avec un titre et un secteur.")
      return
    }
    try {
      await setGlobal({
        priorities: valid,
        defaultTargetsPerSearch: targetsPerSearch,
        defaultTargetLimitPerYear: targetLimitPerYear,
      })
      toast.success("Priorités générales enregistrées")
    } catch (e) {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6 p-4 md:p-6">
      {/* Recherche + Import + Enregistrer sur la même ligne */}
      <div className="flex items-center gap-3">
        {priorities.length > 2 && (
          <div className="relative flex-1">
            <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={globalSearch}
              onChange={(e) => setGlobalSearch(e.target.value)}
              placeholder="Rechercher par titre, secteur, mot-clé..."
              className="h-9 pl-9 text-xs"
            />
            {globalSearch && (
              <button
                type="button"
                className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                onClick={() => setGlobalSearch("")}
              >
                <X className="h-3 w-3 text-muted-foreground" />
              </button>
            )}
          </div>
        )}
        {!priorities.length && <div className="flex-1" />}

        {/* Cibles par recherche */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            Cibles/recherche
          </span>
          <Input
            type="number"
            min={1}
            max={50}
            value={targetsPerSearch}
            onChange={(e) => setTargetsPerSearch(Number(e.target.value) || 1)}
            className="h-9 w-16 text-center text-xs"
          />
        </div>

        {/* Limite cibles / an */}
        <div className="flex shrink-0 items-center gap-1.5">
          <span className="text-[11px] whitespace-nowrap text-muted-foreground">
            Limite/an
          </span>
          <Input
            type="number"
            min={1}
            max={500}
            value={targetLimitPerYear}
            onChange={(e) => setTargetLimitPerYear(Number(e.target.value) || 1)}
            className="h-9 w-16 text-center text-xs"
          />
        </div>

        <PriorityDocumentImporter
          compact
          onPrioritiesExtracted={(imported) => {
            setPriorities((prev) => {
              const existingTitles = new Set(
                prev.map((p) => p.title.toLowerCase())
              )
              const newOnes = imported.filter(
                (p) => !existingTitles.has(p.title.toLowerCase())
              )
              return [...prev, ...newOnes]
            })
          }}
        />
        <Button
          onClick={handleSave}
          disabled={saving}
          size="sm"
          className="gap-1.5"
        >
          {saving ? (
            <Loader2 className="h-3.5 w-3.5 animate-spin" />
          ) : (
            <Save className="h-3.5 w-3.5" />
          )}
          Enregistrer
        </Button>
      </div>

      {/* Grille compacte de priorités */}
      <PriorityStrip
        priorities={priorities}
        setPriorities={setPriorities}
        compact
        externalSearch={globalSearch}
      />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 2 : Configuration par Représentation
// ═════════════════════════════════════════════════════════════════════════════

// Mapping code pays ISO → zone géographique
const CONTINENT_MAP: Record<string, string> = {
  // Afrique
  CM: "Afrique",
  CG: "Afrique",
  CD: "Afrique",
  GQ: "Afrique",
  TD: "Afrique",
  CF: "Afrique",
  GA: "Afrique",
  ST: "Afrique",
  SN: "Afrique",
  CI: "Afrique",
  GH: "Afrique",
  NG: "Afrique",
  BJ: "Afrique",
  TG: "Afrique",
  BF: "Afrique",
  ML: "Afrique",
  GN: "Afrique",
  NE: "Afrique",
  GM: "Afrique",
  GW: "Afrique",
  SL: "Afrique",
  LR: "Afrique",
  CV: "Afrique",
  MR: "Afrique",
  KE: "Afrique",
  ET: "Afrique",
  TZ: "Afrique",
  UG: "Afrique",
  RW: "Afrique",
  BI: "Afrique",
  DJ: "Afrique",
  ER: "Afrique",
  SO: "Afrique",
  SD: "Afrique",
  SS: "Afrique",
  MG: "Afrique",
  MU: "Afrique",
  SC: "Afrique",
  KM: "Afrique",
  ZA: "Afrique",
  AO: "Afrique",
  MZ: "Afrique",
  ZM: "Afrique",
  ZW: "Afrique",
  BW: "Afrique",
  NA: "Afrique",
  MW: "Afrique",
  LS: "Afrique",
  SZ: "Afrique",
  MA: "Afrique",
  DZ: "Afrique",
  TN: "Afrique",
  LY: "Afrique",
  EG: "Afrique",
  // Europe
  FR: "Europe",
  DE: "Europe",
  GB: "Europe",
  ES: "Europe",
  IT: "Europe",
  BE: "Europe",
  CH: "Europe",
  PT: "Europe",
  NL: "Europe",
  AT: "Europe",
  SE: "Europe",
  NO: "Europe",
  DK: "Europe",
  FI: "Europe",
  IE: "Europe",
  PL: "Europe",
  CZ: "Europe",
  RO: "Europe",
  HU: "Europe",
  GR: "Europe",
  BG: "Europe",
  HR: "Europe",
  SK: "Europe",
  SI: "Europe",
  LT: "Europe",
  LV: "Europe",
  EE: "Europe",
  LU: "Europe",
  MT: "Europe",
  CY: "Europe",
  IS: "Europe",
  MC: "Europe",
  AD: "Europe",
  RS: "Europe",
  BA: "Europe",
  ME: "Europe",
  MK: "Europe",
  AL: "Europe",
  MD: "Europe",
  UA: "Europe",
  BY: "Europe",
  RU: "Europe",
  VA: "Europe",
  // Amérique du Nord
  US: "Amérique du Nord",
  CA: "Amérique du Nord",
  MX: "Amérique du Nord",
  // Amérique Latine & Caraïbes
  BR: "Amérique Latine",
  AR: "Amérique Latine",
  CL: "Amérique Latine",
  CO: "Amérique Latine",
  PE: "Amérique Latine",
  VE: "Amérique Latine",
  EC: "Amérique Latine",
  BO: "Amérique Latine",
  PY: "Amérique Latine",
  UY: "Amérique Latine",
  CR: "Amérique Latine",
  PA: "Amérique Latine",
  CU: "Amérique Latine",
  DO: "Amérique Latine",
  GT: "Amérique Latine",
  HN: "Amérique Latine",
  SV: "Amérique Latine",
  NI: "Amérique Latine",
  HT: "Amérique Latine",
  JM: "Amérique Latine",
  TT: "Amérique Latine",
  // Asie
  CN: "Asie",
  JP: "Asie",
  KR: "Asie",
  IN: "Asie",
  ID: "Asie",
  TH: "Asie",
  VN: "Asie",
  MY: "Asie",
  SG: "Asie",
  PH: "Asie",
  MM: "Asie",
  KH: "Asie",
  LA: "Asie",
  BD: "Asie",
  LK: "Asie",
  NP: "Asie",
  PK: "Asie",
  AF: "Asie",
  KZ: "Asie",
  UZ: "Asie",
  TM: "Asie",
  KG: "Asie",
  TJ: "Asie",
  MN: "Asie",
  TW: "Asie",
  KP: "Asie",
  // Moyen-Orient
  SA: "Moyen-Orient",
  AE: "Moyen-Orient",
  QA: "Moyen-Orient",
  KW: "Moyen-Orient",
  BH: "Moyen-Orient",
  OM: "Moyen-Orient",
  IL: "Moyen-Orient",
  JO: "Moyen-Orient",
  LB: "Moyen-Orient",
  IQ: "Moyen-Orient",
  IR: "Moyen-Orient",
  SY: "Moyen-Orient",
  YE: "Moyen-Orient",
  TR: "Moyen-Orient",
  PS: "Moyen-Orient",
  // Océanie
  AU: "Océanie",
  NZ: "Océanie",
  FJ: "Océanie",
  PG: "Océanie",
}

const ZONE_ORDER = [
  "Afrique",
  "Europe",
  "Amérique du Nord",
  "Amérique Latine",
  "Asie",
  "Moyen-Orient",
  "Océanie",
  "Autres",
]

function getContinent(countryCode: string): string {
  return CONTINENT_MAP[countryCode?.toUpperCase()] ?? "Autres"
}

function RepresentationsTab() {
  const { data: orgs, isPending } = useAuthenticatedConvexQuery(
    api.functions.orgs.list,
    {}
  )

  const [selectedOrgId, setSelectedOrgId] = useState<Id<"orgs"> | null>(null)
  const [filter, setFilter] = useState("")
  const [activeZone, setActiveZone] = useState<string | null>(null)
  const [repPage, setRepPage] = useState(0)
  const repScrollRef = useRef<HTMLDivElement>(null)

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  // Filtrage par recherche
  const filteredOrgs =
    orgs?.filter(
      (o) =>
        o.isActive &&
        (!filter ||
          o.name.toLowerCase().includes(filter.toLowerCase()) ||
          o.address?.country?.toLowerCase().includes(filter.toLowerCase()))
    ) ?? []

  // Grouper par zone géographique
  const zoneGroups = useMemo(() => {
    const groups: Record<string, typeof filteredOrgs> = {}
    for (const org of filteredOrgs) {
      const zone = getContinent(org.address?.country ?? "")
      if (!groups[zone]) groups[zone] = []
      groups[zone].push(org)
    }
    return groups
  }, [filteredOrgs])

  // Zones disponibles triées
  const availableZones = useMemo(
    () => ZONE_ORDER.filter((z) => zoneGroups[z]?.length),
    [zoneGroups]
  )

  // Organisations filtrées par zone active
  const displayOrgs = activeZone ? (zoneGroups[activeZone] ?? []) : filteredOrgs

  // Pages de 20 (5 colonnes × 4 lignes)
  const repPages: (typeof displayOrgs)[] = []
  for (let i = 0; i < displayOrgs.length; i += 20) {
    repPages.push(displayOrgs.slice(i, i + 20))
  }

  return (
    <div className="space-y-4">
      {/* Ligne 1 : Recherche + Filtre par zone */}
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une représentation..."
            value={filter}
            onChange={(e) => {
              setFilter(e.target.value)
              setRepPage(0)
            }}
            className="pl-9"
          />
          {filter && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
              onClick={() => {
                setFilter("")
                setRepPage(0)
              }}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
          {displayOrgs.length} représentation{displayOrgs.length > 1 ? "s" : ""}
        </span>
      </div>

      {/* Filtres par zone géographique */}
      <div
        className="flex items-center gap-1.5 overflow-x-auto pb-1"
        style={{ scrollbarWidth: "none" }}
      >
        <button
          type="button"
          onClick={() => {
            setActiveZone(null)
            setRepPage(0)
          }}
          className={cn(
            "shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
            !activeZone
              ? "bg-primary font-medium text-primary-foreground"
              : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
          )}
        >
          Toutes ({filteredOrgs.length})
        </button>
        {availableZones.map((zone) => (
          <button
            key={zone}
            type="button"
            onClick={() => {
              setActiveZone(zone)
              setRepPage(0)
            }}
            className={cn(
              "shrink-0 rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
              activeZone === zone
                ? "bg-primary font-medium text-primary-foreground"
                : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
            )}
          >
            {zone} ({zoneGroups[zone]?.length})
          </button>
        ))}
      </div>

      {/* Grille 5×3 par page avec scroll snap */}
      {repPages.length > 0 ? (
        <>
          <div
            ref={repScrollRef}
            className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth"
            style={{ scrollbarWidth: "none" }}
            onScroll={() => {
              if (!repScrollRef.current) return
              const el = repScrollRef.current
              const page = Math.round(el.scrollLeft / el.clientWidth)
              setRepPage(page)
            }}
          >
            {repPages.map((page, pageIdx) => (
              <div
                key={pageIdx}
                className="w-full min-w-full shrink-0 snap-start"
              >
                <div className="grid auto-rows-auto grid-cols-5 gap-3">
                  {page.map((org) => (
                    <OrgPriorityCard
                      key={org._id}
                      orgId={org._id}
                      orgName={org.name}
                      orgCountry={org.address?.country ?? ""}
                      onConfigure={() => setSelectedOrgId(org._id)}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Indicateurs de page */}
          {repPages.length > 1 && (
            <div className="flex items-center justify-center gap-1.5 pt-1">
              {repPages.map((_, i) => (
                <button
                  key={i}
                  type="button"
                  onClick={() => {
                    repScrollRef.current?.scrollTo({
                      left: i * (repScrollRef.current?.clientWidth ?? 0),
                      behavior: "smooth",
                    })
                  }}
                  className={cn(
                    "h-1.5 rounded-full transition-all",
                    repPage === i
                      ? "w-4 bg-primary"
                      : "w-1.5 bg-border hover:bg-muted-foreground"
                  )}
                />
              ))}
              <span className="ml-2 text-[9px] text-muted-foreground">
                {repPage + 1}/{repPages.length}
              </span>
            </div>
          )}
        </>
      ) : (
        <p className="py-8 text-center text-sm text-muted-foreground">
          Aucune représentation trouvée.
        </p>
      )}

      {/* Dialog de configuration locale */}
      {selectedOrgId &&
        (() => {
          const selectedOrg = filteredOrgs.find((o) => o._id === selectedOrgId)
          return (
            <OrgLocalPriorityDialog
              orgId={selectedOrgId}
              orgName={selectedOrg?.name ?? ""}
              open={!!selectedOrgId}
              onOpenChange={(open) => !open && setSelectedOrgId(null)}
            />
          )
        })()}
    </div>
  )
}

function OrgPriorityCard({
  orgId,
  orgName,
  orgCountry,
  onConfigure,
}: {
  orgId: Id<"orgs">
  orgName: string
  orgCountry: string
  onConfigure: () => void
}) {
  const { data: localDoc } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getLocalPriorities,
    { orgId }
  )

  const isConfigured = localDoc && localDoc.priorities.length > 0

  return (
    <button
      type="button"
      onClick={onConfigure}
      className={cn(
        "flex h-[108px] flex-col gap-2 rounded-xl border bg-secondary p-3",
        "cursor-pointer transition-all hover:border-primary/30",
        isConfigured && "border-primary/20"
      )}
    >
      {/* Ligne 1 : icône — code pays — statut */}
      <div className="flex w-full items-center justify-between">
        <div
          className={cn(
            "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
            isConfigured ? "bg-primary/10" : "bg-muted/50"
          )}
        >
          <Building2
            className={cn(
              "h-4 w-4",
              isConfigured ? "text-primary" : "text-muted-foreground"
            )}
          />
        </div>
        <span className="text-base font-semibold text-muted-foreground">
          {orgCountry}
        </span>
        {isConfigured ? (
          <Badge variant="secondary" className="shrink-0 text-[11px]">
            {localDoc.priorities.length} priorités
          </Badge>
        ) : (
          <Badge
            variant="outline"
            className="shrink-0 text-[11px] text-muted-foreground"
          >
            Non configuré
          </Badge>
        )}
      </div>
      {/* Ligne 2 : nom */}
      <p className="line-clamp-2 w-full text-left text-sm leading-tight font-medium">
        {orgName}
      </p>
    </button>
  )
}

function OrgLocalPriorityDialog({
  orgId,
  orgName,
  open,
  onOpenChange,
}: {
  orgId: Id<"orgs">
  orgName: string
  open: boolean
  onOpenChange: (open: boolean) => void
}) {
  const { data: localDoc } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.getLocalPriorities,
    { orgId }
  )

  const { mutateAsync: setLocal, isPending: saving } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.setLocalPriorities
  )

  const [priorities, setPriorities] = useState<PriorityItem[]>(
    localDoc?.priorities ?? []
  )
  const [hostCountry, setHostCountry] = useState(localDoc?.hostCountry ?? "")
  const [hostCountryCode, setHostCountryCode] = useState(
    localDoc?.hostCountryCode ?? ""
  )
  const [coveredCountries, setCoveredCountries] = useState<
    Array<{ name: string; code?: string }>
  >(localDoc?.coveredCountries ?? [])
  const [localSearch, setLocalSearch] = useState("")
  const [initialized, setInitialized] = useState(false)

  if (localDoc && !initialized) {
    setPriorities(localDoc.priorities)
    setHostCountry(localDoc.hostCountry ?? "")
    setHostCountryCode(localDoc.hostCountryCode ?? "")
    setCoveredCountries(localDoc.coveredCountries ?? [])
    setInitialized(true)
  }

  const canSave = hostCountry.trim().length > 0

  const handleSave = async () => {
    if (!canSave) {
      toast.error("Le pays hôte est obligatoire pour activer la recherche IA")
      return
    }
    try {
      await setLocal({
        orgId,
        hostCountry: hostCountry.trim(),
        hostCountryCode: hostCountryCode.trim().toUpperCase() || undefined,
        coveredCountries: coveredCountries
          .map((c) => ({
            name: c.name.trim(),
            code: c.code?.trim().toUpperCase() || undefined,
          }))
          .filter((c) => c.name.length > 0),
        priorities: priorities.filter((p) => p.title.trim()),
      })
      toast.success(`Priorités de ${orgName} enregistrées`)
      onOpenChange(false)
    } catch {
      toast.error("Erreur lors de l'enregistrement")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-4xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5 text-primary" />
            {orgName}
          </DialogTitle>
          <DialogDescription>
            Priorités stratégiques propres au chef de mission.
          </DialogDescription>
        </DialogHeader>

        <div className="mt-2 space-y-4">
          {/* Recherche + Import + Actions */}
          <div className="flex items-center gap-3">
            <div className="relative flex-1">
              <Search className="absolute top-1/2 left-3 h-3.5 w-3.5 -translate-y-1/2 text-muted-foreground" />
              <Input
                value={localSearch}
                onChange={(e) => setLocalSearch(e.target.value)}
                placeholder="Rechercher par titre, secteur, mot-clé..."
                className="h-9 pl-9 text-xs"
              />
              {localSearch && (
                <button
                  type="button"
                  className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
                  onClick={() => setLocalSearch("")}
                >
                  <X className="h-3 w-3 text-muted-foreground" />
                </button>
              )}
            </div>
            <PriorityDocumentImporter
              compact
              onPrioritiesExtracted={(imported) => {
                setPriorities((prev) => {
                  const existingTitles = new Set(
                    prev.map((p) => p.title.toLowerCase())
                  )
                  const newOnes = imported.filter(
                    (p) => !existingTitles.has(p.title.toLowerCase())
                  )
                  return [...prev, ...newOnes]
                })
              }}
            />
            <Button
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
            >
              Annuler
            </Button>
            <Button
              size="sm"
              onClick={handleSave}
              disabled={saving || !canSave}
              className="gap-1.5"
            >
              {saving ? (
                <Loader2 className="h-3.5 w-3.5 animate-spin" />
              ) : (
                <Save className="h-3.5 w-3.5" />
              )}
              Enregistrer
            </Button>
          </div>

          {/* Pays hôte et juridiction — indispensables à la recherche IA */}
          <div className="space-y-3 rounded-lg border bg-card p-4">
            <div className="flex items-center gap-2">
              <MapPin className="h-4 w-4 text-primary" />
              <p className="text-sm font-medium">Juridiction de la représentation</p>
            </div>
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1fr_120px]">
              <div className="space-y-1.5">
                <Label className="text-[10px]">Pays hôte *</Label>
                <Input
                  value={hostCountry}
                  onChange={(e) => setHostCountry(e.target.value)}
                  placeholder="France, Espagne, Belgique..."
                  className="h-9 text-xs"
                />
                <p className="text-[10px] text-muted-foreground">
                  Indispensable pour la recherche IA de cibles.
                </p>
              </div>
              <div className="space-y-1.5">
                <Label className="text-[10px]">Code ISO</Label>
                <Input
                  value={hostCountryCode}
                  onChange={(e) =>
                    setHostCountryCode(e.target.value.toUpperCase().slice(0, 2))
                  }
                  placeholder="FR"
                  maxLength={2}
                  className="h-9 text-xs uppercase"
                />
                <p className="text-[10px] text-muted-foreground">2 lettres</p>
              </div>
            </div>

            {/* Pays couverts (juridiction élargie) */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <Label className="text-[10px]">
                  Pays couverts (juridiction élargie)
                </Label>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-[10px]"
                  onClick={() =>
                    setCoveredCountries((prev) => [
                      ...prev,
                      { name: "", code: "" },
                    ])
                  }
                >
                  <Plus className="h-3 w-3" />
                  Ajouter un pays
                </Button>
              </div>
              {coveredCountries.length === 0 ? (
                <p className="text-[10px] text-muted-foreground">
                  Aucun pays supplémentaire. La représentation couvre uniquement
                  le pays hôte.
                </p>
              ) : (
                <div className="space-y-1.5">
                  {coveredCountries.map((country, idx) => (
                    <div
                      key={idx}
                      className="flex items-center gap-2"
                    >
                      <Input
                        value={country.name}
                        onChange={(e) =>
                          setCoveredCountries((prev) =>
                            prev.map((c, i) =>
                              i === idx ? { ...c, name: e.target.value } : c
                            )
                          )
                        }
                        placeholder="Nom du pays"
                        className="h-8 flex-1 text-xs"
                      />
                      <Input
                        value={country.code ?? ""}
                        onChange={(e) =>
                          setCoveredCountries((prev) =>
                            prev.map((c, i) =>
                              i === idx
                                ? {
                                    ...c,
                                    code: e.target.value
                                      .toUpperCase()
                                      .slice(0, 2),
                                  }
                                : c
                            )
                          )
                        }
                        placeholder="ISO"
                        maxLength={2}
                        className="h-8 w-16 text-xs uppercase"
                      />
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8 text-muted-foreground hover:text-destructive"
                        onClick={() =>
                          setCoveredCountries((prev) =>
                            prev.filter((_, i) => i !== idx)
                          )
                        }
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Grille compacte de priorités locales */}
          <PriorityStrip
            priorities={priorities}
            setPriorities={setPriorities}
            compact
            externalSearch={localSearch}
          />
        </div>
      </DialogContent>
    </Dialog>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 3 : Cibles par Représentation
// ═════════════════════════════════════════════════════════════════════════════

function TargetsByRepresentationTab() {
  const { data: allTargets, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.superadminListAllTargets,
    {}
  )

  const { mutateAsync: deleteTarget } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminDeleteTarget
  )
  const { mutateAsync: purgeTargets } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminPurgeTargets
  )

  const [filter, setFilter] = useState("")
  const [statusFilter, setStatusFilter] = useState<
    "all" | "active" | "archived"
  >("all")
  const [confirmDelete, setConfirmDelete] = useState<{
    id: string
    name: string
  } | null>(null)
  const [confirmPurge, setConfirmPurge] = useState<{
    orgId: string
    orgName: string
    count: number
  } | null>(null)

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const targets = allTargets ?? []
  const activeCount = targets.filter((t) => !t.archivedAt).length
  const archivedCount = targets.filter((t) => !!t.archivedAt).length

  const filtered = targets.filter((t) => {
    // Filtre par statut
    if (statusFilter === "active" && t.archivedAt) return false
    if (statusFilter === "archived" && !t.archivedAt) return false
    // Filtre par texte
    if (!filter) return true
    const q = filter.toLowerCase()
    return (
      t.name.toLowerCase().includes(q) ||
      t.orgName.toLowerCase().includes(q) ||
      t.sector?.toLowerCase().includes(q)
    )
  })

  // Grouper par org
  const byOrg: Record<
    string,
    { orgName: string; orgId: string; targets: typeof filtered }
  > = {}
  for (const t of filtered) {
    const key = t.orgId
    if (!byOrg[key])
      byOrg[key] = { orgName: t.orgName, orgId: t.orgId, targets: [] }
    byOrg[key].targets.push(t)
  }

  const handleDelete = async () => {
    if (!confirmDelete) return
    try {
      await deleteTarget({
        targetId: confirmDelete.id as Id<"diplomaticTargets">,
      })
      toast.success(`${confirmDelete.name} supprimée`)
      setConfirmDelete(null)
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const handlePurge = async () => {
    if (!confirmPurge) return
    try {
      const result = await purgeTargets({
        orgId: confirmPurge.orgId as Id<"orgs">,
      })
      toast.success(`${result.scheduledCount} cible(s) supprimée(s)`)
      setConfirmPurge(null)
    } catch {
      toast.error("Erreur lors de la purge")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher une cible ou représentation..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
          {filter && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
              onClick={() => setFilter("")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          {(
            [
              { id: "all" as const, label: "Toutes", count: targets.length },
              { id: "active" as const, label: "Actives", count: activeCount },
              {
                id: "archived" as const,
                label: "Archivées",
                count: archivedCount,
              },
            ] as const
          ).map((s) => (
            <button
              key={s.id}
              type="button"
              onClick={() => setStatusFilter(s.id)}
              className={cn(
                "rounded-full px-3 py-1 text-xs whitespace-nowrap transition-colors",
                statusFilter === s.id
                  ? "bg-primary font-medium text-primary-foreground"
                  : "bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground"
              )}
            >
              {s.label} ({s.count})
            </button>
          ))}
        </div>
        <span className="shrink-0 text-[10px] text-muted-foreground tabular-nums">
          {filtered.length} résultat{filtered.length > 1 ? "s" : ""}
        </span>
      </div>

      {Object.keys(byOrg).length === 0 ? (
        <div className="py-12 text-center text-sm text-muted-foreground">
          <Target className="mx-auto mb-2 h-8 w-8 opacity-30" />
          Aucune cible trouvée
        </div>
      ) : (
        <div className="space-y-6">
          {Object.entries(byOrg).map(([orgId, group]) => (
            <div key={orgId} className="space-y-2">
              <div className="flex items-center justify-between">
                <h3 className="flex items-center gap-2 text-sm font-medium">
                  <Building2 className="h-4 w-4 text-primary" />
                  {group.orgName}
                  <Badge variant="secondary" className="text-[9px]">
                    {group.targets.length}
                  </Badge>
                </h3>
                <Button
                  variant="ghost"
                  size="sm"
                  className="gap-1.5 text-xs text-destructive hover:text-destructive"
                  onClick={() =>
                    setConfirmPurge({
                      orgId: group.orgId,
                      orgName: group.orgName,
                      count: group.targets.length,
                    })
                  }
                >
                  <Trash2 className="h-3 w-3" />
                  Purger
                </Button>
              </div>
              <div className="grid grid-cols-1 gap-2 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {group.targets.map((t) => (
                  <div
                    key={t._id}
                    className={cn(
                      "flex items-start justify-between gap-2 rounded-lg border p-3 transition-colors",
                      t.archivedAt
                        ? "border-amber-500/20 bg-amber-500/5"
                        : "bg-secondary"
                    )}
                  >
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-1.5">
                        <p className="truncate text-sm font-medium">{t.name}</p>
                        {t.archivedAt && (
                          <Badge
                            variant="outline"
                            className="shrink-0 border-amber-500/30 text-[8px] text-amber-500"
                          >
                            Archivé
                          </Badge>
                        )}
                      </div>
                      <p className="truncate text-[10px] text-muted-foreground">
                        {t.type} {t.sector && `· ${t.sector}`}
                      </p>
                      {t.country && (
                        <p className="mt-0.5 flex items-center gap-1 text-[10px] text-muted-foreground">
                          <MapPin className="h-2.5 w-2.5" />
                          {t.city ? `${t.city}, ${t.country}` : t.country}
                        </p>
                      )}
                      <div className="mt-1 flex items-center gap-1">
                        <Badge variant="outline" className="text-[8px]">
                          {t.priority}
                        </Badge>
                        {t.opportunityScore != null && (
                          <Badge
                            variant="outline"
                            className="text-[8px] text-primary"
                          >
                            {t.opportunityScore}%
                          </Badge>
                        )}
                        {t.pipelinePhase && (
                          <Badge variant="secondary" className="text-[8px]">
                            {t.pipelinePhase}
                          </Badge>
                        )}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-7 w-7 shrink-0 text-destructive hover:bg-destructive/10 hover:text-destructive"
                      onClick={() =>
                        setConfirmDelete({ id: t._id, name: t.name })
                      }
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Confirmation suppression individuelle */}
      <AlertDialog
        open={!!confirmDelete}
        onOpenChange={(o) => !o && setConfirmDelete(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Supprimer cette cible ?</AlertDialogTitle>
            <AlertDialogDescription>
              <strong>{confirmDelete?.name}</strong> sera définitivement
              supprimée avec tous ses documents, plans, lettres et projets.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={handleDelete}
            >
              Supprimer
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {/* Confirmation purge */}
      <AlertDialog
        open={!!confirmPurge}
        onOpenChange={(o) => !o && setConfirmPurge(null)}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Purger les cibles de {confirmPurge?.orgName} ?
            </AlertDialogTitle>
            <AlertDialogDescription>
              {confirmPurge?.count} cible(s) seront définitivement supprimées
              avec tous leurs documents associés. Cette action est irréversible.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Annuler</AlertDialogCancel>
            <AlertDialogAction
              className="text-destructive-foreground bg-destructive hover:bg-destructive/90"
              onClick={handlePurge}
            >
              Purger toutes les cibles
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
// ONGLET 4 : Corbeille
// ═════════════════════════════════════════════════════════════════════════════

function TrashTab() {
  const { data: deletedItems, isPending } = useAuthenticatedConvexQuery(
    api.functions.diplomaticAffairs.superadminListDeletedItems,
    {}
  )

  const { mutateAsync: restoreTarget } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminRestoreTarget
  )
  const { mutateAsync: restorePlan } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminRestorePlan
  )
  const { mutateAsync: restoreLetter } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminRestoreLetter
  )
  const { mutateAsync: restoreReport } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminRestoreReport
  )
  const { mutateAsync: restoreProject } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminRestoreProject
  )
  const { mutateAsync: hardDelete } = useConvexMutationQuery(
    api.functions.diplomaticAffairs.superadminPermanentlyDeleteTarget
  )

  const [filter, setFilter] = useState("")

  if (isPending) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    )
  }

  const items = deletedItems ?? {
    targets: [],
    plans: [],
    letters: [],
    reports: [],
    projects: [],
  }

  const totalDeleted =
    items.targets.length +
    items.plans.length +
    items.letters.length +
    items.reports.length +
    items.projects.length

  if (totalDeleted === 0) {
    return (
      <div className="py-16 text-center text-sm text-muted-foreground">
        <Trash2 className="mx-auto mb-3 h-10 w-10 opacity-20" />
        <p className="font-medium">Corbeille vide</p>
        <p className="mt-1 text-xs">Les éléments supprimés apparaîtront ici.</p>
      </div>
    )
  }

  const formatDeletedAt = (ts: number | undefined) => {
    if (!ts) return ""
    return new Date(ts).toLocaleDateString("fr-FR", {
      day: "numeric",
      month: "short",
      year: "numeric",
    })
  }

  const matchesFilter = (name: string, orgName: string) => {
    if (!filter) return true
    const q = filter.toLowerCase()
    return name.toLowerCase().includes(q) || orgName.toLowerCase().includes(q)
  }

  const handleRestore = async (type: string, id: string) => {
    try {
      switch (type) {
        case "target":
          await restoreTarget({ targetId: id as Id<"diplomaticTargets"> })
          break
        case "plan":
          await restorePlan({ planId: id as Id<"diplomaticPlans"> })
          break
        case "letter":
          await restoreLetter({ letterId: id as Id<"diplomaticLetters"> })
          break
        case "report":
          await restoreReport({ reportId: id as Id<"diplomaticReports"> })
          break
        case "project":
          await restoreProject({ projectId: id as Id<"diplomaticProjects"> })
          break
      }
      toast.success("Élément restauré")
    } catch {
      toast.error("Erreur lors de la restauration")
    }
  }

  const handleHardDelete = async (targetId: string) => {
    try {
      await hardDelete({ targetId: targetId as Id<"diplomaticTargets"> })
      toast.success("Supprimé définitivement")
    } catch {
      toast.error("Erreur lors de la suppression")
    }
  }

  const renderSection = (
    title: string,
    items: Array<{
      _id: string
      deletedAt?: number
      orgName: string
      [key: string]: any
    }>,
    type: string,
    getLabel: (item: any) => string,
    getSublabel: (item: any) => string
  ) => {
    const matching = items.filter((i) => matchesFilter(getLabel(i), i.orgName))
    if (matching.length === 0) return null

    return (
      <div className="space-y-2">
        <h3 className="flex items-center gap-2 text-sm font-medium">
          <AlertTriangle className="h-4 w-4 text-amber-500" />
          {title}
          <Badge variant="secondary" className="text-[9px]">
            {matching.length}
          </Badge>
        </h3>
        <div className="space-y-1">
          {matching.map((item) => (
            <div
              key={item._id}
              className="flex items-center justify-between gap-3 rounded-lg border border-dashed border-destructive/20 bg-destructive/5 p-2.5"
            >
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium">{getLabel(item)}</p>
                <p className="text-[10px] text-muted-foreground">
                  {getSublabel(item)} · {item.orgName} · Supprimé le{" "}
                  {formatDeletedAt(item.deletedAt)}
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-7 gap-1 text-xs"
                  onClick={() => handleRestore(type, item._id)}
                >
                  <RotateCcw className="h-3 w-3" />
                  Restaurer
                </Button>
                {type === "target" && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 gap-1 text-xs text-destructive hover:text-destructive"
                    onClick={() => handleHardDelete(item._id)}
                  >
                    <Trash2 className="h-3 w-3" />
                    Définitif
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <div className="relative max-w-sm flex-1">
          <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Rechercher dans la corbeille..."
            value={filter}
            onChange={(e) => setFilter(e.target.value)}
            className="pl-9"
          />
          {filter && (
            <button
              type="button"
              className="absolute top-1/2 right-2 -translate-y-1/2 rounded p-0.5 hover:bg-muted"
              onClick={() => setFilter("")}
            >
              <X className="h-3.5 w-3.5 text-muted-foreground" />
            </button>
          )}
        </div>
        <span className="text-[10px] text-muted-foreground tabular-nums">
          {totalDeleted} élément{totalDeleted > 1 ? "s" : ""} dans la corbeille
        </span>
      </div>

      {renderSection(
        "Cibles supprimées",
        items.targets,
        "target",
        (t) => t.name,
        (t) => `${t.type} · ${t.sector ?? ""}`
      )}
      {renderSection(
        "Plans supprimés",
        items.plans,
        "plan",
        (p) => p.title,
        (p) => p.category ?? ""
      )}
      {renderSection(
        "Lettres supprimées",
        items.letters,
        "letter",
        (l) => l.subject ?? l.reference,
        (l) => l.type ?? ""
      )}
      {renderSection(
        "Rapports supprimés",
        items.reports,
        "report",
        (r) => r.title,
        (r) => r.type ?? ""
      )}
      {renderSection(
        "Projets supprimés",
        items.projects,
        "project",
        (p) => p.title,
        (p) => p.projectType ?? ""
      )}
    </div>
  )
}
