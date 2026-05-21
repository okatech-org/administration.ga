# Charte Graphique — Consulat.ga Design System

> **Version:** 1.0
> **Derniere mise a jour:** 2026-04-06
> **Reference vivante:** Page `/my-space` du citizen-web (`apps/admin-gabon-citizen`)
> **Fichiers sources:** `packages/ui/src/styles/globals.css` | `apps/admin-gabon-citizen/src/app/globals.css`

---

## 1. Philosophie & Principes

### Neumorphic Soft UI

Le design Consulat.ga repose sur le **neumorphisme** (soft UI) : les elements "emergent" de la surface via un systeme de doubles ombres (lumiere en haut-gauche, ombre en bas-droite), et non par contraste de couleur de fond. Ce principe cree une interface douce, tactile et moderne qui evoque la confiance institutionnelle.

### Palette Achromatique Stricte

La base visuelle est **strictement achromatique** : 6 niveaux de gris sans chroma. Aucune couleur de fond saturee n'est permise pour les surfaces principales. Les couleurs n'interviennent que comme **accents** (boutons, badges, icones, bordures fines).

### Identite Nationale Gabon

Les trois couleurs nationales du Gabon — **Vert (#009E60)**, **Jaune/Or (#FCD116)**, **Bleu (#3A75C4)** — sont utilisees exclusivement comme :

- Elements decoratifs (gabon-stripe, gradients)
- Accents subtils (tints a 8-15% opacite)
- Marqueurs d'identite (logos, badges officiels)

Elles ne sont **jamais** utilisees comme couleur de fond de carte ou de section entiere.

---

## 2. Palette Couleurs

### 2.1 Echelle de Gris (Achromatic)

| Niveau | Nom          | Light Mode                | Dark Mode                 | Usage                   |
| ------ | ------------ | ------------------------- | ------------------------- | ----------------------- |
| 1      | Noir         | `oklch(0.10 0 0)` #141414 | `oklch(0.98 0 0)` #FAFAFA | Texte principal, titres |
| 2      | Gris fonce   | `oklch(0.40 0 0)` #5A5A5A | `oklch(0.65 0 0)` #A3A3A3 | Texte secondaire, muted |
| 3      | Gris clair 1 | `oklch(0.92 0 0)` #E3E3E3 | `oklch(0.13 0 0)` #1C1C1C | Fond page, ecarts       |
| 4      | Gris clair 2 | `oklch(0.94 0 0)` #EBEBEB | `oklch(0.22 0 0)` #343434 | Sous-cartes, muted bg   |
| 5      | Gris clair 3 | `oklch(0.97 0 0)` #F5F5F5 | `oklch(0.15 0 0)` #222222 | Hover, surfaces legeres |
| 6      | Blanc        | `oklch(1 0 0)` #FFFFFF    | `oklch(0.18 0 0)` #272727 | Fond cartes             |

### 2.2 Couleurs Nationales Gabon

| Couleur  | OKLCh                   | Hex     | Usage                  |
| -------- | ----------------------- | ------- | ---------------------- |
| Vert     | `oklch(0.5 0.18 145.5)` | #009E60 | Stripe, accents, tints |
| Jaune/Or | `oklch(0.89 0.19 95.5)` | #FCD116 | Stripe, accents, tints |
| Bleu     | `oklch(0.52 0.16 248)`  | #3A75C4 | Stripe, accents, tints |

### 2.3 Accents (4 uniquement)

| Accent             | Light Mode             | Dark Mode              | Variable CSS    |
| ------------------ | ---------------------- | ---------------------- | --------------- |
| Bleu (Primary)     | `oklch(0.55 0.22 260)` | `oklch(0.60 0.20 260)` | `--primary`     |
| Vert (Success)     | `oklch(0.55 0.17 155)` | `oklch(0.65 0.17 160)` | `--success`     |
| Amber (Warning)    | `oklch(0.55 0.17 55)`  | `oklch(0.75 0.16 70)`  | `--warning`     |
| Rose (Destructive) | `oklch(0.55 0.22 15)`  | `oklch(0.65 0.2 25)`   | `--destructive` |

Chaque accent dispose d'une variante **light** (10-15% opacite) pour les fonds de badges :

- `--success-light`, `--warning-light`, `--destructive-light`

### 2.4 Surfaces Dashboard (Warm Grey)

> Exception controlee a la palette achromatique : ces surfaces utilisent des gris **chauds** (tonalite beige/parchemin) pour creer la texture Soft UI des dashboards (my-space, backoffice, agent).

| Surface    | Light Mode | Dark Mode | Variable                | Usage                                                       |
| ---------- | ---------- | --------- | ----------------------- | ----------------------------------------------------------- |
| S1 (Cadre) | `#F4F3ED`  | `#171616` | `--secondary`           | Conteneurs principaux, FlatCards, tab switchers, nav mobile |
| Carte      | `#FFFFFF`  | `#272727` | `--card`                | Cartes internes, elements eleves                            |
| Sidebar    | #EFEFEF    | #121212   | `--neu-surface-sidebar` | Sidebar navigation                                          |

---

## 3. Typographie

### Familles de polices

| Usage            | Police                     | Variable CSS     |
| ---------------- | -------------------------- | ---------------- |
| Corps de texte   | Inter Variable             | `--font-sans`    |
| Titres, headings | Plus Jakarta Sans Variable | `--font-display` |
| Fallback         | system-ui, sans-serif      | —                |

### Echelle typographique

| Element           | Taille mobile    | Taille desktop  | Poids           | Tracking         |
| ----------------- | ---------------- | --------------- | --------------- | ---------------- |
| H1 (Hero)         | text-3xl (30px)  | text-5xl (48px) | 800 (extrabold) | tight (-0.025em) |
| H2 (Section)      | text-2xl (24px)  | text-4xl (36px) | 700 (bold)      | tight            |
| H3 (Sous-section) | text-lg (18px)   | text-xl (20px)  | 700 (bold)      | tight            |
| H4 (Card title)   | text-base (16px) | text-base       | 600 (semibold)  | tight            |
| Body              | text-sm (14px)   | text-sm         | 400 (normal)    | normal           |
| Small/Caption     | text-xs (12px)   | text-xs         | 500 (medium)    | normal           |
| Micro             | text-[10px]      | text-[10px]     | 800 (extrabold) | widest           |

### Regles

- Tous les headings (h1-h6) utilisent automatiquement `--font-display` + `tracking-tight`
- La classe `.heading-official` ajoute `font-weight: 700; letter-spacing: -0.01em; line-height: 1.2`
- Corps de texte : toujours `text-sm` sauf contenu de page statique (prose)

---

## 4. Espacement & Layout

### Container

```
--container-padding:      1rem    (mobile)
--container-padding-sm:   2rem    (sm: 640px)
--container-padding-lg:   4rem    (lg: 1024px)
--container-padding-xl:   5rem    (xl: 1280px)
--container-padding-2xl:  6rem    (2xl: 1536px)
```

### Conventions

| Pattern           | Classes Tailwind                                         |
| ----------------- | -------------------------------------------------------- |
| Container general | `max-w-7xl mx-auto px-4 sm:px-6 lg:px-8`                 |
| Container prose   | `max-w-4xl mx-auto px-4 sm:px-6`                         |
| Section spacing   | `py-16 px-6` (public) / `py-6` (my-space)                |
| Card interne      | `p-6` (standard) / `p-4` (compact)                       |
| Gap grille        | `gap-6` (standard) / `gap-4` (compact) / `gap-2` (tight) |

### Grilles responsives

```tsx
// Grille 3 colonnes standard
className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"

// Grille dashboard (my-space)
className="grid grid-cols-1 lg:grid-cols-12 gap-4"
// Col 1: lg:col-span-3 | Col 2: lg:col-span-5 | Col 3: lg:col-span-4
```

---

## 5. Systeme d'Ombres

### 5.1 Ombres Standards (shadow-\*)

| Niveau | Light Mode                                                                   | Dark Mode                      |
| ------ | ---------------------------------------------------------------------------- | ------------------------------ |
| sm     | `0 1px 2px oklch(0 0 0 / 0.05)`                                              | `0 1px 2px oklch(0 0 0 / 0.3)` |
| md     | `0 4px 6px -1px oklch(0 0 0 / 0.06), 0 2px 4px -1px oklch(0 0 0 / 0.04)`     | plus prononce                  |
| lg     | `0 10px 15px -3px oklch(0 0 0 / 0.08), 0 4px 6px -2px oklch(0 0 0 / 0.04)`   | plus prononce                  |
| xl     | `0 20px 25px -5px oklch(0 0 0 / 0.10), 0 10px 10px -5px oklch(0 0 0 / 0.04)` | plus prononce                  |

### 5.2 Ombres Neumorphiques (neu-\*)

| Niveau  | Effet              | Valeur Light Mode                                                               |
| ------- | ------------------ | ------------------------------------------------------------------------------- |
| subtle  | Elevation minimale | `2px 2px 4px rgba(0,0,0,0.05), -2px -2px 4px rgba(255,255,255,0.8)`             |
| light   | Elevation standard | `6px 6px 12px rgba(0,0,0,0.08), -6px -6px 12px rgba(255,255,255,0.9)`           |
| raised  | Elevation moyenne  | `4px 4px 8px rgba(0,0,0,0.1), -4px -4px 8px rgba(255,255,255,0.95)`             |
| inset   | Enfonce / actif    | `inset 3px 3px 6px rgba(0,0,0,0.06), inset -3px -3px 6px rgba(255,255,255,0.8)` |
| pressed | Presse / pressed   | `inset 2px 2px 5px rgba(0,0,0,0.08), inset -2px -2px 5px rgba(255,255,255,0.7)` |

### 5.3 Classes utilitaires

| Classe                      | Usage                                                   |
| --------------------------- | ------------------------------------------------------- |
| `.neu-card`                 | Carte neumorphique avec hover raised + translateY(-1px) |
| `.neu-raised`               | Surface elevee (radius 12px)                            |
| `.neu-inset`                | Surface enfoncee (inputs, actif)                        |
| `.neu-pressed`              | Etat presse (boutons)                                   |
| `.neu-subtle`               | Elevation minimale                                      |
| `.neu-sidebar`              | Sidebar (radius 20px, raised)                           |
| `.neu-nav-item`             | Item navigation (hover gabon-green tint, active inset)  |
| `.shadow-theme-sm/md/lg/xl` | Ombres standard via variables CSS                       |

---

## 6. Echelle de Radius

| Token          | Valeur | Tailwind      | Usage                     |
| -------------- | ------ | ------------- | ------------------------- |
| `--radius-sm`  | 12px   | `rounded-sm`  | Badges, petits elements   |
| `--radius-md`  | 14px   | `rounded-md`  | Boutons, inputs           |
| `--radius-lg`  | 16px   | `rounded-lg`  | Cards standard            |
| `--radius`     | 16px   | `rounded-xl`  | Reference (= --radius-lg) |
| `--radius-xl`  | 20px   | `rounded-xl`  | Grands conteneurs         |
| `--radius-2xl` | 24px   | `rounded-2xl` | Modales, sheets           |
| `--radius-3xl` | 28px   | `rounded-3xl` | —                         |
| `--radius-4xl` | 32px   | `rounded-4xl` | Badges arrondis           |

**Convention :** Utiliser `rounded-xl` (16px) comme defaut pour les cartes et conteneurs.

---

## 7. Patterns Composants

### 7.1 Cards

**FlatCard (pages my-space) :**

```tsx
className="rounded-xl bg-secondary p-0 overflow-hidden border flat-card-border"
```

**Card standard (pages publiques) :**

```tsx
className="rounded-xl bg-card border border-border p-6 shadow-sm hover:shadow-lg hover:-translate-y-0.5 transition-all duration-300"
```

**Carte neumorphique :**

```tsx
className="neu-card" // background, shadow, radius, border, hover inclus
```

**Carte avec bordure coloree :**

```tsx
className="rounded-xl bg-card border flat-card-border overflow-hidden"
style={{ borderTop: "3px solid var(--gabon-green-hex)" }}
```

### 7.2 Badges

| Variante    | Classes                                                                              |
| ----------- | ------------------------------------------------------------------------------------ |
| Info        | `badge-info` (bleu 12% bg, bleu text)                                                |
| Success     | `badge-success` (vert transparent bg, vert text)                                     |
| Warning     | `badge-warning` (amber transparent bg, amber text)                                   |
| Destructive | `badge-destructive` (rose transparent bg, rose text)                                 |
| Default     | `bg-primary text-primary-foreground rounded-4xl px-2 py-0.5 text-xs font-medium h-5` |

### 7.3 Boutons

| Variante    | Pattern                                                                        |
| ----------- | ------------------------------------------------------------------------------ |
| Primary CTA | `bg-primary text-primary-foreground hover:bg-primary/90 rounded-xl px-6 h-10`  |
| Gabon CTA   | `bg-gabon-green text-white hover:brightness-110 rounded-xl`                    |
| Ghost       | `hover:bg-muted rounded-lg`                                                    |
| Outline     | `border border-border bg-transparent hover:bg-muted rounded-xl`                |
| Pill Filter | `rounded-full px-4 py-2 text-sm` + actif: `bg-primary text-primary-foreground` |

### 7.4 Navigation

**Nav item sidebar :**

```tsx
className={cn("neu-nav-item h-11 flex items-center gap-3 px-3", isActive && "active")}
```

**Tab switcher :**

```tsx
// Container
className="flex items-center gap-1 bg-secondary border border-border rounded-xl p-1"
// Tab active
className="bg-primary text-primary-foreground shadow-sm rounded-lg px-3 py-1.5 text-sm"
// Tab inactive
className="text-muted-foreground hover:text-foreground hover:bg-muted/50 rounded-lg px-3 py-1.5 text-sm"
```

### 7.5 Section Hero (pages publiques)

```tsx
<section className="bg-background py-16 px-6">
  <div className="max-w-7xl mx-auto text-center">
    <Badge variant="outline" className="mb-4">{category}</Badge>
    <h1 className="text-3xl md:text-5xl font-extrabold tracking-tight mb-4">{title}</h1>
    <p className="text-muted-foreground text-lg max-w-2xl mx-auto">{description}</p>
    <div className="gabon-stripe mt-8 max-w-xs mx-auto" />
  </div>
</section>
```

### 7.6 Section Header (my-space)

```tsx
<div className="flex items-center gap-2">
  <div className="p-1 rounded-md bg-foreground/8 dark:bg-foreground/5">
    <Icon className="h-3.5 w-3.5" />
  </div>
  <h3 className="text-sm font-bold">{title}</h3>
</div>
```

### 7.7 Page Header (my-space)

```tsx
<div className="flex items-center gap-3">
  <div className="p-1.5 rounded-lg bg-foreground/8 dark:bg-foreground/5">
    <Icon className="h-5 w-5" />
  </div>
  <div>
    <h1 className="text-lg md:text-xl font-bold">{title}</h1>
    <p className="text-muted-foreground text-sm mt-1">{subtitle}</p>
  </div>
</div>
```

### 7.8 Icone dans conteneur

```tsx
// Standard (12% opacite)
<div className="p-3 rounded-xl bg-primary/10">
  <Icon className="h-6 w-6 text-primary" />
</div>

// Avec classes stat-icon
<div className="p-3 rounded-xl stat-icon-green">
  <Icon className="h-6 w-6" />
</div>
// Variantes: stat-icon-green, stat-icon-orange, stat-icon-blue, stat-icon-purple
```

### 7.9 Etat vide (Empty State)

```tsx
<div className="flex flex-col items-center justify-center py-12 text-center">
  <div className="rounded-full bg-muted p-4 mb-4">
    <Icon className="h-8 w-8 text-muted-foreground" />
  </div>
  <h3 className="text-sm font-semibold text-foreground mb-1">{title}</h3>
  <p className="text-sm text-muted-foreground max-w-sm">{description}</p>
</div>
```

### 7.10 Bordure FlatCard

```css
.flat-card-border {
  border-color: rgba(0, 0, 0, 0.07); /* Light: 7% noir */
}
.dark .flat-card-border {
  border-color: rgba(255, 255, 255, 0.023); /* Dark: 2.3% blanc */
}
```

---

## 8. Animations

### Keyframes

| Animation            | De                          | Vers                     | Duree | Easing            |
| -------------------- | --------------------------- | ------------------------ | ----- | ----------------- |
| fadeInUp             | opacity:0, translateY(8px)  | opacity:1, translateY(0) | 0.4s  | ease-out          |
| fade-in-up (globals) | opacity:0, translateY(20px) | opacity:1, translateY(0) | 0.5s  | ease-out          |
| shimmer              | bg-position -200%           | bg-position 200%         | 2s    | linear (infinite) |
| fade-in              | opacity:0                   | opacity:1                | 120ms | ease-in           |
| fade-out             | opacity:1                   | opacity:0                | 120ms | ease-out          |
| progress-fill        | stroke-dashoffset initial   | stroke-dashoffset target | 1s    | ease-out          |

### Classes

| Classe                  | Effet                                                |
| ----------------------- | ---------------------------------------------------- |
| `.animate-fade-in-up`   | Entree avec glissement vers le haut                  |
| `.animate-shimmer`      | Effet loading shimmer                                |
| `.stagger-children`     | Entree en cascade (8 enfants max, +0.05s par enfant) |
| `.delay-1` a `.delay-6` | Delais manuels (0.05s a 0.3s)                        |

### View Transitions

```css
::view-transition-old(root) {
  animation: fade-out 120ms ease-out;
}
::view-transition-new(root) {
  animation: fade-in 120ms ease-in;
}
```

### Theme Transition

```css
background-color 300ms ease-in-out,
border-color 300ms ease-in-out,
color 150ms ease-in-out
```

### Framer Motion (pattern standard)

```tsx
<motion.div
  initial={{ opacity: 0, y: 20 }}
  whileInView={{ opacity: 1, y: 0 }}
  viewport={{ once: true }}
  transition={{ duration: 0.5, delay: index * 0.1 }}
>
```

---

## 9. Elements Decoratifs

### Gabon Stripe

```css
/* Bande horizontale tricolore (3px) */
.gabon-stripe {
  height: 3px;
  background: linear-gradient(
    90deg,
    #009e60 33.33%,
    #fcd116 33.33%,
    #fcd116 66.66%,
    #3a75c4 66.66%
  );
  border-radius: 2px;
}

/* Bande verticale */
.gabon-stripe-vertical {
  width: 3px; /* meme gradient en 180deg */
}
```

### Gradients

| Classe                    | Direction                | Usage               |
| ------------------------- | ------------------------ | ------------------- |
| `.bg-gabon-gradient`      | 135deg diagonal          | Fonds decoratifs    |
| `.bg-gabon-gradient-h`    | 90deg horizontal         | Barres, separateurs |
| `.text-gradient-official` | 135deg + background-clip | Texte tricolore     |

### Tints (fonds subtils)

```css
.bg-gabon-green-tint {
  background: rgba(0, 158, 96, 0.08);
} /* Dark: 0.15 */
.bg-gabon-yellow-tint {
  background: rgba(252, 209, 22, 0.08);
} /* Dark: 0.12 */
.bg-gabon-blue-tint {
  background: rgba(58, 117, 196, 0.08);
} /* Dark: 0.15 */
```

### Glass Effect

```css
.glass     { backdrop-blur-xl; bg-card/80; }
.dark .glass { backdrop-blur-xl; bg-card/60; }
```

---

## 10. Breakpoints Responsive

| Breakpoint  | Pixels | Usage                                 |
| ----------- | ------ | ------------------------------------- |
| (default)   | 0+     | Mobile-first base                     |
| min-[380px] | 380px  | Ajustements fins mobiles              |
| min-[400px] | 400px  | Padding mobile ameliore               |
| min-[460px] | 460px  | Grille mobile etendue                 |
| sm          | 640px  | Petites tablettes                     |
| md          | 768px  | Tablettes, bascule sidebar/bottom-nav |
| lg          | 1024px | Desktop, header nav complet           |
| xl          | 1280px | Grand desktop                         |
| 2xl         | 1536px | Tres grand ecran                      |

### Regles responsives

- **Mobile-first** : les classes sans prefixe s'appliquent au mobile
- Le breakpoint `md:` bascule entre layout mobile et desktop (sidebar vs bottom-nav)
- Le breakpoint `lg:` active la navigation header complete
- Safe area insets : `env(safe-area-inset-top/bottom)` pour iPhone notch

---

## 11. Systeme d'Icones

- **Librairie exclusive :** `lucide-react`
- **Jamais** d'autres librairies d'icones (react-icons, heroicons, etc.)

### Conventions de tailles

| Contexte               | Classe                     | Taille  |
| ---------------------- | -------------------------- | ------- |
| Inline (texte, badges) | `h-3 w-3` ou `h-3.5 w-3.5` | 12-14px |
| Navigation, actions    | `h-4 w-4` ou `h-5 w-5`     | 16-20px |
| Section header         | `h-5 w-5` ou `h-6 w-6`     | 20-24px |
| Hero, feature          | `h-8 w-8` ou `h-10 w-10`   | 32-40px |
| Empty state            | `h-8 w-8`                  | 32px    |

### Pattern conteneur icone

```tsx
// Petit (section header)
<div className="p-1 rounded-md bg-foreground/8 dark:bg-foreground/5">
  <Icon className="h-3.5 w-3.5" />
</div>

// Moyen (page header)
<div className="p-1.5 rounded-lg bg-foreground/8 dark:bg-foreground/5">
  <Icon className="h-5 w-5" />
</div>

// Grand (feature card)
<div className="p-3 rounded-xl stat-icon-blue">
  <Icon className="h-6 w-6" />
</div>
```

---

## 12. Accessibilite

### Focus visible

```css
*:focus-visible {
  outline: 2px solid var(--ring); /* Bleu */
  outline-offset: 2px;
}
```

### Touch

```css
button,
a,
[role="button"],
input,
select,
textarea {
  -webkit-tap-highlight-color: transparent;
}
button,
a,
[role="button"] {
  user-select: none;
  touch-action: manipulation;
}
```

### Scrollbar

```css
::-webkit-scrollbar {
  width: 6px;
  height: 6px;
}
::-webkit-scrollbar-track {
  background: transparent;
}
::-webkit-scrollbar-thumb {
  background: oklch(0.5 0 0 / 0.15);
  border-radius: 9999px;
}
/* Firefox */
* {
  scrollbar-width: thin;
  scrollbar-color: oklch(0.5 0 0 / 0.15) transparent;
}
```

### Contrastes

- Minimum WCAG AA : ratio 4.5:1 pour le texte
- Texte muted : `oklch(0.40 0 0)` sur fond blanc = ratio ~5.5:1
- Dark mode muted : `oklch(0.65 0 0)` sur fond #272727 = ratio ~5.5:1

---

## 13. Do's & Don'ts

### DO (Faire)

- Utiliser les tokens CSS (`--primary`, `--success`, etc.) au lieu de couleurs Tailwind brutes
- Utiliser `flat-card-border` pour les bordures de cartes legeres
- Utiliser `stat-icon-*` pour les fonds d'icones colores
- Utiliser `badge-*` pour les badges de statut
- Utiliser `gabon-stripe` pour l'identite nationale
- Utiliser `stagger-children` pour les animations d'entree en liste
- Tester CHAQUE composant en light ET dark mode
- Utiliser `text-muted-foreground` pour le texte secondaire
- Utiliser `bg-card` pour les surfaces de cartes
- Utiliser `bg-secondary` pour les conteneurs dashboard (cadres, FlatCards, tab switchers, nav mobile)
- Utiliser `bg-background` pour le fond de page

### DON'T (Ne pas faire)

- **JAMAIS** de couleur Tailwind brute (blue-500, green-100, etc.) pour les surfaces ou fonds
- **JAMAIS** de gradient colore (`from-primary/10`) pour les fonds de section hero
- **JAMAIS** d'ombre coloree (`shadow-[rgba(59,130,246,...)]`) — ombres toujours achromatiques
- **JAMAIS** de bordure coloree saturee (border-green-500) sauf fine bordure accent (3px top)
- **JAMAIS** de fond colore de section entiere (sauf hero video/image)
- **JAMAIS** d'icones hors lucide-react
- **JAMAIS** modifier les fichiers `components/ui/*` directement — creer des wrappers
- **JAMAIS** plus de 4 couleurs d'accent (bleu, vert, amber, rose)
- **JAMAIS** de `!important` sauf pour overrides de librairies tierces (mapbox, etc.)
- **JAMAIS** de hex brut `bg-[#F4F3ED]` ou `bg-[#171616]` — utiliser `bg-secondary`
- **JAMAIS** de texte en anglais dans l'UI (sauf si i18n configure)

### Regles couleur strictes

> La charte autorise exactement **10 couleurs** :
> 6 gris achromatic + 4 accents (bleu, vert, amber, rose).
> Les couleurs Gabon (vert, jaune, bleu) sont des elements decoratifs, pas des accents UI.

---

## 14. Patterns iProfil — Regles strictes

> Ces regles sont extraites de la page iProfil (`/my-space/index.tsx`), la reference design absolue.
> Toute page my-space doit les respecter strictement.

### Boutons — 3 types uniques

| Type                  | Usage                       | Classes exactes                                                                                                                                                              |
| --------------------- | --------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A : Action secondaire | Liens, filtres, CTA mineurs | `variant="ghost" size="sm" className="h-8 md:h-7 px-3 text-xs font-medium text-foreground bg-muted hover:bg-muted/70 active:scale-[0.97] transition-transform rounded-full"` |
| B : Icone edit        | Pencil, close, actions      | `variant="ghost" size="icon" className="h-5 w-5 rounded-full hover:bg-foreground/[0.06]"`                                                                                    |
| C : CTA principal     | Header global uniquement    | `bg-primary hover:bg-primary/90 text-white rounded-xl`                                                                                                                       |

### Conteneurs d'icones — pattern unique

```tsx
<div className="p-1 rounded-md bg-foreground/[0.06] dark:bg-foreground/[0.12]">
  <Icon className="h-3.5 w-3.5 text-muted-foreground" />
</div>
```

### Section headers — pattern unique

```tsx
<span className="text-sm font-semibold flex items-center gap-2.5 text-muted-foreground">
  {iconContainer}
  Label
</span>
```

### Labels uppercase

```
text-[10px] font-semibold text-muted-foreground uppercase tracking-widest
```

### Nav items actifs/inactifs

- **Actif** : `bg-foreground/[0.06] dark:bg-foreground/[0.12] text-foreground font-medium`
- **Inactif** : `text-muted-foreground hover:bg-muted`

### Separateurs internes

- `border-b border-foreground/5` ou `<Separator />`
- JAMAIS de `border-b` seul (sans couleur)

### Bordures de cartes

- Toujours `flat-card-border` (jamais `border-border` ou `border` seul)
- Radius : `rounded-xl` (jamais `rounded-lg` pour les cartes)

### Cartes interactives (items d'activite)

Les cartes Demarches/RDV utilisent `bg-amber-500/15 dark:bg-amber-500/10` — exception intentionnelle pour les items d'activite utilisateur.

---

## Annexe A — Variables CSS completes

### Light Mode (:root)

```css
--background: oklch(0.92 0 0);
--foreground: oklch(0.1 0 0);
--card: oklch(1 0 0);
--card-foreground: oklch(0.1 0 0);
--primary: oklch(0.55 0.22 260);
--primary-foreground: oklch(1 0 0);
--secondary: #f4f3ed; /* Beige chaud — cadres dashboard */
--secondary-foreground: oklch(0.4 0 0);
--muted: oklch(0.94 0 0);
--muted-foreground: oklch(0.4 0 0);
--accent: oklch(0.55 0.22 260);
--accent-foreground: oklch(1 0 0);
--success: oklch(0.55 0.17 155);
--warning: oklch(0.55 0.17 55);
--destructive: oklch(0.55 0.22 15);
--border: oklch(0.94 0 0);
--ring: oklch(0.55 0.22 260);
--radius: 1rem;
```

### Dark Mode (.dark)

```css
--background: oklch(0.13 0 0);
--foreground: oklch(0.98 0 0);
--card: oklch(0.18 0 0);
--card-foreground: oklch(0.98 0 0);
--primary: oklch(0.6 0.2 260);
--primary-foreground: oklch(0.99 0 0);
--secondary: #171616; /* Noir-brun chaud — cadres dashboard */
--secondary-foreground: oklch(0.7 0 0);
--muted: oklch(0.22 0 0);
--muted-foreground: oklch(0.65 0 0);
--accent: oklch(0.6 0.2 260);
--accent-foreground: oklch(0.99 0 0);
--success: oklch(0.65 0.17 160);
--warning: oklch(0.75 0.16 70);
--destructive: oklch(0.65 0.2 25);
--border: oklch(1 0 0 / 0.12);
--ring: oklch(0.6 0.2 260);
```
