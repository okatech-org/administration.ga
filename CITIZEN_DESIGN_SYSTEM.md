# Citizen Design System — Espace Utilisateur

> **Version:** 2.0 — Design System complet extrait de iProfil & Tableau de bord
> **Reference vivante:** `/my-space` du citizen-web (mode mobile dark = reference absolue)
> **Fichiers sources:** `apps/citizen-web/src/app/globals.css` | `packages/ui/src/styles/globals.css`
> **Composants:** `apps/citizen-web/src/components/my-space/`

---

## 1. PHILOSOPHIE

### 1.1 Principes fondamentaux

Le Citizen Design System repose sur 5 principes extraits de la page iProfil :

1. **Flat & Warm** — Surfaces plates sans ombre (global `box-shadow: none !important`), teintes chaudes de gris (beige-gris, pas de gris pur)
2. **Elevation par couleur** — L'elevation visuelle se fait par la luminosite du fond, pas par des ombres. Plus clair = plus eleve
3. **Achromatique + 4 accents** — Palette stricte : gris chauds + bleu (primary), vert (success), amber (warning), rose (destructive)
4. **Mobile-first institutionnel** — L'experience mobile est la reference absolue. Le desktop est une extension en grille
5. **Information dense, UI calme** — Beaucoup d'information dans peu d'espace, sans bruit visuel. Texte petit, compact, lisible

### 1.2 Anti-patterns (NE JAMAIS FAIRE)

- JAMAIS de `box-shadow` — le CSS global le supprime avec `!important`
- JAMAIS de couleurs Tailwind brutes (`blue-500`, `green-100`)
- JAMAIS de gradient colore pour les fonds de section
- JAMAIS d'icones hors lucide-react
- JAMAIS de bordures epaisses colorees (sauf thin 3px top decoratif)
- JAMAIS de background colore entier sur une section
- JAMAIS de radius `rounded-lg` pour les cartes (toujours `rounded-xl`)
- JAMAIS de `border-border` seul (utiliser `flat-card-border` ou `border-foreground/5`)

---

## 2. PALETTE DE COULEURS

### 2.1 Surfaces — Echelle Warm Gray (5 niveaux)

L'echelle de surfaces utilise des gris **chauds** (teinte beige), PAS des gris purs.

| Niveau | Nom | Light Mode | Dark Mode | Usage |
|--------|-----|------------|-----------|-------|
| S0 | Layout BG | `var(--card)` #FFFFFF | `#111111` | Fond de page entiere (citizen-layout) |
| S1 | Card Surface | `#F4F3ED` | `#171616` | Cartes principales, sidebar, navbar mobile |
| S2 | Icon Box / Badge BG | `#EBE6DC` | `#383633` | Conteneurs d'icones, count badges, hover states legers |
| S3 | Button Secondary | `#DCD7C7` | `#4A4744/40` | Boutons secondaires type A |
| S4 | Sub-card / Inset | `#FDFCFA` | `#21201E/77` | Sous-cartes internes, items en retrait, infoboxes |

### 2.2 Variables CSS de surface

```css
/* Citizen shared surface — variable unique */
:root  { --citizen-surface-card: #F4F3ED; }
.dark  { --citizen-surface-card: rgba(28, 27, 26, 0.57); }
```

### 2.3 Couleur Primary

| Mode | Valeur | Usage |
|------|--------|-------|
| Light | `#0072B9` | CTA, nav active, liens, ring focus |
| Dark | `#0072B9` | Identique (invariant entre modes) |

### 2.4 Couleurs de statut (4 accents strictement)

| Accent | Couleur | BG translucide (Light) | BG translucide (Dark) | Texte (Light) | Texte (Dark) |
|--------|---------|------------------------|----------------------|---------------|---------------|
| **Amber** (Warning) | amber-500 | `amber-500/35` | `amber-500/15` | `amber-700` | `amber-400` |
| **Emerald** (Success) | emerald-500 | `emerald-500/15` | `emerald-500/20` | `emerald-600` | `emerald-400` |
| **Green** (Active) | green-500 | `green-500/25` | `green-500/25` | `green-700` | `green-400` |
| **Rose** (Destructive) | rose-500 | `rose-500/10` | `rose-500/10` | `rose-600` | `rose-400` |

