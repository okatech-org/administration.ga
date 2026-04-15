# Design System iProfil — Espace Utilisateur `citizen-web`
## *« Slate Trust & Authority »*

> **Version :** 2.0 — Avril 2026  
> **Source de vérité :** Page iProfil (dashboard) + tableau de bord mobile  
> **Stack :** Next.js 14 App Router · Tailwind CSS v4 · Shadcn/ui · Framer Motion · Lucide React  
> **Font :** Inter Variable (corps) · Plus Jakarta Sans Variable (headings)

---

## Table des matières

1. [Philosophie & Principes Fondamentaux](#1-philosophie--principes-fondamentaux)
2. [Architecture de Layout](#2-architecture-de-layout)
3. [Système de Conteneurs](#3-système-de-conteneurs)
4. [Palette de Couleurs Complète](#4-palette-de-couleurs-complète)
5. [Typographie & Hiérarchie Textuelle](#5-typographie--hiérarchie-textuelle)
6. [Iconographie & IconBox](#6-iconographie--iconbox)
7. [Composants Réutilisables — Inventaire](#7-composants-réutilisables--inventaire)
8. [Système d'Alertes, Badges & Statuts](#8-système-dalertes-badges--statuts)
9. [Boutons & Interactions](#9-boutons--interactions)
10. [Navigation Mobile & Desktop](#10-navigation-mobile--desktop)
11. [Animations & Micro-interactions](#11-animations--micro-interactions)
12. [CSS Variables & Tokens Globaux](#12-css-variables--tokens-globaux)
13. [Scrollbar, Accessibilité & Conventions](#13-scrollbar-accessibilité--conventions)
14. [Prompt IA Exécutable & Strict](#14-prompt-ia-exécutable--strict)

---

## 1. Philosophie & Principes Fondamentaux

### 1.1. L'ADN visuel

L'espace utilisateur iProfil incarne l'**autorité institutionnelle douce** — une interface qui respire la **confiance**, la **compétence** et le **premium** sans recourir à des effets voyants. Chaque pixel est au service de la **lisibilité**, de la **hiérarchie** et du **calme visuel**.

### 1.2. Les 7 piliers du design

| # | Pilier | Règle |
|---|--------|-------|
| 1 | **Zéro ombre** | `box-shadow: none !important` sur tout l'espace. L'élévation est signifiée par la **couleur de fond**, jamais par des ombres portées. |
| 2 | **Zéro bordure visible** | Les conteneurs `FlatCard` n'ont PAS de bordure. La séparation visuelle vient du **contraste de fond** entre le parent et l'enfant. |
| 3 | **Coins arrondis généreux** | `rounded-xl` (12px) sur les FlatCard, `rounded-lg` (8px) sur les sous-éléments, `rounded-md` (6px) sur les IconBox. |
| 4 | **Mobile-first absolu** | L'interface mobile est la **référence**. Le desktop est une extension en Bento Grid. |
| 5 | **Couleurs tamisées** | Pas de blanc pur (#FFFFFF) comme fond de carte en light mode. Utiliser `#F4F3ED` (beige tamisé). Pas de noir pur en dark mode : utiliser `#171616`. |
| 6 | **Typographie dense** | Tailles compactes (10px à 15px), poids variables (`font-medium` à `font-black`), pas de `font-normal` sur les métriques. |
| 7 | **Semantic-only accent** | Les couleurs vives (ambre, rose, vert, bleu) sont **réservées aux statuts et alertes**. L'interface neutre reste en nuances de gris/beige. |

---

## 2. Architecture de Layout

### 2.1. Structure Globale de l'Espace

```
┌──────────────────────────────────────────────────────────────┐
│ MySpaceWrapper (citizen-layout)                              │
│ ├── Sidebar (desktop: md:block, FlatCard, collapsible)       │
│ ├── main (flex-1, overflow, padding)                         │
│ │   └── {Page Content}                                       │
│ ├── MobileNavBar (mobile: fixed bottom, md:hidden)           │
│ └── CitizenIAstedWindow (overlay)                            │
└──────────────────────────────────────────────────────────────┘
```

**Code CSS du conteneur racine :**
```tsx
<div className="citizen-layout relative flex h-dvh flex-col overflow-hidden md:flex-row md:h-screen">
```

**Main content :**
```tsx
<main className="flex-1 overflow-hidden md:overflow-y-auto citizen-scrollbar px-3 min-[400px]:px-4 pt-3 pb-18 md:px-4 md:pt-4 md:pb-4">
```

> [!IMPORTANT]
> Le `pb-18` mobile compense la hauteur de la `MobileNavBar` fixée en bas (60px + safe-area-inset-bottom).

### 2.2. Mobile : Scroll Horizontal Snap (Zéro scroll vertical)

L'espace dashboard mobile utilise un **système de pagination horizontale snap** qui élimine tout scroll vertical de la fenêtre principale.

```tsx
{/* Conteneur snap horizontal */}
<div className="disable-scrollbars flex h-[calc(100%-0.5rem)] snap-x snap-mandatory overflow-x-auto lg:hidden">
  {/* Page 1 — Profil & Actions (non-scrollable) */}
  <div className="h-full w-full shrink-0 snap-start overflow-hidden">
    <div className="flex h-full flex-col gap-2.5">
      <FlatCard className="min-h-0 flex-3">{/* Hero profil */}</FlatCard>
      <FlatCard className="min-h-0 flex-2">{/* Démarches */}</FlatCard>
      <FlatCard className="min-h-0 flex-2">{/* RDV */}</FlatCard>
    </div>
  </div>
  
  {/* Page 2 — Actualités (scrollable verticalement) */}
  <div className="citizen-scrollbar h-full w-full shrink-0 snap-start overflow-y-auto p-1">
    <FlatCard className="flex min-h-full flex-col">...</FlatCard>
  </div>
</div>
```

**Règles de proportions flex :**
| Classe | Proportion | Usage |
|--------|-----------|-------|
| `flex-3` | 3 parts | Hero profil (plus grande carte) |
| `flex-2` | 2 parts | Démarches, RDV (cartes secondaires) |
| `flex-1` | 1 part | Widgets compacts |

**Navigation latérale flottante :**
```tsx
{/* Badge vertical fixé à droite */}
<motion.button className="fixed top-1/2 right-0 z-50 -translate-y-1/2 rounded-l-full bg-foreground/47 px-1 py-8 text-xs font-bold tracking-widest text-background uppercase dark:bg-foreground/25">
  <span className="block rotate-180 whitespace-nowrap [writing-mode:vertical-rl]">
    Actualités
  </span>
</motion.button>
```

### 2.3. Desktop : Bento Grid 12 Colonnes

```tsx
<div className="hidden h-full gap-5 overflow-hidden lg:grid lg:grid-cols-12">
  {/* COL 1 — Hero & Carte (3/12) */}
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
    {/* FlatCard Hero, Carte Consulaire, Mon Dossier, Enfants */}
  </div>

  {/* COL 2 — Données & Activité (5/12) */}
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-5">
    {/* Démarches, RDV, Contacts d'urgence */}
  </div>

  {/* COL 3 — Widgets & Actualités (4/12) */}
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-4">
    {/* Alertes, iCV, Actualités */}
  </div>
</div>
```

**Distribution des colonnes :**
| Colonne | Span | Contenu | Scrollable |
|---------|------|---------|-----------|
| Col 1 | `col-span-3` | Hero profil, Carte Consulaire, Mon Dossier, Enfants | `overflow-y-auto` |
| Col 2 | `col-span-5` | Démarches en cours, RDV, Contacts d'urgence | `overflow-y-auto` |
| Col 3 | `col-span-4` | Alertes, iCV, Actualités | `overflow-y-auto` |

### 2.4. Pages Secondaires (Hors Dashboard)

Les pages secondaires (iDocument, iAgenda, Paramètres…) utilisent un layout plus simple :

```tsx
<div className="flex h-full flex-col overflow-hidden">
  <PageHeader title="Titre" icon={<Icon />} showBackButton />
  <div className="flex-1 overflow-y-auto citizen-scrollbar mt-4 space-y-4">
    <FlatCard>...</FlatCard>
    <FlatCard>...</FlatCard>
  </div>
</div>
```

---

## 3. Système de Conteneurs

### 3.1. `FlatCard` — Le Conteneur Roi

**TOUT** élément structurel dans l'espace utilisateur vit dans une `FlatCard`. Ce n'est PAS une carte traditionnelle avec ombre portée, mais un **conteneur plat** dont la couleur de fond crée la hiérarchie.

```tsx
// Implémentation exacte
export function FlatCard({ children, className, ...props }: FlatCardProps) {
  return (
    <div
      className={cn(
        "rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden",
        className
      )}
      {...props}
    >
      {children}
    </div>
  );
}
```

| Propriété | Valeur | Notes |
|-----------|--------|-------|
| `border-radius` | `rounded-xl` (12px) | Jamais `rounded-2xl` ni `rounded-lg` sur le conteneur principal |
| `background` (light) | `#F4F3ED` | Beige tamisé, JAMAIS blanc pur |
| `background` (dark) | `#171616` | Anthracite profond, JAMAIS noir pur |
| `padding` | `p-0` | Le padding est **toujours** sur le div enfant interne, PAS sur la FlatCard |
| `overflow` | `overflow-hidden` | Coupe les coins arrondis des enfants |
| `shadow` | **aucune** | Règle absolue : zéro ombre |
| `border` | **aucune** | Règle absolue : zéro bordure |

### 3.2. Sous-Conteneurs (Inner Cards)

Les éléments interactifs **à l'intérieur** d'une FlatCard utilisent un fond légèrement différent pour créer de la profondeur :

```tsx
{/* Sous-conteneur standard */}
<div className="rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
  ...
</div>

{/* Sous-conteneur avec hover */}
<Link className="rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5 transition-colors hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80">
  ...
</Link>
```

| Propriété | Light | Dark |
|-----------|-------|------|
| Fond au repos | `bg-[#FDFCFA]` | `bg-[#21201E]/77` |
| Fond au survol | `bg-[#FDFCFA]/80` | `bg-[#21201E]/80` |
| Coins | `rounded-lg` | `rounded-lg` |
| Transition | `transition-colors` | `transition-colors` |

### 3.3. Padding Interne — Convention

```
FlatCard (p-0)
  └── div.p-3.lg:p-4   ← padding réel
      └── contenu
```

| Breakpoint | Padding | Usage |
|-----------|---------|-------|
| Mobile (`< 400px`) | `p-3` | Cartes dashboard, widgets |
| Mobile (`≥ 400px`) | `min-[400px]:p-4` | Hero profil étendu |
| Desktop (`≥ lg`) | `lg:p-4` | Toutes les cartes |

### 3.4. Hiérarchie de Séparation Interne

Quand une FlatCard contient un header fixe + contenu scrollable :
```tsx
<FlatCard className="flex flex-col overflow-hidden">
  {/* Header fixe */}
  <div className="flex shrink-0 items-center justify-between border-b border-foreground/5 p-3.5">
    ...
  </div>
  {/* Contenu scrollable */}
  <div className="flex-1 overflow-y-auto citizen-scrollbar p-4">
    ...
  </div>
</FlatCard>
```

> [!NOTE]
> Le séparateur interne utilise `border-b border-foreground/5` — un trait ultra-subtil, PAS une bordure visible.

---

## 4. Palette de Couleurs Complète

### 4.1. Surfaces & Fonds

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| `citizen-layout` body | `var(--card)` = `#FFFFFF` | `#111111` | Fond de l'espace utilisateur |
| FlatCard `bg` | `#F4F3ED` | `#171616` | Toutes les cartes principales |
| Sous-conteneur `bg` | `#FDFCFA` | `#21201E` (77% opacity) | Items internes, listes |
| Sidebar wrap | `#F4F3ED` | `#171616` | Sidebar desktop dans son enveloppe |
| MobileNavBar | `#F4F3ED` | `#171616` | Barre de navigation mobile |
| Sheet (bottom) | `#F4F3ED` | `#171616` | Menu contextuel mobile (Sheet) |

### 4.2. Boutons & Surfaces d'Actions

| Token | Light | Dark | Usage |
|-------|-------|------|-------|
| Bouton iProfil | `#DCD7C7` | `#4A4744` (40% opacity) | Boutons secondaires neutres |
| Bouton iProfil hover | `#DCD7C7` (80% opacity) | `#4A4744` (40% opacity) | État hover |
| IconBox `bg` | `#EBE6DC` | `#383633` | Fond des boîtes d'icônes dans les headers |
| Action ghost hover | `#EBE6DC` | `#383633` | Hover sur boutons icônes (edit, pencil) |

### 4.3. Couleurs Sémantiques — 4 Niveaux

```
┌─────────────┬─────────────────────────────────────┬──────────────────────────────────┐
│ Sémantique   │ Fond                                │ Texte & Icône                    │
├─────────────┼─────────────────────────────────────┼──────────────────────────────────┤
│ ⚠️ Warning   │ bg-amber-500/15  dark:bg-amber-500/10│ text-amber-600 dark:text-amber-400│
│ 🔴 Error     │ bg-rose-500/10                       │ text-rose-600  dark:text-rose-400 │
│ ✅ Success   │ bg-green-500/25 ou bg-emerald-500/15 │ text-green-700 dark:text-green-400│
│ 🔵 Info      │ bg-primary/10                        │ text-primary                     │
└─────────────┴─────────────────────────────────────┴──────────────────────────────────┘
```

### 4.4. Couleur Primaire

| Token | Valeur | Usage |
|-------|--------|-------|
| `--primary` | `#0072B9` (Bleu Gabon) | Boutons CTA, liens actifs, badges info |
| `--primary-foreground` | `#FFFFFF` | Texte sur fond primaire |

### 4.5. Couleurs Nationales (Décoratives)

```css
--gabon-green-hex: #009E60;  /* Vert du drapeau */
--gabon-yellow-hex: #FCD116; /* Jaune du drapeau */
--gabon-blue-hex: #3A75C4;   /* Bleu du drapeau */
```

Utilisées pour les bandes décoratives (`gabon-stripe`), les dégradés de fond, et les accents subtils.

---

## 5. Typographie & Hiérarchie Textuelle

### 5.1. Polices

| Famille | Variable CSS | Usage |
|---------|-------------|-------|
| Inter Variable | `--font-sans` | Corps de texte, labels, métriques |
| Plus Jakarta Sans Variable | `--font-display` | Titres `h1`-`h6` automatiquement |

### 5.2. Échelle Typographique iProfil

| Classe | Taille | Poids | Usage |
|--------|--------|-------|-------|
| `text-[9px]` | 9px | `font-medium` | Micro-labels (badges internes, sub-text) |
| `text-[10px]` | 10px | `font-medium` to `font-bold` | Labels de champs, dates, statuts compacts |
| `text-xs` | 12px | `font-medium` to `font-bold` | Boutons, valeurs secondaires, descriptions |
| `text-sm` | 14px | `font-semibold` to `font-bold` | Titres de section, noms, métriques |
| `text-base` | 16px | `font-medium` to `font-black` | Noms (firstName), texte principal |
| `text-lg` | 18px | `font-black` | Nom de famille (uppercase), titre principal mobile |
| `text-2xl` | 24px | `font-bold` | Titre page desktop (`PageHeader`) |

### 5.3. Conventions de Formatage

```tsx
{/* Nom de famille — TOUJOURS uppercase, font-black */}
<h2 className="truncate text-lg leading-tight font-black text-foreground uppercase">
  {lastName}
</h2>

{/* Prénom — capitalize, font-medium, couleur secondaire */}
<p className="truncate text-sm font-medium text-muted-foreground capitalize">
  {firstName}
</p>

{/* Matricule — monospace, uppercase, tracking-wide */}
<span className="font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase">
  {matricule}
</span>

{/* Label de champ — micro, uppercase */}
<span className="text-[10px] uppercase font-medium text-muted-foreground">
  État du dossier
</span>

{/* Valeur de champ — bold, foreground */}
<span className="text-sm font-semibold text-foreground">
  Complet
</span>
```

> [!IMPORTANT]
> **Règle absolue :** Ne JAMAIS utiliser `font-normal` sur une métrique, une valeur ou un label. Le minimum est `font-medium`.

---

## 6. Iconographie & IconBox

### 6.1. Bibliothèque d'Icônes

**Lucide React** est la SEULE bibliothèque d'icônes autorisée.

### 6.2. Tailles Standard

| Contexte | Classe | Dimension |
|----------|--------|-----------|
| IconBox (header de section) | `h-3.5 w-3.5` | 14px |
| Bouton inline | `h-3 w-3` | 12px |
| Bouton d'action moyen | `h-4 w-4` | 16px |
| NavBar / Sidebar | `h-4.5 w-4.5` à `size-5` | 18px à 20px |
| Icon large (empty state) | `h-8 w-8` | 32px |

### 6.3. Pattern IconBox

Toute icône dans un header de section est **toujours** encapsulée dans une boîte arrondie :

```tsx
{/* IconBox standard — header de section */}
<div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]">
  <LucideIcon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

{/* IconBox plus grand — header de page */}
<div className="rounded-lg bg-foreground/8 dark:bg-foreground/5 p-1.5">
  <LucideIcon className="h-5 w-5" />
</div>

{/* IconBox sémantique — alertes */}
<div className="rounded-md bg-amber-500/10 p-1">
  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
</div>

{/* IconBox circulaire — action "+" */}
<div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBE6DC] dark:bg-[#383633]">
  <Plus className="h-3.5 w-3.5" />
</div>
```

---

## 7. Composants Réutilisables — Inventaire

### 7.1. `FlatCard`

Voir [Section 3.1](#31-flatcard--le-conteneur-roi).

```tsx
import { FlatCard } from "@/components/my-space/flat-card";
<FlatCard className="flex flex-col">{children}</FlatCard>
```

### 7.2. `SectionHeader`

Header standardisé pour les sections à l'intérieur d'une FlatCard.

```tsx
import { SectionHeader } from "@/components/my-space/section-header";

<SectionHeader
  icon={<FileText />}
  iconBgClass="bg-foreground/8 dark:bg-foreground/5"  // défaut
  iconTextClass="text-muted-foreground"                // optionnel
  title="Démarches en cours"
  actions={<Button variant="ghost" size="sm">Voir tout</Button>}
/>
```

**Structure HTML interne :**
```tsx
<div className="flex items-center justify-between mb-2">
  <span className="text-sm font-bold flex items-center gap-2">
    <div className={cn("p-1 rounded-md", iconBgClass)}>
      <span className="h-3.5 w-3.5 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
    </div>
    {title}
  </span>
  {actions}
</div>
```

### 7.3. `PageHeader`

Header de page complète avec animation d'entrée, back button, icône en boîte, titre, sous-titre et slot d'actions.

```tsx
import { PageHeader } from "@/components/my-space/page-header";

<PageHeader
  title="iDocument"
  subtitle="Gérez vos documents numériques"
  icon={<FileText className="h-5 w-5" />}
  iconBgClass="bg-teal-500/10"
  showBackButton
  actions={<Button>Action</Button>}
/>
```

### 7.4. `TabSwitcher`

Sélecteur d'onglets inline, style segment control.

```tsx
import { TabSwitcher } from "@/components/my-space/tab-switcher";

<TabSwitcher
  tabs={[
    { key: "all", label: "Tout", icon: FileText, count: 12 },
    { key: "active", label: "Actif", icon: CheckCircle, count: 5 },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>
```

**Style :**
- Conteneur : `bg-card border border-border rounded-xl p-1`
- Tab active : `bg-primary text-primary-foreground shadow-sm`
- Tab inactive : `text-muted-foreground hover:text-foreground hover:bg-muted/50`

### 7.5. `EmptyState`

État vide centré avec icône, titre, description et slot d'action.

```tsx
import { EmptyState } from "@/components/my-space/empty-state";

<EmptyState
  icon={<FileText />}
  title="Aucun document"
  description="Commencez par importer un document."
  action={<Button>Importer</Button>}
/>
```

**Style :**
- Icône : `rounded-full bg-muted p-4 mb-4`
- Titre : `text-sm font-semibold text-foreground mb-1`
- Description : `text-sm text-muted-foreground`

---

## 8. Système d'Alertes, Badges & Statuts

### 8.1. Badges de Statut

```tsx
{/* Succès / Actif */}
<Badge className="h-4 bg-green-500/25 px-1 py-0 text-[10px] font-medium text-green-700 dark:text-green-400">
  Active
</Badge>

{/* Erreur / Expiré */}
<Badge className="h-4 bg-rose-500/10 px-1 py-0 text-[10px] font-medium text-rose-600 dark:text-rose-400">
  Expirée
</Badge>

{/* Warning / En cours */}
<Badge className="h-5 bg-amber-500/35 dark:bg-amber-500/15 px-1.5 py-0 text-xs font-medium text-amber-700 dark:text-amber-400">
  Long séjour
</Badge>

{/* Score / Complétion */}
<span className="rounded-md bg-emerald-500/15 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:bg-emerald-500/20 dark:text-emerald-400">
  100%
</span>
```

### 8.2. Bannière d'Alerte Mobile

```tsx
{/* Bannière alerte en haut de page — mobile */}
<Link className="flex-1 flex items-center gap-2.5 rounded-xl bg-rose-500/10 px-3 py-2.5 transition-colors hover:bg-rose-500/15 overflow-hidden">
  <div className="shrink-0 rounded-md bg-rose-500/15 p-1">
    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
  </div>
  <span className="flex-1 truncate text-xs font-bold text-rose-600 dark:text-rose-400">
    {alertText}
  </span>
  <ArrowRight className="h-3 w-3 shrink-0 text-rose-500/60" />
</Link>
```

### 8.3. Barres de Progression

```tsx
{/* Barre de progression — dossier */}
<div className="flex items-center gap-3">
  <div className="h-2 flex-1 overflow-hidden rounded-full bg-muted">
    <div
      className={cn(
        "h-full rounded-full transition-all",
        score >= 80 ? "bg-green-500/80"
        : score >= 50 ? "bg-amber-500/70"
        : "bg-rose-500/70"
      )}
      style={{ width: `${score}%` }}
    />
  </div>
  <span className="text-xs font-bold text-muted-foreground">
    {score}% complété
  </span>
</div>

{/* Barre de progression — slim (iCV) */}
<div className="h-1.5 flex-1 overflow-hidden rounded-full bg-muted">
  <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${cvScore}%` }} />
</div>
```

---

## 9. Boutons & Interactions

### 9.1. Bouton iProfil Neutre (Signature du design)

Le bouton le plus utilisé dans l'interface. Gris chaud, sans border, avec `active:scale`.

```tsx
<Button
  variant="ghost"
  size="sm"
  className="h-8 gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97]"
>
  <Eye className="h-3 w-3" />
  Ma Carte
</Button>
```

### 9.2. Bouton CTA Primaire

```tsx
<Button className="h-9 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium">
  <Plus className="h-4 w-4 shrink-0" />
  Nouvelle démarche
</Button>
```

### 9.3. Bouton Icône Ghost (Édition)

```tsx
<Button
  size="icon"
  variant="ghost"
  className="h-5 w-5 shrink-0 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"
>
  <Pencil className="h-2.5 w-2.5 text-muted-foreground" />
</Button>
```

### 9.4. Bouton de Section (Header droit)

```tsx
<Button
  asChild
  variant="ghost"
  size="sm"
  className="h-8 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97] md:h-7"
>
  <Link href="/my-space/services-demarches">Mes Démarches</Link>
</Button>
```

### 9.5. Bouton Appel (CTA bleu institutionnel)

```tsx
<Button className="h-8 text-xs font-semibold bg-[#0072B9] hover:bg-[#0072B9]/90 text-white transition-transform active:scale-[0.97] rounded-lg px-4">
  <Phone className="h-3.5 w-3.5 mr-1" />
  Appeler
</Button>
```

### 9.6. Carte Interactive (Link-as-Card)

```tsx
{/* Carte de sous-contenu cliquable */}
<Link className="flex items-center gap-3 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5 pr-4 transition-colors hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80">
  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-md bg-[#EBE6DC] dark:bg-[#383633]">
    <Baby className="h-3 w-3 text-muted-foreground" />
  </div>
  <div className="min-w-0 flex-1">
    <p className="truncate text-sm leading-tight font-bold text-muted-foreground">
      Prénom Nom
    </p>
    <p className="mt-0.5 text-xs leading-tight font-medium text-muted-foreground">
      3 ans
    </p>
  </div>
  <ArrowRight className="h-3 w-3 shrink-0 text-muted-foreground/40" />
</Link>
```

---

## 10. Navigation Mobile & Desktop

### 10.1. MobileNavBar

Barre de navigation fixée en bas, même fond que les FlatCard.

```
Position : fixed left-3 right-3 z-40 md:hidden bottom-[calc(0.8rem+env(safe-area-inset-bottom))]
Background : bg-[#F4F3ED] dark:bg-[#171616] backdrop-blur-md rounded-2xl
Hauteur : h-[60px]
```

**Items de navigation :**
```tsx
function NavBarItem({ item, active }) {
  return (
    <Link className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]">
      <div className={cn("h-7 w-7 rounded-lg flex items-center justify-center", active && "bg-primary/10")}>
        <item.icon className={cn("h-4.5 w-4.5", active ? "text-primary" : "text-muted-foreground")} />
      </div>
      <span className={cn("text-[9px] font-medium", active ? "text-primary" : "text-muted-foreground")}>
        {item.title}
      </span>
    </Link>
  );
}
```

**Bouton central iAsted (FAB) :**
- Taille : `h-12 w-12`
- Forme : `rounded-full`
- Couleur : `bg-emerald-600 hover:bg-emerald-500`
- Position : `-mt-4` (remonté au-dessus de la barre)
- Icône : `Bot` (h-6 w-6 text-white)

### 10.2. Sheet Menu Mobile (Bottom Sheet)

```
Position : SheetContent side="bottom"
Background : bg-[#F4F3ED] dark:bg-[#171616]
Coins : rounded-t-2xl
Max height : max-h-[75dvh]
Border : border-none
Shadow : shadow-2xl
```

**Grille d'items :**
```tsx
<div className="grid grid-cols-3 gap-2">
  <Link className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[68px]
    bg-muted text-muted-foreground hover:bg-muted/70
    /* active: */ bg-primary/10 text-primary font-semibold
  ">
    <Icon className="size-5" />
    <span className="text-[11px] font-medium leading-tight">{title}</span>
  </Link>
</div>
```

### 10.3. Desktop Sidebar

```
Container : p-4 pr-0 (enveloppe externe)
Inner : h-full rounded-2xl bg-[#F4F3ED] dark:bg-[#171616] overflow-hidden
Width expanded : w-56
Width collapsed : w-[68px]
Transition : transition-[width] duration-300 ease-in-out
```

**Item de navigation sidebar :**
```tsx
<Link className={cn(
  "flex items-center transition-all duration-200 rounded-lg",
  isExpanded ? "w-full gap-3 px-3 h-11" : "w-11 h-11 justify-center",
  active
    ? "font-bold text-primary bg-primary/10 dark:bg-primary/20"
    : "font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
)}>
  <Icon className="size-5 shrink-0" />
  <SidebarText>{title}</SidebarText>
</Link>
```

**Section labels :**
```tsx
<span className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70 px-3 mb-1.5 block">
  {sectionLabel}
</span>
```

**Séparateurs de sections :**
```tsx
<div className={cn("my-2.5", isExpanded ? "border-t border-foreground/5 pt-2" : "border-t border-foreground/5 pt-2 w-8")} />
```

---

## 11. Animations & Micro-interactions

### 11.1. Stagger Children (CSS)

Les colonnes du dashboard desktop appliquent la classe `stagger-children` pour un effet d'apparition décalée :

```css
.stagger-children > * { opacity: 0; animation: fadeInUp 0.4s ease-out forwards; }
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.1s; }
/* ... jusqu'à 8 enfants */
```

### 11.2. Framer Motion — Patterns Standard

```tsx
{/* Entrée de page */}
<motion.div
  initial={{ opacity: 0, y: 10 }}
  animate={{ opacity: 1, y: 0 }}
  transition={{ duration: 0.2 }}
>

{/* Entrée de contenu principal */}
<motion.div
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
>

{/* AnimatePresence pour les éléments conditionnels */}
<AnimatePresence>
  {visible && (
    <motion.div
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: 20 }}
      transition={{ type: "spring", damping: 20, stiffness: 300 }}
    >
```

### 11.3. Bouton Active Scale

TOUS les boutons interactifs utilisent :
```
active:scale-[0.97] transition-transform
```

### 11.4. Theme Transition

Le changement de thème crée une transition douce :
```css
html, html *, html *::before, html *::after {
  transition:
    background-color 300ms ease-in-out,
    border-color 300ms ease-in-out,
    color 150ms ease-in-out;
}
```

---

## 12. CSS Variables & Tokens Globaux

### 12.1. Variables iProfil Spécifiques

```css
:root {
  /* Surfaces */
  --citizen-surface-card: #F4F3ED;
  
  /* Gabon Official */
  --gabon-green-hex: #009E60;
  --gabon-yellow-hex: #FCD116;
  --gabon-blue-hex: #3A75C4;
}

.dark {
  --citizen-surface-card: rgba(28, 27, 26, 0.57);
}
```

### 12.2. Layout Background

```css
.citizen-layout { background: var(--card); min-height: 100dvh; }
.dark .citizen-layout { background: #111111; }
```

### 12.3. Box Shadow Override Global

```css
*, *::before, *::after {
  box-shadow: none !important;
  text-shadow: none !important;
}
```

### 12.4. Classe utilitaire `disable-scrollbars`

```css
.disable-scrollbars { -ms-overflow-style: none; scrollbar-width: none; }
.disable-scrollbars::-webkit-scrollbar { display: none; }
```

### 12.5. Custom Scrollbar `citizen-scrollbar`

```css
.citizen-scrollbar::-webkit-scrollbar { width: 5px; }
.citizen-scrollbar::-webkit-scrollbar-track { background: transparent; }
.citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(0,0,0,0.12); border-radius: 10px; }
.dark .citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.12); }
```

---

## 13. Scrollbar, Accessibilité & Conventions

### 13.1. Focus Ring

```css
*:focus-visible {
  outline: 2px solid var(--ring);
  outline-offset: 2px;
}
```

### 13.2. Mobile Native Feel

```css
html { overscroll-behavior: none; -webkit-text-size-adjust: 100%; }
button, a, [role="button"], input, select, textarea { -webkit-tap-highlight-color: transparent; }
button, a, [role="button"] { -webkit-user-select: none; user-select: none; touch-action: manipulation; }
```

### 13.3. Réduction des Animations

```css
[data-reduce-motion="true"] *, [data-reduce-motion="true"] *::before, [data-reduce-motion="true"] *::after {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

### 13.4. Conventions de nommage

| Type | Convention | Exemple |
|------|-----------|---------|
| Composant | PascalCase | `FlatCard`, `SectionHeader`, `MobileNavBar` |
| Fichier composant | kebab-case | `flat-card.tsx`, `section-header.tsx` |
| Variable CSS | kebab-case | `--citizen-surface-card` |
| Classe CSS utilitaire | kebab-case | `citizen-scrollbar`, `disable-scrollbars`, `stagger-children` |
| Module i18n | camelCase.dot | `mySpace.nav.settings` |

---

## 14. Prompt IA Exécutable & Strict

> Ce prompt est la **spécification opérationnelle** à donner à un agent IA qui doit créer ou refactorer n'importe quelle page de l'espace utilisateur citizen-web.

---

### SYSTEM PROMPT — iProfil UI Design Rules v2.0

```
Tu génères ou refactores une interface pour l'espace utilisateur (citizen-web / my-space).
Tu DOIS respecter l'esthétique institutionnelle iProfil « Slate Trust & Authority » à la lettre.
Voici les règles STRICTES et IMPÉRATIVES que tu DOIS suivre :

━━━━━━━━━━━━━━━━━━━━━━━━
1. CONTENEURS PRINCIPAUX
━━━━━━━━━━━━━━━━━━━━━━━━

A) Wrappe TOUT bloc structurel dans le composant <FlatCard> :
   import { FlatCard } from "@/components/my-space/flat-card";
   <FlatCard className="flex flex-col">{children}</FlatCard>
   
   → FlatCard = rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden
   → ZÉRO shadow, ZÉRO border. L'élévation = contraste de fond.
   → Le padding va sur un DIV ENFANT : <div className="p-3 lg:p-4">

B) Pour les cartes secondaires INTERNES aux FlatCard :
   → Fond : bg-[#FDFCFA] dark:bg-[#21201E]/77
   → Hover : hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 transition-colors
   → Coins : rounded-lg (PAS rounded-xl)

C) Pour les séparateurs internes :
   → border-b border-foreground/5 (ultra-subtil, PAS de bordure visible)

━━━━━━━━━━━━━━━━━━━━━━━━
2. EN-TÊTES DE SECTION
━━━━━━━━━━━━━━━━━━━━━━━━

Utilise le composant SectionHeader ou reproduis ce pattern :

  <div className="flex items-center justify-between mb-2 lg:mb-3">
    <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
      <div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]">
        <LucideIcon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      Titre de Section
    </span>
    {/* Actions à droite */}
    <Button variant="ghost" size="sm"
      className="h-8 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs 
        font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 
        dark:hover:bg-[#4A4744]/40 active:scale-[0.97] md:h-7">
      Action
    </Button>
  </div>

Pour les en-têtes de page, utilise :
  import { PageHeader } from "@/components/my-space/page-header";

━━━━━━━━━━━━━━━━━━━━━━━━
3. BOUTONS ET ACTIONS
━━━━━━━━━━━━━━━━━━━━━━━━

A) Bouton iProfil neutre (le plus courant) :
   className="h-8 gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 
     text-xs font-medium text-foreground transition-transform 
     hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97]"

B) Bouton CTA primaire :
   className="h-9 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"

C) Bouton icône ghost (edit/pencil) :
   className="h-5 w-5 shrink-0 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"
   → Icône : h-2.5 w-2.5 ou h-3 w-3 text-muted-foreground

D) TOUS les boutons doivent avoir : active:scale-[0.97] transition-transform

━━━━━━━━━━━━━━━━━━━━━━━━
4. COULEURS SÉMANTIQUES
━━━━━━━━━━━━━━━━━━━━━━━━

⚠️ Warning / En cours :
   → Fond : bg-amber-500/15 dark:bg-amber-500/10
   → Texte : text-amber-600 dark:text-amber-400
   → IconBox : bg-amber-500/10

🔴 Erreur / Urgent :
   → Fond : bg-rose-500/10
   → Texte : text-rose-600 dark:text-rose-400
   → IconBox : bg-rose-500/15

✅ Succès / Validé :
   → Fond : bg-green-500/25 ou bg-emerald-500/15
   → Texte : text-green-700 dark:text-green-400

🔵 Info / Primaire :
   → Fond : bg-primary/10
   → Texte : text-primary

━━━━━━━━━━━━━━━━━━━━━━━━
5. ICONBOX PATTERN
━━━━━━━━━━━━━━━━━━━━━━━━

Toute icône-label DOIT encapsuler l'icône dans une boîte :

  <div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]">
    <Icon className="h-3.5 w-3.5 text-muted-foreground" />
  </div>

Pour les icônes dans les zones sémantiques, utilise le fond sémantique correspondant.

━━━━━━━━━━━━━━━━━━━━━━━━
6. TYPOGRAPHIE
━━━━━━━━━━━━━━━━━━━━━━━━

→ Valeurs de champs : text-xs font-bold text-foreground (ou text-sm font-semibold)
→ Labels associés : text-[10px] uppercase font-medium text-muted-foreground
→ Noms : text-lg font-black uppercase (lastName) + text-sm font-medium capitalize (firstName)
→ Matricules : font-mono text-xs font-bold tracking-wide uppercase text-muted-foreground
→ Buttons : text-xs font-medium
→ Section titles : text-sm font-semibold text-muted-foreground

RÈGLE ABSOLUE : Jamais font-normal sur métriques/valeurs. Minimum = font-medium.

━━━━━━━━━━━━━━━━━━━━━━━━
7. LAYOUT MOBILE vs DESKTOP
━━━━━━━━━━━━━━━━━━━━━━━━

Mobile (< lg) :
→ Colonnes horizontales snap-x snap-mandatory (page dashboard uniquement)
→ Padding : px-3 min-[400px]:px-4 pt-3 pb-18
→ Gap inter-FlatCard : gap-2.5
→ Hauteur flexible : flex-1, flex-2, flex-3 pour les proportions

Desktop (≥ lg) :
→ Grille Bento : lg:grid lg:grid-cols-12 gap-5
→ Colonnes : col-span-3 / col-span-5 / col-span-4
→ Chaque colonne : overflow-y-auto citizen-scrollbar stagger-children
→ Gap interne : gap-4

Pages secondaires :
→ Structure simple : flex flex-col, overflow-y-auto
→ PageHeader + FlatCard empilées avec space-y-4

━━━━━━━━━━━━━━━━━━━━━━━━
8. ANIMATIONS
━━━━━━━━━━━━━━━━━━━━━━━━

→ Entrée de page : initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
→ Entrée de contenu : initial={{ opacity: 0, y: 5 }} animate={{ opacity: 1, y: 0 }}
→ Colonnes desktop : classe CSS stagger-children (animation décalée 50ms)
→ Éléments conditionnels : AnimatePresence + motion avec spring

━━━━━━━━━━━━━━━━━━━━━━━━
9. COMPOSANTS OBLIGATOIRES
━━━━━━━━━━━━━━━━━━━━━━━━

Imports depuis @/components/my-space/ :
  - FlatCard          → Conteneur principal
  - SectionHeader     → En-tête de section avec IconBox
  - PageHeader        → En-tête de page avec back button + animation
  - TabSwitcher       → Sélecteur d'onglets
  - EmptyState        → État vide centré

━━━━━━━━━━━━━━━━━━━━━━━━
10. INTERDITS ABSOLUS
━━━━━━━━━━━━━━━━━━━━━━━━

❌ Pas de box-shadow (global override !important)
❌ Pas de border sur FlatCard
❌ Pas de bg-white ou bg-black sur les cartes
❌ Pas de font-normal sur les métriques
❌ Pas d'icônes autre que Lucide React
❌ Pas de Tailwind shadow-* (neutralisé globalement)
❌ Pas de padding directement sur FlatCard (toujours sur l'enfant)
❌ Pas de rounded-2xl sur les FlatCard (c'est rounded-xl)

L'objectif est d'atteindre un design ultra-propre, subtil, institutionnel
(« Slate Trust & Authority ») sans bordures lourdes ni ombres, avec une gestion
rigoureuse des coins arrondis, du spacing (gap-2 à gap-2.5 interne, gap-4 à gap-5
inter-sections) et des classes Tailwind. Ne divague JAMAIS de ces classes.
```

---

> [!TIP]  
> Pour créer une nouvelle page de l'espace utilisateur, commence **toujours** par :
> 1. Importer `FlatCard`, `SectionHeader`, `PageHeader` depuis `@/components/my-space/`
> 2. Structurer avec `<div className="flex h-full flex-col overflow-hidden">`
> 3. Ajouter le `PageHeader` en haut
> 4. Empiler les `FlatCard` avec `space-y-4` dans un conteneur `overflow-y-auto citizen-scrollbar`
> 5. Respecter STRICTEMENT les classes Tailwind documentées ci-dessus
