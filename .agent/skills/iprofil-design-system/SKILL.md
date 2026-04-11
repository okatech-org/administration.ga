---
name: iprofil-design-system
description: "Expert et Gardien du Design System iProfil v2.0 — « Slate Trust & Authority ». Vous devez obligatoirement activer cette compétence lors de la création, la structuration, ou le refactoring de tout espace utilisateur (citoyen, résident, professionnel). Architecture mobile-first snap-x, layout Bento/FlatCard et palette institutionnelle premium. Document de référence : iprofil_design_system.md"
---

# Design System iProfil v2.0 — Espace Utilisateur

> **Esthétique : « Slate Trust & Authority »**
> Autorité institutionnelle douce — confiance, compétence, premium. Zéro ombre, zéro bordure visible, coins arrondis généreux, couleurs tamisées.

---

## 1. Les 7 Piliers Fondamentaux

1. **Zéro ombre** — `box-shadow: none !important` global. Élévation par contraste de fond.
2. **Zéro bordure visible** — FlatCard sans border. Séparation par couleur de fond.
3. **Coins arrondis généreux** — `rounded-xl` FlatCard, `rounded-lg` sous-éléments, `rounded-md` IconBox.
4. **Mobile-first absolu** — Mobile = référence. Desktop = extension Bento Grid.
5. **Couleurs tamisées** — Light: `#F4F3ED`, Dark: `#171616`. JAMAIS blanc/noir pur sur les cartes.
6. **Typographie dense** — 10px→18px, `font-medium` minimum. Pas de `font-normal`.
7. **Semantic-only accent** — Couleurs vives réservées aux statuts/alertes uniquement.

---

## 2. Conteneur Roi : `FlatCard`

```tsx
import { FlatCard } from "@/components/my-space/flat-card";
// Squelette : rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden
// Padding sur l'enfant : <div className="p-3 lg:p-4">
<FlatCard className="flex flex-col">{children}</FlatCard>
```

**Sous-conteneurs internes :**
- Fond : `bg-[#FDFCFA] dark:bg-[#21201E]/77`
- Hover : `hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 transition-colors`
- Coins : `rounded-lg`

---

## 3. Palette de Couleurs Exacte

### Surfaces & Boutons

| Token | Light | Dark |
|-------|-------|------|
| FlatCard bg | `#F4F3ED` | `#171616` |
| Sous-conteneur | `#FDFCFA` | `#21201E/77` |
| Bouton iProfil | `#DCD7C7` | `#4A4744/40` |
| IconBox bg | `#EBE6DC` | `#383633` |
| Ghost hover | `#EBE6DC` | `#383633` |
| Layout body | `var(--card)` | `#111111` |

### Sémantique (4 niveaux stricts)

| Statut | Fond | Texte/Icône |
|--------|------|-------------|
| ⚠️ Warning | `bg-amber-500/15 dark:bg-amber-500/10` | `text-amber-600 dark:text-amber-400` |
| 🔴 Error | `bg-rose-500/10` | `text-rose-600 dark:text-rose-400` |
| ✅ Success | `bg-green-500/25` ou `bg-emerald-500/15` | `text-green-700 dark:text-green-400` |
| 🔵 Info | `bg-primary/10` | `text-primary` |

---

## 4. Typographie

| Rôle | Classes |
|------|---------|
| Valeur de champ | `text-xs font-bold text-foreground` |
| Label de champ | `text-[10px] uppercase font-medium text-muted-foreground` |
| Nom de famille | `text-lg font-black text-foreground uppercase` |
| Prénom | `text-sm font-medium text-muted-foreground capitalize` |
| Matricule | `font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase` |
| Titre de section | `text-sm font-semibold text-muted-foreground` |

---

## 5. IconBox Pattern

```tsx
{/* Standard (header) */}
<div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>

{/* Sémantique (alerte) */}
<div className="rounded-md bg-amber-500/10 p-1">
  <AlertTriangle className="h-3.5 w-3.5 text-amber-600 dark:text-amber-400" />
</div>

{/* Action circulaire */}
<div className="flex h-7 w-7 items-center justify-center rounded-full bg-[#EBE6DC] dark:bg-[#383633]">
  <Plus className="h-3.5 w-3.5" />
</div>
```

---

## 6. Boutons

```tsx
{/* Bouton iProfil neutre (le plus courant) */}
className="h-8 gap-1.5 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground transition-transform hover:bg-[#DCD7C7]/80 dark:hover:bg-[#4A4744]/40 active:scale-[0.97]"

{/* CTA primaire */}
className="h-9 px-4 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium"

{/* Icône ghost */}
className="h-5 w-5 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"
```

---

## 7. Layout