> **Convention des opacites :** Les BG dark sont toujours MOINS opaques que les BG light.
> Pattern type : `bg-{color}-500/{light-opacity} dark:bg-{color}-500/{dark-opacity}`

### 2.5 Couleurs speciales

| Usage | Light | Dark | Application |
|-------|-------|------|-------------|
| Foreground 6% | `foreground/[0.06]` | `foreground/[0.12]` | Conteneur d'icones minimal |
| Border interne | `border-foreground/5` | `border-foreground/5` | Separateurs internes aux cartes |
| Flat card border | `oklch(0 0 0 / 0.05)` | `oklch(1 0 0 / 0.05)` | Bordure externe des FlatCards |

### 2.6 Couleurs Gabon (decoratif UNIQUEMENT)

| Couleur | Hex | Usage |
|---------|-----|-------|
| Vert | `#009E60` | gabon-stripe, tints decoratifs |
| Jaune/Or | `#FCD116` | gabon-stripe |
| Bleu | `#3A75C4` | gabon-stripe |

---

## 3. TYPOGRAPHIE

### 3.1 Familles

| Usage | Police | Variable |
|-------|--------|----------|
| Corps de texte | Inter Variable | `--font-sans` |
| Titres, headings | Plus Jakarta Sans Variable | `--font-display` |

### 3.2 Echelle typographique iProfil

| Element | Classes exactes | Exemple |
|---------|----------------|---------|
| **Nom de famille** | `text-base leading-none font-black text-foreground uppercase` (mobile) / `text-lg` (desktop) | PELLEN-LAKOUMBA |
| **Prenom** | `text-sm font-medium text-muted-foreground capitalize` (mobile) / `text-base` (desktop) | Gueylord Asted |
| **Matricule** | `font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase` | GAB-FR-2026-00297 |
| **Section header** | `text-sm font-semibold text-muted-foreground` | Demarches en cours |
| **Label sidebar section** | `text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70` | IDENTITE |
| **Bouton texte** | `text-xs font-medium text-foreground` | Mes Demarches |
| **Texte secondaire** | `text-xs font-medium text-muted-foreground` | 27 mars 2025 |
| **Micro label** | `text-[10px] font-medium text-muted-foreground` | Suggestion |
| **Micro badge** | `text-[9px] font-medium` ou `text-[10px] font-bold` | Long sejour |
| **Nav bar label** | `text-[9px] font-medium` | iProfil |
| **Sidebar nav item** | `text-[15.5px] font-semibold` (inactif) / `font-bold` (actif) | iDocument |
| **Sidebar user** | `text-xs font-semibold` (nom), `text-[10px] text-muted-foreground` (email) | — |
| **Card title (activity)** | `text-xs leading-tight font-bold text-foreground` (mobile) / `text-sm` (desktop) | Renouvellement de passeport |

### 3.3 Regles typographiques

1. Le nom de famille est TOUJOURS en `uppercase font-black`
2. Le prenom est TOUJOURS en `capitalize font-medium text-muted-foreground`
3. Les matricules/codes sont en `font-mono uppercase tracking-wide`
4. Le texte courant est en `text-sm` (14px) ou `text-xs` (12px), jamais plus grand dans les cartes
5. Les labels de section utilisent `font-semibold`, pas `font-bold` (sauf titre principal)
6. La graisse dominante dans les cartes est `font-medium` (500)
7. `font-bold` (700) est reserve aux titres de cartes et valeurs importantes
8. `font-black` (900) est reserve au nom de famille UNIQUEMENT

---

## 4. SYSTEME DE COMPOSANTS

### 4.1 FlatCard — Conteneur principal

Le composant de base de tout l'espace utilisateur. Pas d'ombre, surface chaude.

```tsx
// Composant
<FlatCard className="relative shrink-0">
  <div className="p-3 lg:p-4">
    {/* contenu */}
  </div>
</FlatCard>

// Implementation CSS
className="rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden"
```

**Variantes de padding :**

| Contexte | Padding |
|----------|---------|
| Standard | `p-3 lg:p-4` |
| Hero profil | `p-3 min-[400px]:p-4` |
| Widget compact | `p-3` |

