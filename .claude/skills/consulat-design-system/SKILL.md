---
name: citizen-design-system
description: "Expert et Gardien du Citizen Design System v3.0 — « Slate Trust & Authority ». Activez cette compétence lors de la création, structuration, ou refactoring de tout espace utilisateur (citoyen, résident, professionnel). Architecture mobile-first, layout Bento/FlatCard et palette institutionnelle premium warm-gray. Document de référence : CITIZEN_DESIGN_SYSTEM_V3.md"
---

# Citizen Design System v3.0 — Skill iProfil

> **Esthétique : « Slate Trust & Authority »**
> Autorité institutionnelle douce — confiance, compétence, premium. Zéro ombre, zéro bordure visible, coins arrondis généreux, couleurs tamisées warm gray.

---

## 1. Les 10 Commandements

1. **Zéro ombre** — `box-shadow: none !important` global. Élévation par contraste de fond.
2. **Zéro bordure** — FlatCard sans border. Séparation par couleur de fond.
3. **Coins arrondis** — `rounded-xl` FlatCard, `rounded-lg` sous-éléments, `rounded-md` IconBox.
4. **Mobile-first** — Mobile = référence. Desktop = extension Bento Grid 12 colonnes.
5. **Couleurs tamisées** — Light: `#F4F3ED`, Dark: `#171616`. JAMAIS blanc/noir pur.
6. **Typographie dense** — 10px→18px, `font-medium` minimum. Pas de `font-normal`.
7. **Accents sémantiques** — Couleurs vives réservées aux statuts/alertes uniquement.
8. **Icônes Lucide** — `lucide-react` exclusivement. Aucune autre librairie.
9. **Warm Gray** — Gris chauds (teinte beige), pas de gris pur.
10. **Composants obligatoires** — FlatCard, SectionHeader, PageHeader, TabSwitcher, EmptyState.

---

## 2. Conteneur Roi : FlatCard

```tsx
import { FlatCard } from "@/components/my-space/flat-card";
// Squelette : rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0 overflow-hidden
// Padding sur l'enfant : <div className="p-3 lg:p-4">
<FlatCard className="flex flex-col">{children}</FlatCard>
```

**Sous-conteneurs internes (S4) :**
- Fond : `bg-[#FDFCFA] dark:bg-[#21201E]/77`
- Hover : `hover:bg-[#FDFCFA]/80 dark:hover:bg-[#21201E]/80 transition-colors`
- Coins : `rounded-lg`

---

## 3. Palette de Surfaces (5 niveaux)

| Niveau | Light | Dark | Usage |
|--------|-------|------|-------|
| S0 | `var(--card)` | `#111111` | Layout |
| S1 | `#F4F3ED` | `#171616` | FlatCard, sidebar, navbar |
| S2 | `#EBE6DC` | `#383633` | Icon box, badge, hover |
| S3 | `#DCD7C7` | `#4A4744/40` | Bouton secondaire |
| S4 | `#FDFCFA` | `#21201E/77` | Sub-card, inset |

## 4. Couleurs Sémantiques (4 accents stricts)

| Statut | BG Light | BG Dark | Texte Light | Texte Dark |
|--------|----------|---------|-------------|------------|
| Warning | `amber-500/35` | `amber-500/15` | `amber-700` | `amber-400` |
| Success | `emerald-500/15` | `emerald-500/20` | `emerald-600` | `emerald-400` |
| Active | `green-500/25` | `green-500/25` | `green-700` | `green-400` |
| Error | `rose-500/10` | `rose-500/10` | `rose-600` | `rose-400` |

---

## 5. Typographie Clé

| Rôle | Classes |
|------|---------|
| Nom famille | `text-base font-black text-foreground uppercase` |
| Prénom | `text-sm font-medium text-muted-foreground capitalize` |
| Matricule | `font-mono text-xs font-bold tracking-wide text-muted-foreground uppercase` |
| Section title | `text-sm font-semibold text-muted-foreground` |
| Label | `text-[10px] font-medium text-muted-foreground uppercase` |
| Valeur | `text-xs font-bold text-foreground` |

---

## 6. Boutons (3 types)

```tsx
// Type A — Secondaire (dans les cartes)
className="h-8 md:h-7 rounded-lg bg-[#DCD7C7] dark:bg-[#4A4744]/40 px-3 text-xs font-medium text-foreground hover:bg-[#DCD7C7]/80 active:scale-[0.97] transition-transform"

// Type B — Icône ghost
className="h-5 w-5 rounded-full hover:bg-[#EBE6DC] dark:hover:bg-[#383633]"

// Type C — CTA primaire
className="h-9 rounded-lg bg-primary text-white hover:bg-primary/90 font-medium text-xs"
```

---

## 7. Section Header Pattern

```tsx
<SectionHeader
  icon={<Icon />}
  iconBgClass="bg-foreground/8 dark:bg-foreground/5"
  title="Titre"
  actions={<Button>Action</Button>}
/>
```

---

## 8. Layout

### Mobile
```tsx
// Page main
className="px-3 min-[400px]:px-4 pt-3 pb-18"
// FlatCards empilées gap-4
```

### Desktop
```tsx
<div className="hidden h-full gap-5 overflow-hidden lg:grid lg:grid-cols-12">
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-3">
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-5">
  <div className="citizen-scrollbar stagger-children flex flex-col gap-4 overflow-y-auto lg:col-span-4">
</div>
```

---

## 9. Animations

- **Stagger** : `.stagger-children` sur colonnes (delay 50ms/enfant, fadeInUp 0.4s)
- **Entrée** : `initial={{ opacity:0, y:5 }} animate={{ opacity:1, y:0 }}`
- **Boutons** : `active:scale-[0.97] transition-transform`
- **Hover** : `transition-colors`

---

## 10. PROMPT EXÉCUTABLE RAPIDE

> SYSTEM: Tu implémentes le Citizen Design System v3.0. Surfaces S0-S4 warm gray uniquement. Zéro shadow, zéro border sur FlatCard, zéro couleur brute. Composants: FlatCard (rounded-xl bg-[#F4F3ED] dark:bg-[#171616] p-0), SectionHeader (icon dans rounded-md S2 p-1), 3 types de boutons (A: S3 secondaire, B: ghost rond, C: primary CTA). 4 accents sémantiques (amber/emerald/green/rose). Typography dense (font-medium minimum, font-black = nom famille). Layout mobile-first (px-3 min-[400px]:px-4 pt-3 pb-18) + desktop grid 12 cols. Icônes lucide-react uniquement. Animations: stagger-children, active:scale-[0.97], transition-colors. Référence complète : CITIZEN_DESIGN_SYSTEM_V3.md

## 11. Référence complète

Pour les détails exhaustifs (wireframes, arbre de composants, checklist, code source complet des composants, CSS variables), consulter :

**`CITIZEN_DESIGN_SYSTEM_V3.md`** — Document de référence unique et autoritatif.
