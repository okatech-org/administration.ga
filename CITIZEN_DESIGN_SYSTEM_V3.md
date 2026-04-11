# Citizen Design System v3.0 — « Slate Trust & Authority »

> **Version :** 3.0 — Document unifié, exhaustif et exécutable
> **Date :** 2026-04-11
> **Référence vivante :** `/my-space` du citizen-web (mobile dark = référence absolue)
> **Fichiers sources :** `apps/citizen-web/src/app/globals.css` · `packages/ui/src/styles/globals.css`
> **Composants :** `apps/citizen-web/src/components/my-space/`
> **Auteur :** Extrait par analyse exhaustive de la page iProfil + Dashboard

---

## TABLE DES MATIÈRES

1. [Philosophie & Identité](#1-philosophie--identité)
2. [Les 10 Commandements](#2-les-10-commandements)
3. [Palette de Couleurs](#3-palette-de-couleurs)
4. [Typographie](#4-typographie)
5. [Système de Composants](#5-système-de-composants)
6. [Système d'Icônes](#6-système-dicônes)
7. [Système de Layout](#7-système-de-layout)
8. [Système d'Espacement](#8-système-despacement)
9. [Système de Radius](#9-système-de-radius)
10. [Animations & Transitions](#10-animations--transitions)
11. [Scrollbar & Overflow](#11-scrollbar--overflow)
12. [Accessibilité](#12-accessibilité)
13. [Responsive Breakpoints](#13-responsive-breakpoints)
14. [Patterns de Données (Wireframes)](#14-patterns-de-données-wireframes)
15. [Arbre de Composants](#15-arbre-de-composants)
16. [Checklist d'Implémentation](#16-checklist-dimplémentation)
17. [PROMPT IA EXÉCUTABLE COMPLET](#17-prompt-ia-exécutable-complet)
18. [Annexes](#18-annexes)

---

## 1. PHILOSOPHIE & IDENTITÉ

### 1.1 Esthétique : « Slate Trust & Authority »

Autorité institutionnelle douce — confiance, compétence, premium.
L'interface émane la solidité d'un service gouvernemental moderne sans la froideur bureaucratique.

### 1.2 Les 5 Piliers Fondamentaux

1. **Flat & Warm** — Surfaces plates sans ombre (`box-shadow: none !important` global), teintes chaudes de gris (beige-gris, pas de gris pur)
2. **Élévation par couleur** — L'élévation visuelle se fait par la luminosité du fond, pas par des ombres. Plus clair = plus élevé
3. **Achromatique + 4 accents** — Palette stricte : gris chauds + bleu (primary), vert (success), amber (warning), rose (destructive)
4. **Mobile-first institutionnel** — L'expérience mobile est la référence absolue. Le desktop est une extension en grille
5. **Information dense, UI calme** — Beaucoup d'information dans peu d'espace, sans bruit visuel. Texte petit, compact, lisible

### 1.3 Identité Nationale Gabon

Les trois couleurs nationales — **Vert (#009E60)**, **Jaune/Or (#FCD116)**, **Bleu (#3A75C4)** — sont utilisées **exclusivement** comme :

- Éléments décoratifs (`gabon-stripe`, gradients)
- Accents subtils (tints à 8-15% opacité)
- Marqueurs d'identité (logos, badges officiels)

Elles ne sont **JAMAIS** utilisées comme couleur de fond de carte ou de section entière.

---

## 2. LES 10 COMMANDEMENTS

> ❌ = INTERDIT ABSOLU. Toute violation brise la cohérence du design system.

| # | Commandement | Détail |
|---|-------------|--------|
| 1 | ❌ Zéro ombre | `box-shadow: none !important` global. Pas de `shadow-*` Tailwind |
| 2 | ❌ Zéro bordure sur FlatCard | Séparation par couleur de fond uniquement |
| 3 | ❌ Zéro bg-white / bg-black | Toujours utiliser les tokens warm gray |
| 4 | ❌ Zéro font-normal | `font-medium` (500) est le minimum dans les cartes |
| 5 | ❌ Zéro icônes non-Lucide | `lucide-react` exclusivement |
| 6 | ❌ Zéro rounded-2xl sur FlatCard | FlatCard = `rounded-xl`, Sidebar/NavBar = `rounded-2xl` |
| 7 | ❌ Zéro padding sur FlatCard racine | `p-0` sur FlatCard, padding sur l'enfant `<div>` |
| 8 | ❌ Zéro couleurs vives hors sémantique | Amber, green, rose = statuts uniquement |
| 9 | ❌ Zéro couleur Tailwind brute | Pas de `blue-500`, `green-100`, etc. |
| 10 | ❌ Zéro gradient coloré de fond | Les fonds sont toujours les warm grays de la palette |

---

## 3. PALETTE DE COULEURS

### 3.1 Surfaces — Échelle Warm Gray (5 niveaux)

L'échelle utilise des gris **chauds** (teinte beige), PAS des gris purs. L'élévation se fait par luminosité.

| Niveau | Nom | Light Mode | Dark Mode | Usage |
|--------|-----|------------|-----------|-------|
| **S0** | Layout BG | `var(--card)` · `#FFFFFF` | `#111111` | Fond de page entière (`citizen-layout`) |
| **S1** | Card Surface | `#F4F3ED` | `#171616` | Cartes principales (FlatCard), sidebar, navbar mobile |
| **S2** | Icon Box / Badge | `#EBE6DC` | `#383633` | Conteneurs d'icônes, count badges, hover states |
| **S3** | Button Secondary | `#DCD7C7` | `#4A4744/40` | Boutons secondaires type A |
| **S4** | Sub-card / Inset | `#FDFCFA` | `#21201E/77` | Sous-cartes internes, items en retrait, infoboxes |

```
Luminosité (Light Mode) : plus lumineux = plus élevé
#FFFFFF (S0) → #F4F3ED (S1) → #FDFCFA (S4) → #EBE6DC (S2) → #DCD7C7 (S3)

Luminosité (Dark Mode) : plus clair = plus élevé
#111111 (S0) → #171616 (S1) → #21201E/77 (S4) → #383633 (S2) → #4A4744/40 (S3)
```

### 3.2 Variable CSS de surface

```css
:root  { --citizen-surface-card: #F4F3ED; }
.dark  { --citizen-surface-card: rgba(28, 27, 26, 0.57); }
```

### 3.3 Couleur Primary

| Mode | Hex | Usage |
|------|-----|-------|
| Light | `#0072B9` | CTA, nav active, liens, ring focus |
| Dark | `#0072B9` | Identique (invariant entre modes) |

### 3.4 Couleurs de Statut (4 accents stricts)

| Accent | Couleur | BG Light | BG Dark | Texte Light | Texte Dark |
|--------|---------|----------|---------|-------------|------------|
| **Amber** (Warning) | amber-500 | `amber-500/35` | `amber-500/15` | `amber-700` | `amber-400` |
| **Emerald** (Success) | emerald-500 | `emerald-500/15` | `emerald-500/20` | `emerald-600` | `emerald-400` |
| **Green** (Active) | green-500 | `green-500/25` | `green-500/25` | `green-700` | `green-400` |
| **Rose** (Destructive) | rose-500 | `rose-500/10` | `rose-500/10` | `rose-600` | `rose-400` |

> **Convention des opacités :** Les BG dark sont TOUJOURS **moins opaques** que les BG light.
> Pattern : `bg-{color}-500/{light-opacity} dark:bg-{color}-500/{dark-opacity}`

### 3.5 Couleurs Spéciales

| Usage | Light | Dark | Application |
|-------|-------|------|-------------|
| Foreground 6% | `foreground/[0.06]` | `foreground/[0.12]` | Conteneur d'icônes minimal |
| Border interne | `border-foreground/5` | `border-foreground/5` | Séparateurs internes aux cartes |
| Flat card border | `oklch(0 0 0 / 0.05)` | `oklch(1 0 0 / 0.05)` | Bordure externe subtile FlatCards |

### 3.6 Couleurs Gabon (décoratif UNIQUEMENT)

| Couleur | Hex | CSS Var | Classes utilitaires |
|---------|-----|---------|---------------------|
| Vert | `#009E60` | `--gabon-green-hex` | `.bg-gabon-green`, `.text-gabon-green`, `.bg-gabon-green-tint` |
| Jaune/Or | `#FCD116` | `--gabon-yellow-hex` | `.bg-gabon-yellow`, `.text-gabon-yellow`, `.bg-gabon-yellow-tint` |
| Bleu | `#3A75C4` | `--gabon-blue-hex` | `.bg-gabon-blue`, `.text-gabon-blue`, `.bg-gabon-blue-tint` |

Tints : 8% light, 12-15% dark. Drapeau : `.gabon-stripe` (horizontal) · `.gabon-stripe-vertical`.

---

## 4. TYPOGRAPHIE

### 4.1 Familles de polices

| Usage | Police | Variable CSS |
|-------|--------|-------------|
| Corps de texte | Inter Variable | `--font-sans` |
| Titres, headings | Plus Jakarta Sans Variable | `--font-display` |

### 4.2 Échelle typographique complète

| Élément | Classes exactes | Exemple |
|---------|----------------|---------|
| **Nom de famille** | `text-base leading-none font-black text-foreground uppercase` (mobile) · `text-lg` (desktop) | PELLEN-LAKOUMBA |
| **Prénom** | `text-sm font-medium text-muted-foreground capitalize` (mobile) · `text-base` (desktop) | Gueylord Asted |
| **Matricule** | `font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase` | GAB-FR-2026-00297 |
| **Section header** | `text-sm font-semibold text-muted-foreground` | Démarches en cours |
| **Label sidebar section** | `text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70` | IDENTITÉ |
| **Bouton texte** | `text-xs font-medium text-foreground` | Mes Démarches |
| **Texte secondaire** | `text-xs font-medium text-muted-foreground` | 27 mars 2025 |
| **Micro label** | `text-[10px] font-medium text-muted-foreground` | Suggestion |
| **Micro badge** | `text-[9px] font-medium` ou `text-[10px] font-bold` | Long séjour |
| **Nav bar label** | `text-[9px] font-medium` | iProfil |
| **Sidebar nav item** | `text-[15.5px] font-semibold` (inactif) · `font-bold` (actif) | iDocument |
| **Sidebar user** | `text-xs font-semibold` (nom) · `text-[10px] text-muted-foreground` (email) | — |
| **Card title (activité)** | `text-xs leading-tight font-bold text-foreground` (mobile) · `text-sm` (desktop) | Renouvellement de passeport |
| **Page title** | `text-lg md:text-2xl font-bold` | Mes Documents |

### 4.3 Règles typographiques absolues

1. Le nom de famille est TOUJOURS en `uppercase font-black`
2. Le prénom est TOUJOURS en `capitalize font-medium text-muted-foreground`
3. Les matricules/codes sont en `font-mono uppercase tracking-wide`
4. Le texte courant est `text-sm` (14px) ou `text-xs` (12px), **jamais plus grand dans les cartes**
5. Les labels de section utilisent `font-semibold`, pas `font-bold` (sauf titre principal)
6. La graisse dominante dans les cartes est `font-medium` (500)
7. `font-bold` (700) est réservé aux titres de cartes et valeurs importantes
8. `font-black` (900) est réservé au nom de famille **UNIQUEMENT**
9. Tous les headings h1-h6 utilisent `--font-display` + `tracking-tight`
10. La classe `.heading-official` ajoute `font-weight: 700; letter-spacing: -0.01em; line-height: 1.2`

---

## 5. SYSTÈME DE COMPOSANTS

### 5.1 FlatCard — Conteneur Principal

Le composant fondamental de tout l'espace utilisateur. Pas d'ombre, surface chaude.

```tsx
// Import
import { FlatCard } from "@/components/my-space/flat-card";

// Implémentation interne
<div className="rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden">
  {children}
</div>

// Usage standard
<FlatCard className="relative shrink-0">
  <div className="p-3 lg:p-4">
    {/* contenu */}
  </div>
</FlatCard>
```

**Variantes de padding :**

| Contexte | Padding enfant |
|----------|---------------|
| Standard | `p-3 lg:p-4` |
| Hero profil | `p-3 min-[400px]:p-4` |
| Widget compact | `p-3` |

**Règles strictes :**
- Radius : TOUJOURS `rounded-xl` (jamais `rounded-lg`, jamais `rounded-2xl`)
- Pas de bordure visible par défaut
- Pas de shadow (global override)
- Overflow : `overflow-hidden`
- Padding `p-0` sur la racine → padding sur l'enfant `<div>`

### 5.2 SectionHeader — Pattern Universel

Chaque section dans une FlatCard commence par un header standardisé.

```tsx
// Import
import { SectionHeader } from "@/components/my-space/section-header";

// Usage
<SectionHeader
  icon={<FileText />}
  iconBgClass="bg-foreground/8 dark:bg-foreground/5"
  title="Démarches en cours"
  actions={<Button>Voir tout</Button>}
/>

// Structure interne exacte
<div className="flex items-center justify-between mb-2">
  <span className="text-sm font-bold flex items-center gap-2">
    <div className="p-1 rounded-md bg-foreground/8 dark:bg-foreground/5">
      <span className="h-3.5 w-3.5 shrink-0 [&>svg]:h-3.5 [&>svg]:w-3.5">
        {icon}
      </span>
    </div>
    {title}
  </span>
  {actions}
</div>
```

**Props :**
- `icon: ReactNode` — Icône Lucide
- `iconBgClass?: string` — Fond de la boîte icône (défaut : `bg-foreground/8 dark:bg-foreground/5`)
- `iconTextClass?: string` — Couleur icône
- `title: ReactNode` — Titre de la section
- `actions?: ReactNode` — Slot d'actions (droite)

### 5.3 PageHeader — En-tête de Page

```tsx
// Import
import { PageHeader } from "@/components/my-space/page-header";

// Usage
<PageHeader
  title="Mes Documents"
  subtitle="Gérez vos documents officiels"
  icon={<FileText className="h-4 w-4" />}
  iconBgClass="bg-primary/10"
  showBackButton
  actions={<Button>Ajouter</Button>}
/>

// Structure : motion.div animé
// initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
// Title : text-lg md:text-2xl font-bold
// Icon dans boîte : p-1.5 rounded-lg
```

### 5.4 TabSwitcher — Onglets

```tsx
// Import
import { TabSwitcher } from "@/components/my-space/tab-switcher";

// Usage
<TabSwitcher
  tabs={[
    { key: "all", label: "Tous", icon: FileText, count: 12 },
    { key: "pending", label: "En cours", icon: Clock, count: 3 },
  ]}
  activeTab={activeTab}
  onTabChange={setActiveTab}
/>

// Container : bg-card border border-border rounded-xl p-1
// Tab active : bg-primary text-primary-foreground shadow-sm
// Tab inactive : text-muted-foreground hover:text-foreground hover:bg-muted/50
// Tabs en flex equal-width (flex-1 justify-center)
```

### 5.5 EmptyState — État Vide

```tsx
// Import
import { EmptyState } from "@/components/my-space/empty-state";

// Usage
<EmptyState
  icon={<FileText className="h-8 w-8 text-muted-foreground" />}
  title="Aucun document"
  description="Vous n'avez pas encore ajouté de documents."
  action={<Button>Ajouter un document</Button>}
/>

// Icon wrapper : rounded-full bg-muted p-4
// Centré verticalement et horizontalement
```

### 5.6 Boutons — 3 Types Stricts

#### Type A : Bouton Secondaire (le plus courant)

```tsx
className="h-8 md:h-7 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97]"
```

| Propriété | Valeur |
|-----------|--------|
| Hauteur | `h-8` (mobile) · `h-7` (desktop via `md:h-7`) |
| Radius | `rounded-lg` |
| Background | `#DCD7C7` / dark: `#4A4744/40` |
| Texte | `text-xs font-medium text-foreground` |
| Hover | `hover:bg-[#DCD7C7]/80` |
| Active | `active:scale-[0.97]` |

#### Type B : Bouton Icône (edit/pencil)

```tsx
className="h-5 w-5 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"
// Icône interne : h-2.5 w-2.5 ou h-3 w-3 text-muted-foreground
```

#### Type C : CTA Principal

```tsx
// Standard
className="h-9 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium text-xs"

// Pleine largeur (bottom sheet)
className="w-full h-11 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white border-0"
```

**Règle universelle :** TOUS les boutons ont `active:scale-[0.97] transition-transform`.

### 5.7 Sub-cards — Items Internes

```tsx
// Sub-card neutre (fond S4)
className="rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5"

// Sub-card activité amber (items d'activité utilisateur)
className="rounded-xl bg-amber-500/15 dark:bg-amber-500/10 p-2.5 transition-colors hover:bg-amber-500/25 dark:hover:bg-amber-500/15"

// Sub-card passée (grisée)
className="rounded-xl bg-[#EBE6DC] dark:bg-[#383633] p-2.5"
```

**Pattern grille d'items :**
```tsx
<div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 min-[400px]:gap-2.5">
  {/* Item actif */}
  {/* Item "+" ajouter */}
</div>
```

### 5.8 Item "Ajouter" (+)

```tsx
<Link
  href="/services"
  className="flex flex-col items-center justify-center gap-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5 text-muted-foreground transition-colors hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 hover:text-foreground"
>
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBE6DC] dark:bg-[#383633]">
    <Plus className="h-3.5 w-3.5" />
  </div>
  <p className="text-[10px] font-medium">Nouvelle démarche</p>
</Link>
```

### 5.9 Badges — 7 Variantes

| Type | Classes exactes |
|------|----------------|
| **User type** (amber) | `rounded-lg bg-amber-500/35 dark:bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400` |
| **Completion** (emerald) | `rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400` |
| **Active card** (green) | `h-5 bg-green-500/25 px-1.5 py-0 text-xs font-medium text-green-700 dark:text-green-400` |
| **Expired** (rose) | `h-5 bg-rose-500/10 px-1.5 py-0 text-xs font-medium text-rose-600 dark:text-rose-400` |
| **Count** | `rounded-full bg-[#EBE6DC] dark:bg-[#383633] px-2 py-0.5 text-xs font-bold text-muted-foreground` |
| **Status (request)** | `h-4 shrink-0 px-1 py-0 text-[10px] font-medium lg:h-5 lg:px-1.5 lg:text-xs` + couleur dynamique |
| **Unread count** | `h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold` |

### 5.10 Progress Bar

```tsx
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
```

### 5.11 Alert Banner (mobile)

```tsx
<Link
  href="/my-space/settings?tab=dossier"
  className="flex-1 flex items-center gap-2.5 rounded-xl bg-rose-500/10 px-3 py-2.5 transition-colors hover:bg-rose-500/15 overflow-hidden"
>
  <div className="shrink-0 rounded-md bg-rose-500/15 p-1">
    <AlertTriangle className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
  </div>
  <span className="flex-1 truncate text-xs font-bold text-rose-600 dark:text-rose-400">
    {alertText}
  </span>
  <ArrowRight className="h-3 w-3 shrink-0 text-rose-500/60" />
</Link>
```

### 5.12 Avatar

```tsx
// Mobile hero (80px)
<Avatar className="h-20 w-20 shrink-0 bg-muted">
  <AvatarImage src={avatarUrl} />
  <AvatarFallback className="bg-primary text-2xl font-bold text-white">
    {firstName?.[0]}{lastName?.[0]}
  </AvatarFallback>
</Avatar>

// Desktop hero (120px)
<Avatar className="h-[120px] w-[120px] bg-muted">

// Sidebar / petit (36px)
<div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
  <span className="text-xs font-bold text-primary">U</span>
</div>

// Bottom sheet (40px)
<div className="h-10 w-10 rounded-full bg-primary flex items-center justify-center">
  <span className="text-sm font-bold text-white">{initial}</span>
</div>
```

### 5.13 Phone Info Box (desktop inset)

```tsx
<div className="mt-4 w-full rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5">
  <div className="flex items-center gap-2.5 text-sm font-medium">
    <Phone className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
    <span className="flex-1 truncate text-sm font-bold">{phone}</span>
    <Button size="icon" variant="ghost" className="h-6 w-6 shrink-0 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]">
      <Pencil className="h-3 w-3 text-muted-foreground" />
    </Button>
  </div>
</div>
```

### 5.14 Notification Bell

```tsx
<NotificationDropdown className="h-10 w-10 min-w-[40px] bg-card rounded-lg shrink-0" />
```

### 5.15 Séparateurs

```tsx
// Interne aux cartes (subtil)
<div className="border-b border-foreground/5" />

// Sidebar / entre sections
<div className="border-t border-border" />

// Sheet menu
<div className="h-px bg-border/50" />
```

---

## 6. SYSTÈME D'ICÔNES

### 6.1 Librairie

**UNIQUEMENT `lucide-react`.** Aucune autre librairie d'icônes permise.

### 6.2 Échelle de tailles

| Contexte | Taille | Exemple |
|----------|--------|---------|
| Inline micro | `h-2.5 w-2.5` | Pencil dans bouton edit |
| Inline petit | `h-3 w-3` | Icon dans dossier items, count |
| Icon container (section header) | `h-3.5 w-3.5` | Icon dans SectionHeader |
| Nav / actions | `h-4 w-4` | Plus, ArrowRight, Settings |
| Nav mobile | `h-4.5 w-4.5` | Icons bottom navbar |
| Icon section large | `h-5 w-5` (`size-5`) | Sidebar nav icons |
| FAB / Hero | `h-6 w-6` | Bot dans FAB central |

### 6.3 Icon Container Patterns

```tsx
// ── Niveau S2 — Section header (le plus fréquent) ──
<div className="rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// ── Niveau S2 — Page header (plus grand) ──
<div className="rounded-lg bg-[#EBE6DC] dark:bg-[#383633] p-1.5">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// ── Coloré — Activité amber ──
<div className="rounded-md bg-amber-500/10 p-1 lg:p-1.5">
  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400 lg:h-5 lg:w-5" />
</div>

// ── Coloré — Alerte rose ──
<div className="rounded-md bg-rose-500/15 p-1">
  <Icon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
</div>

// ── Minimal — foreground opacity ──
<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// ── Rond — Bouton ajouter ──
<div className="h-7 w-7 rounded-full bg-[#EBE6DC] dark:bg-[#383633] flex items-center justify-center">
  <Plus className="h-3.5 w-3.5" />
</div>
```

---

## 7. SYSTÈME DE LAYOUT

### 7.1 Layout Principal (MySpaceWrapper)

```
+--------------------------------------------------+
| citizen-layout (bg: var(--card) / dark: #111111)  |
| flex h-dvh flex-col md:flex-row                   |
|                                                   |
| [Sidebar (md+)]  [Main Content]  [MobileNavBar]  |
+--------------------------------------------------+
```

```tsx
// Container principal
className="citizen-layout relative flex h-dvh flex-col overflow-hidden md:flex-row md:h-screen"

// Zone main
className="flex-1 overflow-hidden md:overflow-y-auto citizen-scrollbar px-3 min-[400px]:px-4 pt-3 pb-18 md:px-4 md:pt-4 md:pb-4"
```

### 7.2 Layout Mobile — Vue iProfil

```
+------------------------------------------+
| [Alert Banner]          [Notification]    |  ← Tools bar
+------------------------------------------+
| [Signaler] [+ Démarche]                  |  ← Header actions
+------------------------------------------+
|                                           |
| +--------------------------------------+  |
| | FlatCard: Hero Profil                |  |  ← Photo + Nom + Badges
| |   Avatar 80px | Matricule + Badges   |  |
| |               | NOM (uppercase)      |  |
| |               | Prénom (capitalize)  |  |
| |               | Phone + Edit         |  |
| | [Ma Carte] [Créer iCV]              |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: Démarches en cours         |  |
| |   [Item actif amber] [+ Nouvelle]   |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: Rendez-vous                |  |
| |   [RDV actif] [+ Prendre RDV]       |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: Assistance & Contacts      |  |
| +--------------------------------------+  |
|                                           |
+------------------------------------------+
| [iProfil|iBoîte|[iAsted FAB]|iAgenda|Menu] | ← Fixed bottom
+------------------------------------------+
```

- Layout vertical scroll, cartes empilées avec `gap-4`
- `pb-18` pour laisser de la place à la navbar fixe
- Horizontal swipe entre "Dashboard" et "Actualités" (2 pages)

### 7.3 Layout Desktop — Grille 12 Colonnes

```
+-----------------------------------------------------------------------------------+
| Sidebar (w-56/w-68)  |  Col1 (3-4/12)  |  Col2 (5/12)   |  Col3 (3-4/12)       |
|                       |  Hero           |  Démarches     |  Alertes             |
|                       |  Carte          |  RDV           |  iCV                 |
|                       |  Dossier        |  Assistance    |  Actualités          |
|                       |  Enfants        |                |                      |
+-----------------------------------------------------------------------------------+
```

```tsx
<div className="hidden h-full gap-5 overflow-hidden lg:grid lg:grid-cols-12">
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
    {/* Col1: Hero + Carte + Dossier + Enfants */}
  </div>
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-5">
    {/* Col2: Démarches + RDV + Assistance */}
  </div>
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-4">
    {/* Col3: Alertes + iCV + Actualités */}
  </div>
</div>
```

### 7.4 Layout Pages Secondaires

```tsx
<div className="flex h-full flex-col overflow-hidden">
  <PageHeader title="..." icon={<Icon />} showBackButton />
  <div className="flex-1 overflow-y-auto citizen-scrollbar mt-4 space-y-4">
    <FlatCard>...</FlatCard>
    <FlatCard>...</FlatCard>
  </div>
</div>
```

### 7.5 Sidebar Desktop

```
+------------------+
| Logo + Brand     |
| ──────────────── |
| IDENTITÉ         |
|   iProfil        |
|   iDocument      |
| ──────────────── |
| OUTILS           |
|   iBoîte         |
|   iAsted         |
|   iAgenda        |
| ──────────────── |
| DEMANDES         |
|   Mes Démarches  |
| ──────────────── |
| TUTEUR           |
|   Mes Enfants    |
| ──────────────── |
|   Paramètres     |
| ──────────────── |
| [Lang] [<] [Dark]|
| [Avatar] [Name]  |
+------------------+
```

**Dimensions :**
- Expanded : `w-56` (224px)
- Collapsed : `w-[68px]` (68px)
- Container externe : `p-4 pr-0` → `rounded-2xl bg-[#F4F3ED] dark:bg-[#171616]`
- Padding interne : `py-3 px-3`

**Nav item :**
```tsx
// Actif
className="w-full gap-3 px-3 h-11 rounded-lg font-bold text-primary bg-primary/10 dark:bg-primary/20 dark:text-primary"

// Inactif
className="w-full gap-3 px-3 h-11 rounded-lg font-semibold text-muted-foreground hover:text-foreground hover:bg-muted/50"
```

### 7.6 Mobile NavBar

```
+----------------------------------------------------------+
| iProfil  iBoîte  [iAsted FAB]  iAgenda  Menu             |
+----------------------------------------------------------+
```

```tsx
// Conteneur fixe
className="fixed left-3 right-3 z-40 md:hidden bottom-[calc(0.8rem+env(safe-area-inset-bottom,0px))]"

// Surface
className="bg-[#F4F3ED] dark:bg-[#171616] backdrop-blur-md rounded-2xl"

// Inner
className="flex items-center justify-around px-2 h-[60px]"
```

**NavBarItem :**
```tsx
// Container
className="flex flex-col items-center justify-center gap-0.5 py-2 px-1 min-w-[48px]"

// Icon box (7x7)
className="h-7 w-7 rounded-lg flex items-center justify-center"
// + active: "bg-primary/10"

// Icon
className="h-4.5 w-4.5"
// active: "text-primary" / inactive: "text-muted-foreground"

// Label
className="text-[9px] font-medium"
// active: "text-primary" / inactive: "text-muted-foreground"
```

**iAsted FAB (centre) :**
```tsx
className="h-12 w-12 rounded-full flex items-center justify-center bg-emerald-600 hover:bg-emerald-500 -mt-4"
// Icon: Bot h-6 w-6 text-white
// Badge unread: h-5 min-w-5 rounded-full bg-red-500 text-white text-[10px] font-bold
```

### 7.7 Bottom Sheet Menu

```tsx
// Sheet surface
className="rounded-t-2xl max-h-[75dvh] px-4 bg-[#F4F3ED] dark:bg-[#171616] border-none shadow-2xl"

// User info row
// Avatar: h-10 w-10 rounded-full bg-primary + text-sm font-bold text-white
// Name: text-sm font-semibold
// Email: text-xs text-muted-foreground

// Menu grid
className="grid grid-cols-3 gap-2"

// Menu item
className="flex flex-col items-center justify-center gap-1.5 p-3 rounded-xl min-h-[68px]"
// Active: "bg-primary/10 text-primary font-semibold"
// Inactive: "bg-muted text-muted-foreground hover:bg-muted/70"
// Icon: size-5
// Label: text-[11px] font-medium leading-tight

// Action buttons row (bas)
// Language toggle: h-10 w-10 rounded-full bg-muted
// Theme toggle: h-10 w-10 rounded-full bg-muted
// Logout: h-10 px-4 rounded-full bg-rose-500/10 text-rose-500

// CTA bottom
className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-white"
```

---

## 8. SYSTÈME D'ESPACEMENT

### 8.1 Échelle d'espacement

| Token | Valeur | Usage |
|-------|--------|-------|
| `gap-0.5` | 2px | Entre label et icône nav |
| `gap-1.5` | 6px | Icône + texte bouton |
| `gap-2` | 8px | Items de grille (mobile) |
| `gap-2.5` | 10px | Items de grille (400px+), icône + texte section header |
| `gap-3` | 12px | Entre cartes dans une colonne mobile, padding mobile |
| `gap-4` | 16px | Entre FlatCards (colonne desktop) |
| `gap-5` | 20px | Grille 12 colonnes desktop |

### 8.2 Padding

| Contexte | Mobile | Desktop |
|----------|--------|---------|
| Page main | `px-3 min-[400px]:px-4 pt-3 pb-18` | `md:px-4 md:pt-4 md:pb-4` |
| FlatCard interne | `p-3` | `lg:p-4` |
| Sub-card item | `p-2.5` | `lg:p-3` |
| Sidebar | `py-3 px-3` | — |
| NavBar | `px-2` | — |
| Sheet menu | `px-4` | — |

### 8.3 Marges

| Contexte | Valeur |
|----------|--------|
| Section header → contenu | `mb-2 lg:mb-3` |
| Entre rows dans une carte | `gap-3` ou `gap-4` |
| Header actions → contenu | `mt-3 lg:mt-4` |
| Avatar → texte (vertical desktop) | `mb-1.5` ou `mb-4` |
| Tools bar bottom | `mb-3` |

---

## 9. SYSTÈME DE RADIUS

| Élément | Radius | Tailwind |
|---------|--------|----------|
| FlatCard | 12px | `rounded-xl` |
| Sidebar container | 16px | `rounded-2xl` |
| NavBar container | 16px | `rounded-2xl` |
| Sheet menu | 16px top | `rounded-t-2xl` |
| Sub-card neutre | 8px | `rounded-lg` |
| Activité item (amber, mobile) | 12px | `rounded-xl` |
| Activité item (amber, desktop) | 8px | `rounded-lg` |
| Bouton secondaire | 8px | `rounded-lg` |
| Bouton CTA | 8px | `rounded-lg` |
| Icon container | 6px | `rounded-md` |
| Badge texte | 8px | `rounded-lg` |
| Count badge | 9999px | `rounded-full` |
| Avatar | 9999px | implicite via composant |
| Nav item | 8px | `rounded-lg` |
| Menu sheet item | 12px | `rounded-xl` |
| FAB central | 9999px | `rounded-full` |
| Edit button | 9999px | `rounded-full` |

---

## 10. ANIMATIONS & TRANSITIONS

### 10.1 Entrée de page

```tsx
// Motion wrapper principal
<motion.div
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative mt-3 min-h-0 flex-1 overflow-hidden"
>
```

### 10.2 Stagger Children (colonnes desktop)

```css
.stagger-children > * { opacity: 0; animation: fadeInUp 0.4s ease-out forwards; }
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.10s; }
.stagger-children > *:nth-child(3) { animation-delay: 0.15s; }
.stagger-children > *:nth-child(4) { animation-delay: 0.20s; }
.stagger-children > *:nth-child(5) { animation-delay: 0.25s; }
.stagger-children > *:nth-child(6) { animation-delay: 0.30s; }
.stagger-children > *:nth-child(7) { animation-delay: 0.35s; }
.stagger-children > *:nth-child(8) { animation-delay: 0.40s; }

@keyframes fadeInUp {
  from { opacity: 0; transform: translateY(8px); }
  to { opacity: 1; transform: translateY(0); }
}
```

### 10.3 Transitions interactives

| Élément | Transition |
|---------|------------|
| Bouton secondaire press | `active:scale-[0.97]` + `transition-transform` |
| Hover carte/item | `transition-colors` |
| Sidebar expand/collapse | `transition-[width] duration-300 ease-in-out` |
| Sidebar texte apparition | `transition-opacity duration-200` + `delay-100` (expanded) |
| Nav item hover | `transition-all duration-200` |
| FAB iAsted | Spring : `damping: 20, stiffness: 300` |
| Circle menu overlay | `backdrop-blur-xl bg-black/50` + spring `damping: 22, stiffness: 260` |

### 10.4 View Transitions

```css
::view-transition-old(root) { animation: fade-out 120ms ease-out; }
::view-transition-new(root) { animation: fade-in 120ms ease-in; }
```

### 10.5 Shimmer (loading)

```css
.animate-shimmer {
  background: linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.1) 50%, transparent 100%);
  background-size: 200% 100%;
  animation: shimmer 2s infinite;
}
```

---

## 11. SCROLLBAR & OVERFLOW

```css
/* Scrollbar fine personnalisée */
.citizen-scrollbar::-webkit-scrollbar { width: 5px; }
.citizen-scrollbar::-webkit-scrollbar-track { background: transparent; }
.citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); border-radius: 10px; }
.dark .citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); }

/* Masquer complètement */
.disable-scrollbars { -ms-overflow-style: none; scrollbar-width: none; }
.disable-scrollbars::-webkit-scrollbar { display: none; }
```

---

## 12. ACCESSIBILITÉ

### 12.1 Focus

```css
*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
```

### 12.2 Touch

```css
button, a, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}
```

### 12.3 Safe Area (mobile)

```tsx
// NavBar position
bottom-[calc(0.8rem+env(safe-area-inset-bottom,0px))]

// Page padding
pb-18 // suffisant pour couvrir NavBar + safe area
```

### 12.4 Reduce Motion

```css
[data-reduce-motion="true"] * {
  animation-duration: 0.01ms !important;
  animation-iteration-count: 1 !important;
  transition-duration: 0.01ms !important;
  scroll-behavior: auto !important;
}
```

---

## 13. RESPONSIVE BREAKPOINTS

| Breakpoint | Valeur | Utilisation dans iProfil |
|------------|--------|------------------------|
| `(default)` | 0+ | Base mobile |
| `min-[380px]` | 380px | Texte étendu "Signaler ma présence" vs "Signaler" |
| `min-[400px]` | 400px | Padding amélioré (`px-4`), gaps plus grands (`gap-2.5`) |
| `min-[460px]` | 460px | Texte complet "Nouvelle démarche" vs "Démarche" |
| `md` | 768px | Bascule sidebar ↔ bottom-nav, overflow scroll |
| `lg` | 1024px | Grille 12 colonnes, layouts desktop complets |

---

## 14. PATTERNS DE DONNÉES (WIREFRAMES)

### 14.1 Hero Profil Mobile

```
+-------+  MATRICULE  (font-mono xs bold tracking-wide uppercase muted)
| Photo |  [Badge type amber] [Badge % emerald]
|  80px |  NOM_FAMILLE (text-base font-black uppercase)
|       |  Prénom (text-sm font-medium muted capitalize)
+-------+  📱 Phone + ✏️ Edit pencil
[Ma Carte] [Créer iCV]  ← grid 2 cols boutons type A
```

### 14.2 Hero Profil Desktop

```
        +--------+
        | Photo  |    Score % (emerald badge)
        | 120px  |
        +--------+
      NOM (center, text-lg font-black uppercase)
     Prénom (center, text-base font-medium muted)
  +-------------------+
  | 📱 Phone | ✏️ Edit |  ← Sub-card S4
  +-------------------+
```

### 14.3 Section Activité (Démarches / RDV)

```
[Icon S2] Titre section          [Bouton type A action]
+------------------+  +------------------+
| [Icon amber]     |  | [+]              |
| Titre item       |  | Label action     |
| Badge statut     |  |                  |
| Org / Date       |  |                  |
+------------------+  +------------------+
     amber sub-card       neutre S4 sub-card
```

### 14.4 Section Enfants

```
[Icon S2] Enfants [? tooltip]              [Count badge]
+------------------------------------------------+
| [🍼 Icon] Prénom Nom    Age ans    →           | ← horizontal scroll
+------------------------------------------------+
```

---

## 15. ARBRE DE COMPOSANTS

```
MySpaceWrapper
  ├── MySpaceSidebar (md+)
  │   ├── Logo + Brand text
  │   ├── NavSection "IDENTITÉ" [iProfil, iDocument]
  │   ├── NavSection "OUTILS" [iBoîte, iAsted, iAgenda]
  │   ├── NavSection "DEMANDES" [Mes Démarches]
  │   ├── NavSection "TUTEUR" [Mes Enfants (collapsible)]
  │   ├── Paramètres
  │   └── Bottom: [Lang, Theme, Collapse] + [Avatar, Name, Logout]
  │
  ├── <main className="flex-1 overflow-hidden citizen-scrollbar ...">
  │   ├── AlertBanner + NotificationDropdown (mobile tools bar)
  │   ├── MySpaceHeader (matricule, badges, action CTAs)
  │   │
  │   └── motion.div (contenu principal)
  │       │
  │       ├── [DESKTOP] lg:grid lg:grid-cols-12 gap-5
  │       │   ├── Col1 (col-span-3): Hero + Carte + Dossier + Enfants
  │       │   ├── Col2 (col-span-5): Démarches + RDV + Assistance
  │       │   └── Col3 (col-span-4): Alertes + iCV + Actualités
  │       │
  │       └── [MOBILE] Vertical scroll gap-4
  │           ├── FlatCard: Hero Profil
  │           ├── FlatCard: Démarches en cours
  │           ├── FlatCard: Rendez-vous
  │           └── FlatCard: Assistance & Contacts
  │
  ├── MobileNavBar (md:hidden)
  │   ├── NavBarItem: iProfil
  │   ├── NavBarItem: iBoîte
  │   ├── FAB: iAsted (centre, emerald, -mt-4)
  │   ├── NavBarItem: iAgenda
  │   └── NavBarItem: Menu → Bottom Sheet
  │       ├── User info row
  │       ├── Grid 3 cols: [iDocument, Démarches, Paramètres, Enfants]
  │       ├── Actions: [Lang, Theme, Logout]
  │       └── CTA: Nouvelle démarche
  │
  └── CitizenIAstedWindow (overlay flottant)
```

---

## 16. CHECKLIST D'IMPLÉMENTATION

Avant de déployer une nouvelle page dans l'espace utilisateur, vérifier :

### Structure
- [ ] La page utilise `MySpaceWrapper` comme layout parent
- [ ] Le contenu est dans des `FlatCard` avec padding `p-3 lg:p-4` sur l'enfant
- [ ] Les sections ont un `SectionHeader` avec icon container
- [ ] La grille desktop utilise `lg:grid-cols-12` avec les bons `col-span`
- [ ] Les colonnes desktop ont `citizen-scrollbar stagger-children overflow-y-auto`

### Couleurs
- [ ] Surfaces : uniquement S0-S4 du mapping warm gray
- [ ] Pas de couleur Tailwind brute (`blue-500`, `green-100`, etc.)
- [ ] Pas d'ombre (`box-shadow: none` global)
- [ ] Accents limités à amber, emerald/green, rose, primary
- [ ] Dark mode testé et validé
- [ ] Opacités dark < opacités light pour les BG translucides

### Typographie
- [ ] Texte principal en `text-sm` ou `text-xs` dans les cartes
- [ ] Labels en `text-[10px]` uppercase
- [ ] Pas de texte plus grand que `text-base` dans les cartes
- [ ] Graisse minimum `font-medium` (500)
- [ ] `font-black` réservé au nom de famille uniquement

### Composants
- [ ] Boutons type A pour les actions secondaires dans les cartes
- [ ] Boutons type B pour les edit icons (ronds, ghost)
- [ ] Boutons type C uniquement pour les CTA principaux (header, bottom sheet)
- [ ] Badges avec opacités correctes (light > dark)
- [ ] Icon containers avec `rounded-md` et fond S2

### Mobile
- [ ] Padding responsive `px-3 min-[400px]:px-4`
- [ ] Texte responsive avec `min-[380px]:` et `min-[460px]:`
- [ ] NavBar bottom visible avec `pb-18`
- [ ] Safe area insets respectés
- [ ] Touch targets minimum 48px

### Animations
- [ ] `stagger-children` sur les colonnes desktop
- [ ] `active:scale-[0.97]` sur TOUS les boutons
- [ ] `transition-colors` sur les items interactifs
- [ ] `motion.div` pour l'entrée de page

---

## 17. PROMPT IA EXÉCUTABLE COMPLET

> Copier-coller ce prompt pour qu'un agent IA implémente ce design system à la lettre.

```
Tu es un développeur frontend expert qui implémente le Citizen Design System
v3.0 « Slate Trust & Authority » de consulat.ga. Tu génères ou refactores une
interface de l'espace utilisateur (citizen-web).

═══════════════════════════════════════════════════════════════
                    RÈGLES ABSOLUES
═══════════════════════════════════════════════════════════════

── 1. SURFACES (5 niveaux warm gray) ──

Utilise UNIQUEMENT ces couleurs de surface :
  S0 Layout    : var(--card) / dark: #111111
  S1 Card      : bg-[#F4F3ED] dark:bg-[#171616]
  S2 Icon/Badge: bg-[#EBE6DC] dark:bg-[#383633]
  S3 Button    : bg-[#DCD7C7] dark:bg-[#4A4744]/40
  S4 Sub-card  : bg-[#FDFCFA] dark:bg-[#21201E]/77

JAMAIS bg-white, bg-black, bg-gray-*, ou toute couleur Tailwind brute.

── 2. ZÉRO OMBRES ──

Le CSS global supprime TOUTES les ombres avec box-shadow: none !important.
Ne jamais ajouter shadow-*, drop-shadow, ou box-shadow en inline.
L'élévation se fait par la luminosité du fond (plus clair = plus élevé).

── 3. CONTENEUR PRINCIPAL : FlatCard ──

  <FlatCard className="flex flex-col">
    <div className="p-3 lg:p-4">{children}</div>
  </FlatCard>

  Implementation : rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden
  - Radius = rounded-xl (JAMAIS rounded-lg ou rounded-2xl)
  - Pas de border, pas de shadow
  - Padding TOUJOURS sur l'enfant, JAMAIS sur FlatCard

── 4. EN-TÊTES DE SECTION ──

Utilise <SectionHeader> ou reproduis :
  <div className="mb-2 flex items-center justify-between lg:mb-3">
    <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
      <div className="rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1">
        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
      </div>
      Titre
    </span>
    {actions}
  </div>

── 5. BOUTONS (3 types seulement) ──

Type A (secondaire, le plus courant) :
  h-8 md:h-7 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40
  px-3 text-xs font-medium text-foreground
  hover:bg-[#DCD7C7]/80 active:scale-[0.97] transition-transform

Type B (icône edit) :
  h-5 w-5 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]
  Icône : h-2.5 w-2.5 ou h-3 w-3 text-muted-foreground

Type C (CTA principal) :
  h-9 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium text-xs
  Pleine largeur : w-full h-11 rounded-lg text-sm

RÈGLE : TOUS les boutons ont active:scale-[0.97] transition-transform

── 6. COULEURS D'ACCENT (4 strictement) ──

  Amber (warning)  : bg-amber-500/35 dark:bg-amber-500/15 · text-amber-700 dark:text-amber-400
  Emerald (success) : bg-emerald-500/15 dark:bg-emerald-500/20 · text-emerald-600 dark:text-emerald-400
  Green (active)    : bg-green-500/25 · text-green-700 dark:text-green-400
  Rose (destructive): bg-rose-500/10 · text-rose-600 dark:text-rose-400

Les BG translucides dark sont MOINS opaques que light.
JAMAIS de couleur vive hors sémantique de statut.

── 7. TYPOGRAPHIE ──

  Section header : text-sm font-semibold text-muted-foreground
  Texte courant  : text-xs font-medium
  Labels         : text-[10px] font-semibold uppercase tracking-widest
  Valeurs        : text-xs font-bold
  Nom famille    : text-base uppercase font-black text-foreground (mobile) / text-lg (desktop)
  Prénom         : text-sm capitalize font-medium text-muted-foreground
  Matricule      : font-mono text-xs font-bold tracking-wide uppercase

JAMAIS font-normal (minimum font-medium 500).
font-black (900) réservé au nom de famille UNIQUEMENT.

── 8. LAYOUT MOBILE ──

  Container : px-3 min-[400px]:px-4 pt-3 pb-18
  FlatCards  : gap-4 vertical scroll
  Padding    : p-3 lg:p-4 sur l'enfant

── 9. LAYOUT DESKTOP ──

  lg:grid lg:grid-cols-12 gap-5
  Colonnes avec citizen-scrollbar stagger-children overflow-y-auto

── 10. ICÔNES ──

  lucide-react UNIQUEMENT
  Standard : h-3.5 w-3.5 dans les containers
  Actions  : h-4 w-4
  Nav      : h-4.5 w-4.5 (mobile) · size-5 (sidebar)
  Container: rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1

── 11. SUB-CARDS ──

  Neutre : rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5
  Active : rounded-xl bg-amber-500/15 dark:bg-amber-500/10 p-2.5
  Passée : rounded-xl bg-[#EBE6DC] dark:bg-[#383633] p-2.5

── 12. ANIMATIONS ──

  stagger-children sur les colonnes desktop (fadeInUp 0.4s, delay 50ms/enfant)
  active:scale-[0.97] sur TOUS les boutons
  transition-colors sur les items interactifs
  motion.div initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }} pour les pages

── 13. COMPOSANTS OBLIGATOIRES ──

  FlatCard      : @/components/my-space/flat-card
  SectionHeader : @/components/my-space/section-header
  PageHeader    : @/components/my-space/page-header
  TabSwitcher   : @/components/my-space/tab-switcher
  EmptyState    : @/components/my-space/empty-state

Pour chaque nouvelle page my-space :
1. Wrapper   : MySpaceWrapper comme layout parent
2. Header    : PageHeader avec showBackButton si sous-page
3. Contenu   : FlatCard avec SectionHeader
4. Desktop   : Grille lg:grid-cols-12 avec colonnes appropriées
5. Items     : Sub-cards bg-[#FDFCFA] dark:bg-[#21201E]/77
6. Validation: Tester dark mode + mobile + desktop

═══════════════════════════════════════════════════════════════
                    10 INTERDITS
═══════════════════════════════════════════════════════════════
❌ shadow / shadow-* / box-shadow
❌ border sur FlatCard
❌ bg-white / bg-black / couleurs Tailwind brutes
❌ font-normal (minimum font-medium)
❌ icônes non-lucide-react
❌ rounded-2xl sur FlatCard (c'est rounded-xl)
❌ padding sur FlatCard racine (p-0, padding sur enfant)
❌ couleurs vives hors sémantique de statut
❌ gradient coloré pour fonds de section
❌ texte > text-base dans les cartes
```

---

## 18. ANNEXES

### Annexe A — Variables CSS complètes (citizen-web/globals.css)

```css
:root {
  --gabon-green-hex: #009E60;
  --gabon-yellow-hex: #FCD116;
  --gabon-blue-hex: #3A75C4;
  --citizen-surface-card: #F4F3ED;
  --neu-surface: #EFEFEF;
  --neu-surface-card: #F5F5F5;
  --neu-surface-sidebar: #EFEFEF;
}

.dark {
  --citizen-surface-card: rgba(28, 27, 26, 0.57);
  --neu-surface: #141414;
  --neu-surface-card: #1E1E1E;
  --neu-surface-sidebar: #121212;
}

/* Global no-shadow */
*, *::before, *::after {
  box-shadow: none !important;
  text-shadow: none !important;
}
```

### Annexe B — Variables CSS base (packages/ui/globals.css)

```css
/* Primary */
--primary: #0072B9;

/* Base typography */
--font-sans: 'Inter', sans-serif;
--font-display: 'Plus Jakarta Sans', var(--font-sans);

/* Radius */
--radius: 0.625rem; /* 10px */
```

### Annexe C — Classes utilitaires custom

| Classe | Usage |
|--------|-------|
| `.citizen-layout` | Background du layout principal |
| `.citizen-scrollbar` | Scrollbar fine 5px |
| `.disable-scrollbars` | Masquer la scrollbar |
| `.stagger-children` | Animation cascade desktop |
| `.animate-fade-in-up` | Entrée simple fadeInUp |
| `.animate-shimmer` | Effet loading shimmer |
| `.heading-official` | Heading institutionnel bold |
| `.gabon-stripe` | Bande drapeau horizontale 3px |
| `.gabon-stripe-vertical` | Bande drapeau verticale 3px |
| `.flat-card-border` | Bordure subtile oklch |
| `.bg-gabon-green-tint` | Tint vert 8%/15% |
| `.bg-gabon-yellow-tint` | Tint jaune 8%/12% |
| `.bg-gabon-blue-tint` | Tint bleu 8%/15% |
| `.text-gradient-official` | Texte gradient tricolore |

### Annexe D — Fichiers sources de référence

| Fichier | Rôle |
|---------|------|
| `apps/citizen-web/src/app/my-space/page.tsx` | Page iProfil complète (référence absolue) |
| `apps/citizen-web/src/components/my-space/flat-card.tsx` | Composant FlatCard |
| `apps/citizen-web/src/components/my-space/section-header.tsx` | Composant SectionHeader |
| `apps/citizen-web/src/components/my-space/page-header.tsx` | Composant PageHeader |
| `apps/citizen-web/src/components/my-space/tab-switcher.tsx` | Composant TabSwitcher |
| `apps/citizen-web/src/components/my-space/empty-state.tsx` | Composant EmptyState |
| `apps/citizen-web/src/components/my-space/my-space-wrapper.tsx` | Layout + Header |
| `apps/citizen-web/src/components/my-space/mobile-nav-bar.tsx` | Navigation mobile |
| `apps/citizen-web/src/components/my-space/my-space-sidebar.tsx` | Sidebar desktop |
| `apps/citizen-web/src/app/globals.css` | Tokens CSS citizen-web |
| `packages/ui/src/styles/globals.css` | Tokens CSS base (shadcn) |

---

> **Ce document est la source de vérité unique du Citizen Design System.**
> Toute nouvelle page de l'espace utilisateur DOIT s'y conformer.
> En cas de doute, la page iProfil mobile dark est la référence absolue.