**Regles strictes :**
- Radius : TOUJOURS `rounded-xl` (jamais `rounded-lg`)
- Pas de bordure visible par defaut (pas de `border`)
- Pas de shadow (global override)
- Overflow : `overflow-hidden`

### 4.2 Section Header — Pattern universel

Chaque section dans une FlatCard commence par un header standardise.

```tsx
// Structure exacte
<div className="mb-2 flex shrink-0 items-center justify-between lg:mb-3">
  <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
    <div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]">
      <Icon className="h-3.5 w-3.5 text-muted-foreground" />
    </div>
    Titre de la section
  </span>
  {/* Actions optionnelles (bouton, badge, compteur) */}
</div>
```

**Composant reutilisable :** `SectionHeader` dans `components/my-space/section-header.tsx`

**Elements du pattern :**
- Icon container : `rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1`
- Icon : `h-3.5 w-3.5 text-muted-foreground`
- Gap icon/texte : `gap-2.5`
- Texte : `text-sm font-semibold text-muted-foreground`
- Marge bas : `mb-2 lg:mb-3`

### 4.3 Boutons — 3 types stricts

#### Type A : Bouton secondaire (action dans les cartes)

```tsx
className="h-8 md:h-7 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97]"
```

| Propriete | Valeur |
|-----------|--------|
| Hauteur | `h-8` (mobile) / `h-7` (desktop via `md:h-7`) |
| Radius | `rounded-lg` |
| Background | `#DCD7C7` / dark: `#4A4744/40` |
| Texte | `text-xs font-medium text-foreground` |
| Hover | `hover:bg-[#DCD7C7]/80` |
| Active | `active:scale-[0.97]` |

#### Type B : Bouton icone (edit/pencil)

```tsx
className="h-5 w-5 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"
// Icone interne : h-2.5 w-2.5 ou h-3 w-3 text-muted-foreground
```

#### Type C : CTA principal

```tsx
className="h-9 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium text-xs"
// Variante pleine largeur :
className="w-full h-11 rounded-lg text-sm font-medium bg-primary hover:bg-primary/90 text-white border-0"
```

### 4.4 Sub-cards — Items internes

Les items en retrait dans les FlatCards utilisent une surface plus claire.

```tsx
// Sub-card neutre
className="rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5"

// Sub-card activite (amber — items d'activite utilisateur)
className="rounded-xl bg-amber-500/15 dark:bg-amber-500/10 p-2.5 transition-colors hover:bg-amber-500/25 dark:hover:bg-amber-500/15"

// Sub-card passee (grise)
className="rounded-xl bg-[#EBE6DC] dark:bg-[#383633] p-2.5"
```

**Pattern grille d'items :**
```tsx
<div className="grid flex-1 auto-rows-fr grid-cols-2 gap-2 min-[400px]:gap-2.5">
  {/* Item actif */}
  {/* Item "+" ajouter */}
</div>
```

### 4.5 Item "Ajouter" (+)

```tsx
<Link
  href="/services"
  className="flex flex-col items-center justify-center gap-2 rounded-lg bg-[#FDFCFA] dark:bg-[#21201E]/77 p-2.5 text-muted-foreground transition-colors hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 hover:text-foreground"
>
  <div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBE6DC] dark:bg-[#383633]">
    <Plus className="h-3.5 w-3.5" />
  </div>
  <p className="text-[10px] font-medium">Nouvelle demarche</p>
</Link>
```

### 4.6 Avatar

```tsx
// Mobile hero
<Avatar className="h-20 w-20 shrink-0 bg-muted">
  <AvatarImage src={avatarUrl} />
  <AvatarFallback className="bg-primary text-2xl font-bold text-white">
    {firstName?.[0]}{lastName?.[0]}
  </AvatarFallback>
</Avatar>

// Desktop hero
<Avatar className="h-[120px] w-[120px] bg-muted">

// Sidebar/petit
<div className="size-9 rounded-xl bg-primary/10 flex items-center justify-center">
  <span className="text-xs font-bold text-primary">U</span>
</div>
```

### 4.7 Badges