### Mobile : Snap-X (Dashboard)
```tsx
<div className="disable-scrollbars flex h-[calc(100%-0.5rem)] snap-x snap-mandatory overflow-x-auto lg:hidden">
  <div className="h-full w-full shrink-0 snap-start overflow-hidden">
    <div className="flex h-full flex-col gap-2.5">
      <FlatCard className="min-h-0 flex-3">Hero</FlatCard>
      <FlatCard className="min-h-0 flex-2">Démarches</FlatCard>
      <FlatCard className="min-h-0 flex-2">RDV</FlatCard>
    </div>
  </div>
</div>
```

### Desktop : Bento Grid 12 Colonnes
```tsx
<div className="hidden h-full gap-5 overflow-hidden lg:grid lg:grid-cols-12">
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-3">...</div>
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-5">...</div>
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-4">...</div>
</div>
```

### Pages secondaires
```tsx
<div className="flex h-full flex-col overflow-hidden">
  <PageHeader title="..." icon={<Icon />} showBackButton />
  <div className="flex-1 overflow-y-auto citizen-scrollbar mt-4 space-y-4">
    <FlatCard>...</FlatCard>
  </div>
</div>
```

---

## 8. Composants Réutilisables

| Composant | Import | Usage |
|-----------|--------|-------|
| `FlatCard` | `@/components/my-space/flat-card` | Conteneur principal |
| `SectionHeader` | `@/components/my-space/section-header` | En-tête section avec IconBox |
| `PageHeader` | `@/components/my-space/page-header` | En-tête de page animée |
| `TabSwitcher` | `@/components/my-space/tab-switcher` | Onglets inline |
| `EmptyState` | `@/components/my-space/empty-state` | État vide centré |

---

## 9. Animations

- **Stagger** : Classe CSS `stagger-children` sur les colonnes desktop (delay 50ms par enfant)
- **Entrée page** : `initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}`
- **Active scale** : `active:scale-[0.97] transition-transform` sur tous les boutons
- **Theme transition** : background-color 300ms, color 150ms

---

## 10. PROMPT IA EXÉCUTABLE

> **SYSTEM PROMPT: iProfil UI Design Rules v2.0**
> 
> Tu génères ou refactores une interface de l'espace utilisateur (citizen-web). Tu DOIS respecter l'esthétique institutionnelle iProfil à la lettre. Utilise obligatoirement les patterns suivants:
> 
> **1. Conteneurs principaux :**
> - Wrappe tes blocs majeurs dans `<FlatCard className="flex flex-col">{children}</FlatCard>`.
> - Pour les fonds internes : `bg-[#FDFCFA] dark:bg-[#21201E]/77`. Hover : `hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 transition-colors`.
> - ZÉRO shadow, ZÉRO border. Padding sur l'enfant DIV.
> 
> **2. En-têtes de Section :**
> - Utilise `SectionHeader` ou reproduis: `flex justify-between items-center mb-2`
> - Icône TOUJOURS dans une boîte : `<div className="rounded-md bg-[#EBE6DC] p-1 dark:bg-[#383633]"><Icon className="h-3.5 w-3.5 text-muted-foreground" /></div>`
> - Titre : `text-sm font-semibold text-muted-foreground`
> 
> **3. Boutons et Actions :**
> - Bouton iProfil : `variant="ghost" className="rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 text-xs font-medium text-foreground hover:bg-[#DCD7C7]/80 active:scale-[0.97]"`
> - Bouton ghost : `hover:bg-[#EBE6DC] dark:hover:bg-[#383633]` avec icône `h-3 w-3`
> - TOUS les boutons : `active:scale-[0.97] transition-transform`
> 
> **4. Couleurs Sémantiques :**
> - Warning : `bg-amber-500/15 dark:bg-amber-500/10` / `text-amber-600 dark:text-amber-400`
> - Error : `bg-rose-500/10` / `text-rose-600 dark:text-rose-400`
> - Success : `bg-green-500/25` / `text-green-700 dark:text-green-400`
> 
> **5. Typographie :**
> - Valeurs : `text-xs font-bold text-foreground`. Labels : `text-[10px] uppercase font-medium text-muted-foreground`
> - JAMAIS font-normal sur les métriques.
> 
> **6. Layout :**
> - Desktop ≥ lg : `lg:grid lg:grid-cols-12` / Colonnes `stagger-children overflow-y-auto citizen-scrollbar`
> - Mobile : `px-3 min-[400px]:px-4 pt-3 pb-18` / `gap-2.5` entre FlatCards
> 
> **10 INTERDITS :** ❌ shadow, ❌ border sur FlatCard, ❌ bg-white/bg-black, ❌ font-normal, ❌ icônes non-Lucide, ❌ rounded-2xl sur FlatCard, ❌ padding sur FlatCard racine, ❌ Tailwind shadow-*, ❌ couleurs vives hors sémantique, ❌ scroll vertical dashboard mobile.