| Type | Classes exactes |
|------|----------------|
| **User type** (amber) | `rounded-lg bg-amber-500/35 dark:bg-amber-500/15 px-1.5 py-0.5 text-[9px] font-medium text-amber-700 dark:text-amber-400` |
| **Completion** (emerald) | `rounded-md bg-emerald-500/15 dark:bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-bold text-emerald-600 dark:text-emerald-400` |
| **Active card** (green) | `h-5 bg-green-500/25 px-1.5 py-0 text-xs font-medium text-green-700 dark:text-green-400` |
| **Expired** (rose) | `h-5 bg-rose-500/10 px-1.5 py-0 text-xs font-medium text-rose-600 dark:text-rose-400` |
| **Count** | `rounded-full bg-[#EBE6DC] dark:bg-[#383633] px-2 py-0.5 text-xs font-bold text-muted-foreground` |
| **Status (request)** | `h-4 shrink-0 px-1 py-0 text-[10px] font-medium lg:h-5 lg:px-1.5 lg:text-xs` + couleur dynamique |
| **Unread count** | `h-5 min-w-5 px-1 rounded-full bg-red-500 text-white text-[10px] font-bold` |

### 4.8 Progress Bar

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
    {score}% complete
  </span>
</div>
```

### 4.9 Alert Banner (mobile)

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

### 4.10 Notification Bell

```tsx
<NotificationDropdown className="h-10 w-10 min-w-[40px] bg-card rounded-lg shrink-0" />
```

### 4.11 Phone Info Box (desktop inset)

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

### 4.12 Separateurs

```tsx
// Interne aux cartes (subtil)
<div className="border-b border-foreground/5" />

// Sidebar / entre sections
<div className="border-t border-border" /> // avec largeur reduite si collapsed: "w-8 mx-auto"

// Sheet menu
<div className="h-px bg-border/50" />
```

---

## 5. SYSTEME DE LAYOUT

### 5.1 Layout Principal (MySpaceWrapper)

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

### 5.2 Layout Mobile — Vue iProfil

```
+------------------------------------------+
| [Alert Banner] [Notification Bell]        |  <- Tools bar
+------------------------------------------+
| [Signaler] [+ Demarche]                  |  <- Header actions
+------------------------------------------+
|                                           |
| +--------------------------------------+  |
| | FlatCard: Hero Profil                |  |  <- Photo + Nom + Badges
| |   Avatar | Matricule + Badges        |  |
| |          | NOM                        |  |
| |          | Prenom                     |  |
| |          | Phone + Edit               |  |
| | [Ma Carte] [Creer iCV]              |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: Demarches en cours         |  |
| |   [Item actif] [+ Nouvelle]          |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: RDV                        |  |
| |   [RDV actif] [+ Prendre RDV]       |  |
| +--------------------------------------+  |
|                                           |
| +--------------------------------------+  |
| | FlatCard: Assistance & Contacts      |  |
| +--------------------------------------+  |
|                                           |
+------------------------------------------+
| [NavBar: iProfil|iBoite|iAsted|iAgenda|Menu]  |  <- Fixed bottom
+------------------------------------------+
```

- Layout vertical scroll, cartes empilees avec `gap-4`
- Horizontal swipe entre "Dashboard" et "Actualites" (2 pages)
- `pb-18` pour laisser de la place a la navbar fixe

### 5.3 Layout Desktop — Grille 12 colonnes

```
+-----------------------------------------------------------------------------------+
| Sidebar (w-56/w-68)  |  Col1 (3/12)  |  Col2 (5/12)    |  Col3 (4/12)           |
|                       |  Hero         |  Demarches      |  Alertes               |
|                       |  Carte        |  RDV            |  iCV                   |
|                       |  Dossier      |  Assistance     |  Actualites            |
|                       |  Enfants      |                 |                        |
+-----------------------------------------------------------------------------------+
```

```tsx
<div className="hidden h-full gap-5 overflow-hidden lg:grid lg:grid-cols-12">
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-3">
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-5">
  <div className="citizen-scrollbar stagger-children flex min-h-0 flex-col gap-4 overflow-y-auto lg:col-span-4">
</div>
```

### 5.4 Sidebar Desktop

```
+------------------+
| Logo + Brand     |
| ──────────────── |
| IDENTITE         |
|   iProfil        |
|   iDocument      |
| ──────────────── |
| OUTILS           |
|   iBoite         |
|   iAsted         |
|   iAgenda        |
| ──────────────── |
| DEMANDES         |
|   Mes Demarches  |
| ──────────────── |
| TUTEUR           |
|   Mes Enfants    |
| ──────────────── |
|   Parametres     |
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

### 5.5 Mobile NavBar

```
+----------------------------------------------------------+
| iProfil  iBoite  [iAsted FAB]  iAgenda  Menu             |
+----------------------------------------------------------+
```

**Structure :**
```tsx
// Conteneur
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

// Icon box
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
```

### 5.6 Bottom Sheet Menu

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

// Action buttons row
// Language toggle: h-10 w-10 rounded-full bg-muted
// Theme toggle: h-10 w-10 rounded-full bg-muted
// Logout: h-10 px-4 rounded-full bg-rose-500/10 text-rose-500

// CTA bottom
className="w-full h-11 rounded-lg bg-primary hover:bg-primary/90 text-white"
```

---

## 6. ICONES

### 6.1 Librairie

**UNIQUEMENT `lucide-react`.** Aucune autre librairie d'icones permise.

### 6.2 Echelle de tailles

| Contexte | Taille | Exemple |
|----------|--------|---------|
| Inline micro | `h-2.5 w-2.5` | Pencil dans bouton edit |
| Inline petit | `h-3 w-3` | Icon dans dossier items, count |
| Icon container (section header) | `h-3.5 w-3.5` | Icon dans section header |
| Nav / actions | `h-4 w-4` | Plus, ArrowRight, Settings |
| Nav mobile | `h-4.5 w-4.5` | Icons bottom navbar |
| Icon section large | `h-5 w-5` | Sidebar nav icons |
| FAB / Hero | `h-6 w-6` | Bot dans FAB central |

### 6.3 Icon Container Pattern

```tsx
// Niveau S2 — section header (le plus frequent)
<div className="rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// Niveau S2 — page header (plus grand)
<div className="rounded-lg bg-[#EBE6DC] dark:bg-[#383633] p-1.5">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// Colore — activite amber
<div className="rounded-md bg-amber-500/10 p-1 lg:p-1.5">
  <Icon className="h-4 w-4 text-amber-600 dark:text-amber-400 lg:h-5 lg:w-5" />
</div>

// Colore — alerte rose
<div className="rounded-md bg-rose-500/15 p-1">
  <Icon className="h-3.5 w-3.5 text-rose-600 dark:text-rose-400" />
</div>

// Minimal — foreground opacity
<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

// Rond — bouton ajouter
<div className="h-7 w-7 rounded-full bg-[#EBE6DC] dark:bg-[#383633] flex items-center justify-center">
  <Plus className="h-3.5 w-3.5" />
</div>
```

---

## 7. ANIMATIONS & TRANSITIONS

### 7.1 Entree de page

```tsx
// Motion wrapper principal
<motion.div
  initial={{ opacity: 0, y: 5 }}
  animate={{ opacity: 1, y: 0 }}
  className="relative mt-3 min-h-0 flex-1 overflow-hidden"
>
```

### 7.2 Stagger Children

Les colonnes desktop utilisent `stagger-children` pour animer l'entree en cascade.

```css
.stagger-children > * { opacity: 0; animation: fadeInUp 0.4s ease-out forwards; }
.stagger-children > *:nth-child(1) { animation-delay: 0.05s; }
.stagger-children > *:nth-child(2) { animation-delay: 0.10s; }
/* ... jusqu'a 8 enfants */
```

### 7.3 Transitions interactives

| Element | Transition |
|---------|------------|
| Bouton secondaire press | `active:scale-[0.97]` + `transition-transform` |
| Hover carte | `transition-colors` |
| Sidebar expand/collapse | `transition-[width] duration-300 ease-in-out` |
| Sidebar text apparition | `transition-opacity duration-200` + `delay-100` (quand expanded) |
| Nav item hover | `transition-all duration-200` |
| FAB iAsted | Spring animation `damping: 20, stiffness: 300` |
| Circle menu overlay | `backdrop-blur-xl bg-black/50` + spring `damping: 22, stiffness: 260` |

### 7.4 View Transitions

```css
::view-transition-old(root) { animation: fade-out 120ms ease-out; }
::view-transition-new(root) { animation: fade-in 120ms ease-in; }
```

---

## 8. ESPACEMENT

### 8.1 Echelle d'espacement

| Token | Valeur | Usage |
|-------|--------|-------|
| `gap-0.5` | 2px | Entre label et icone nav |
| `gap-1.5` | 6px | Icone + texte bouton |
| `gap-2` | 8px | Items de grille (mobile) |
| `gap-2.5` | 10px | Items de grille (400px+), icone + texte section header |
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
| Avatar → texte (vertical) | `mb-1.5` (desktop center) ou `mb-4` (desktop) |
| Tools bar bottom | `mb-3` |

---

## 9. RADIUS

| Element | Radius | Tailwind |
|---------|--------|----------|
| FlatCard | 12px | `rounded-xl` |
| Sidebar container | 16px | `rounded-2xl` |
| NavBar container | 16px | `rounded-2xl` |
| Sheet menu | 16px top | `rounded-t-2xl` |
| Sub-card / item | 8px | `rounded-lg` |
| Activity item (amber) | 12px | `rounded-xl` (mobile) / `rounded-lg` (desktop) |
| Bouton secondaire | 8px | `rounded-lg` |
| Bouton CTA | 8px | `rounded-lg` |
| Icon container | 6px | `rounded-md` |
| Badge | 8px | `rounded-lg` |
| Count badge | 9999px | `rounded-full` |
| Avatar | 9999px | implicite via composant |
| Nav item | 8px | `rounded-lg` |
| Menu sheet item | 12px | `rounded-xl` |
| FAB central | 9999px | `rounded-full` |
| Edit button | 9999px | `rounded-full` |

---

## 10. SCROLLBAR

```css
/* Scrollbar fine personnalisee */
.citizen-scrollbar::-webkit-scrollbar { width: 5px; }
.citizen-scrollbar::-webkit-scrollbar-track { background: transparent; }
.citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(0, 0, 0, 0.12); border-radius: 10px; }
.dark .citizen-scrollbar::-webkit-scrollbar-thumb { background: rgba(255, 255, 255, 0.12); }

/* Masquer completement */
.disable-scrollbars { -ms-overflow-style: none; scrollbar-width: none; }
.disable-scrollbars::-webkit-scrollbar { display: none; }
```

---

## 11. ACCESSIBILITE

### 11.1 Focus

```css
*:focus-visible { outline: 2px solid var(--ring); outline-offset: 2px; }
```

### 11.2 Touch

```css
button, a, [role="button"] {
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  touch-action: manipulation;
}
```

### 11.3 Safe Area

```tsx
// NavBar position
bottom-[calc(0.8rem+env(safe-area-inset-bottom,0px))]

// Page padding
pb-18 // suffisant pour couvrir NavBar + safe area
```

### 11.4 Reduce Motion

```css
[data-reduce-motion="true"] * {
  animation-duration: 0.01ms !important;
  transition-duration: 0.01ms !important;
}
```

---

## 12. RESPONSIVE BREAKPOINTS

| Breakpoint | Utilisation dans iProfil |
|------------|------------------------|
| `(default)` | Base mobile (0+) |
| `min-[380px]` | Affichage etendu "Signaler ma presence" vs "Signaler" |
| `min-[400px]` | Padding ameliore (`px-4`), gaps plus grands (`gap-2.5`) |
| `min-[460px]` | Texte complet "Nouvelle demarche" vs "Demarche" |
| `md` (768px) | Bascule sidebar / bottom-nav, overflow scroll |
| `lg` (1024px) | Grille 12 colonnes, layouts desktop complets |

---

## 13. PATTERNS DE DONNEES

### 13.1 Hero Profil Mobile

```
+-------+  MATRICULE
| Photo |  [Badge type] [Badge %]
|  80px |  NOM_FAMILLE (uppercase, font-black)
|       |  Prenom (capitalize, muted)
+-------+  Phone + Edit pencil
[Ma Carte] [Creer iCV]  <- grid 2 cols
```

### 13.2 Hero Profil Desktop

```
     +--------+
     | Photo  |    Score %
     | 120px  |
     +--------+
   NOM (center, lg)
  Prenom (center)
+-------------------+
| Phone | Edit      |
+-------------------+
```

### 13.3 Section Activite (Demarches / RDV)

```
[Icon] Titre section          [Bouton action]
+------------------+  +------------------+
| [Icon amber]     |  | [+]              |
| Titre item       |  | Label action     |
| Badge statut     |  |                  |
| Org / Date       |  |                  |
+------------------+  +------------------+
```

### 13.4 Section Enfants

```
[Icon] Enfants [?tooltip]              [Count]
+------------------------------------------------+
| [Icon baby] Prenom Nom    Age    ->             | <- horizontal scroll
+------------------------------------------------+
```

---

## 14. CHECKLIST D'IMPLEMENTATION

Avant de deployer une nouvelle page dans l'espace utilisateur, verifier :

### Structure
- [ ] La page utilise `MySpaceWrapper` comme layout parent
- [ ] Le contenu est dans des `FlatCard` avec `p-3 lg:p-4`
- [ ] Les sections ont un `SectionHeader` avec icon container
- [ ] La grille desktop utilise `lg:grid-cols-12` avec les bons `col-span`

### Couleurs
- [ ] Surfaces : uniquement `#F4F3ED` / `#171616` (S1) ou `#FDFCFA` / `#21201E/77` (S4)
- [ ] Pas de couleur Tailwind brute
- [ ] Pas d'ombre (`box-shadow: none` global)
- [ ] Accents limites a amber, emerald/green, rose, primary
- [ ] Dark mode teste et valide

### Typographie
- [ ] Texte principal en `text-sm` ou `text-xs`
- [ ] Labels en `text-[10px]` uppercase
- [ ] Pas de texte plus grand que `text-base` dans les cartes

### Composants
- [ ] Boutons type A pour les actions secondaires
- [ ] Boutons type B pour les edit icons
- [ ] Boutons type C uniquement dans le header ou bottom sheet
- [ ] Badges avec opacites correctes (light > dark)
- [ ] Icon containers avec `rounded-md bg-[#EBE6DC] dark:bg-[#383633]`

### Mobile
- [ ] Padding responsive `px-3 min-[400px]:px-4`
- [ ] Texte responsive avec `min-[380px]:` et `min-[460px]:`
- [ ] NavBar bottom visible avec `pb-18`
- [ ] Safe area insets respectes

### Animations
- [ ] `stagger-children` sur les colonnes desktop
- [ ] `active:scale-[0.97]` sur les boutons secondaires
- [ ] `transition-colors` sur les items interactifs

---

## 15. PROMPT COMPLET POUR IMPLEMENTATION IA

Utilisez ce prompt pour qu'un agent IA implemente ce design systeme a la lettre :

```
Tu es un developpeur frontend expert qui implemente le Citizen Design System de consulat.ga.

## Regles absolues

1. SURFACES : Utilise UNIQUEMENT ces couleurs de surface :
   - Cartes principales : bg-[#F4F3ED] dark:bg-[#171616]
   - Sous-cartes : bg-[#FDFCFA] dark:bg-[#21201E]/77
   - Conteneurs icones : bg-[#EBE6DC] dark:bg-[#383633]
   - Boutons secondaires : bg-[#DCD7C7] dark:bg-[#4A4744]/40
   - Layout fond : var(--card) / dark: #111111

2. PAS D'OMBRES : Le CSS global supprime toutes les ombres avec
   box-shadow: none !important. Ne jamais ajouter de shadow-*.

3. RADIUS : Cartes = rounded-xl. Items/boutons/nav = rounded-lg.
   Badges ronds = rounded-full. Icon containers = rounded-md.

4. TYPOGRAPHIE :
   - Titres de section : text-sm font-semibold text-muted-foreground
   - Texte courant : text-xs font-medium
   - Labels : text-[10px] font-semibold uppercase tracking-widest
   - Valeurs : text-xs font-bold
   - Noms : uppercase font-black (famille), capitalize font-medium (prenom)

5. PATTERN SECTION HEADER obligatoire :
   <div className="mb-2 flex items-center justify-between lg:mb-3">
     <span className="flex items-center gap-2.5 text-sm font-semibold text-muted-foreground">
       <div className="rounded-md bg-[#EBE6DC] dark:bg-[#383633] p-1">
         <Icon className="h-3.5 w-3.5 text-muted-foreground" />
       </div>
       Titre
     </span>
     {actions}
   </div>

6. BOUTONS : 3 types seulement.
   - Type A (secondaire) : h-8 md:h-7 rounded-lg bg-[#DCD7C7]
     dark:bg-[#4A4744]/40 text-xs font-medium active:scale-[0.97]
   - Type B (icone edit) : h-5 w-5 rounded-full hover:bg-[#EBE6DC]
     dark:hover:bg-[#383633]
   - Type C (CTA) : h-9 rounded-lg bg-primary text-white

7. COULEURS D'ACCENT : UNIQUEMENT amber, emerald/green, rose, primary (#0072B9).
   Les BG translucides dark sont MOINS opaques que light.

8. LAYOUT MOBILE : px-3 min-[400px]:px-4 pt-3 pb-18.
   FlatCard avec p-3 lg:p-4. Gap entre cartes : gap-4.

9. LAYOUT DESKTOP : lg:grid lg:grid-cols-12 gap-5.
   Colonnes avec citizen-scrollbar stagger-children.

10. ICONES : lucide-react UNIQUEMENT. Taille standard h-3.5 w-3.5
    dans les containers, h-4 w-4 pour les actions.

11. COMPOSANT FlatCard : rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden.
    Pas de border, pas de shadow.

12. ANIMATIONS : stagger-children sur les colonnes, active:scale-[0.97]
    sur les boutons, transition-colors sur les items hover.

Pour chaque nouvelle page my-space :
1. Wrapper : MySpaceWrapper
2. Header : MySpaceHeader
3. Contenu dans FlatCard avec SectionHeader
4. Grille desktop avec colonnes appropriees
5. Items dans sub-cards bg-[#FDFCFA] dark:bg-[#21201E]/77
6. Tester dark mode + mobile + desktop
```

---

## ANNEXE A — Mapping couleurs de surface

```
Luminosite (Light Mode) :
#FFFFFF (layout) > #F4F3ED (card) > #FDFCFA (sub-card) > #EBE6DC (icon box) > #DCD7C7 (button)

Luminosite (Dark Mode) :
#111111 (layout) < #171616 (card) < #21201E/77 (sub-card) < #383633 (icon box) < #4A4744/40 (button)
```

## ANNEXE B — Arbre de composants iProfil

```
MySpaceWrapper
  ├── MySpaceSidebar (md+)
  ├── <main>
  │   ├── AlertBanner + NotificationDropdown (mobile)
  │   ├── MySpaceHeader (actions CTA)
  │   └── motion.div (grid desktop / scroll mobile)
  │       ├── Col1: Hero + Carte + Dossier + Enfants
  │       ├── Col2: Demarches + RDV + Assistance
  │       └── Col3: Alertes + iCV + Actualites
  ├── MobileNavBar (mobile)
  └── CitizenIAstedWindow (overlay)
```

## ANNEXE C — Fichiers sources de reference

| Fichier | Role |
|---------|------|
| `apps/citizen-web/src/app/my-space/page.tsx` | Page iProfil complete (reference absolue) |
| `apps/citizen-web/src/components/my-space/flat-card.tsx` | Composant FlatCard |
| `apps/citizen-web/src/components/my-space/my-space-wrapper.tsx` | Layout + Header |
| `apps/citizen-web/src/components/my-space/mobile-nav-bar.tsx` | Navigation mobile |
| `apps/citizen-web/src/components/my-space/my-space-sidebar.tsx` | Sidebar desktop |
| `apps/citizen-web/src/components/my-space/section-header.tsx` | Composant SectionHeader |
| `apps/citizen-web/src/app/globals.css` | Tokens CSS citizen-web |
| `packages/ui/src/styles/globals.css` | Tokens CSS base (shadcn) |
