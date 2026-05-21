# Charte graphique « Consulat.ga / République Gabonaise » — polishes

## Contexte

Le commit `f1986231` (2026-05-13) a basculé la palette warm/beige + accents
Gabon profonds du prototype `refonte-inscription/` sur tout le site citoyen
(light + dark). Les composants shadcn (Card, Button, Input, Select…) et les
utilities Gabon (`bg-gabon-*`, `bg-gabon-*-tint`) héritent automatiquement
des nouveaux tokens via `apps/admin-gabon-citizen/src/app/globals.css`.

Reste cependant plusieurs polishes pour matcher pixel-perfect la maquette,
auditer les pages spécifiques et migrer les références obsolètes. Listés
ici par ordre de priorité.

## Référence prototype

- `refonte-inscription/project/Inscription Consulaire.html` — CSS source
  des `--bg`, `.btn-primary`, `.card-pad`, `.input`, `.pill`, etc.
- `refonte-inscription/project/src/components.jsx` — Logo, SiteHeader,
  SiteFooter, Field, OtpInput, etc.
- `refonte-inscription/project/src/registration.jsx` — IdentityStep et
  toutes les phases.

## Polishes prioritaires

### 1. Boutons — hauteur et padding `btn-lg`

Le prototype a 3 tailles :
- `.btn-sm` : padding `8px 12px`, font-size 13, min-height 36
- `.btn` (base) : padding `12px 18px`, font-size 14, min-height 44
- `.btn-lg` : padding `14px 22px`, font-size 16, min-height 52

shadcn `<Button>` actuel a `size="default"` ≈ 36px, `size="lg"` ≈ 44px.

**À faire** : étendre les variantes `<Button>` dans
`packages/ui/src/components/button.tsx` pour ajouter une taille `xl` (52px)
qui correspond à `btn-lg` du prototype. Migrer les CTAs primaires
("Commencer l'inscription", "Soumettre mon dossier", "Recevoir le code")
de `size="lg"` vers `size="xl"`.

Sinon : appliquer `className="h-13 px-5.5 text-base"` partout où on veut
btn-lg. Plus rapide mais moins propre.

### 2. Cards — padding et radius

Le prototype `.card` :
- `border-radius: 14px` (`--radius-lg`)
- `box-shadow: var(--shadow-sm)` (subtle warm shadow)
- `border: 1px solid var(--border)`
- `.card-pad` = `padding: 24px`

shadcn `<Card>` :
- `rounded-lg` ≈ 8px ; donc trop petit
- Pas d'ombre par défaut
- `border` OK
- Padding interne contrôlé par `<CardContent className="p-6">` ailleurs

**À faire** : surcharger `<Card>` shadcn pour avoir `rounded-[14px]` par
défaut + appliquer `wizard-shadow-sm` (déjà défini dans globals.css)
quand on veut l'ombre warm.

### 3. Inputs et selects — padding et hauteur

Prototype `.input` :
- `background: var(--surface)` (blanc)
- `border: 1px solid var(--border-strong)` (#d2cdbf, plus visible que `--border`)
- `padding: 12px 14px`, font-size 15
- `border-radius: 8px` (`--radius`)
- `:focus` : `border-color: var(--gabon-blue)` (deep blue)

shadcn `<Input>` :
- `h-9` ≈ 36px ; trop petit vs 48px prototype
- `border-input` (`--input`) au lieu de `border-strong`

**À faire** : décider si on étend `<Input>` shadcn ou si on a une variante
`<Input variant="lg">` pour les formulaires. Affecte aussi `<SelectTrigger>`,
`<Textarea>`.

### 4. Pages publiques `(public)/*` — audit visuel

Toutes ces pages héritent du nouveau header/footer mais peuvent avoir des
sections avec des couleurs ou layouts hardcodés :

- `apps/admin-gabon-citizen/src/app/(public)/page.tsx` (home) — hero avec photo
  background OK, mais sections `Who are you?`, `Featured services`, etc.
  à vérifier
- `apps/admin-gabon-citizen/src/app/(public)/tarifs/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/faq/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/news/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/ressources/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/formulaires/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/mentions-legales/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/confidentialite/page.tsx`

**À faire** : screenshot chaque page en light + dark, identifier les
incohérences, corriger une par une.

### 5. `/my-space/*` — audit dashboard en dark warm

Le layout my-space (`apps/admin-gabon-citizen/src/app/my-space/layout.tsx`) a sa
propre sidebar. Toutes ses sous-routes (~20 pages) à vérifier :

- `/my-space/` (dashboard)
- `/my-space/profile/edit`
- `/my-space/settings`
- `/my-space/services-demarches`
- `/my-space/requests`
- `/my-space/iasted`, `/iagenda`, `/idocument`
- `/my-space/meetings`, `/notifications`, `/support`
- etc.

**À faire** : login → naviguer chaque route → screenshot light + dark →
fixer les éléments qui ne picked pas la nouvelle palette (probablement
des `bg-citizen-s2/s3` hardcodés ou des `bg-secondary/40` qui rendent mal).

### 6. Migration des `bg-primary` résiduels

Le `--primary` global est maintenant `#0b4f9c` (Gabon-blue deep). Mais
plusieurs composants utilisent `bg-primary` quand l'intention était plus
"accent" ou "cta". Vérifier :

```sh
grep -rn "bg-primary\b" apps/admin-gabon-citizen/src --include="*.tsx" | wc -l
```

**À faire** : décider cas par cas si on garde `bg-primary` (qui pointe
désormais vers le bon bleu) ou si on migre vers `bg-gabon-blue` pour la
lisibilité.

### 7. Composant FlatCard

`packages/ui/src/components/flat-card.tsx` (ou équivalent) est utilisé
par my-space. À vérifier qu'il rend bien avec la nouvelle palette
(notamment les `--citizen-surface-s2/s3/s4` qui ont été redéfinis).

### 8. Animation `tf-slide` dans le wizard

Les phases du wizard d'inscription utilisent `className="tf-slide"` dans
le prototype pour une animation de slide-in. Mon implémentation actuelle
ne l'applique pas — les phases changent sans transition.

**À faire** : appliquer `className="wizard-slide"` (animation déjà définie
dans `apps/admin-gabon-citizen/src/components/onboarding/onboarding.css`) sur les
`<div>` racine de chaque phase d'`IdentityStep` et au changement
de stage de `PinPhase`.

### 9. Tokens `--ring` et focus visible

Vérifier que tous les éléments focusables (inputs, buttons, links)
affichent bien le ring `--gabon-blue-deep` lors du focus clavier. Le
prototype a `outline: 2px solid var(--gabon-blue), outline-offset: 2px`.

### 10. Page `/sign-in` — formulaire light vs split layout

`/sign-in` a un split layout (photo + form). Le panel droit (formulaire)
rend bien en dark warm. À vérifier en light + sur mobile.

### 11. Logo dans le drawer mobile

Le composant `Logo` actuel s'utilise dans Header desktop avec `compact={false}`
et dans le drawer mobile avec `href={null}`. Vérifier que le mark + texte
restent lisibles dans tous les contextes.

### 12. ModeToggle dans le Footer

Le `ModeToggle` (sun/moon switch) est désormais bottom-right du Footer.
Visibilité OK, mais positionnement peut être amélioré (alignement avec
la baseline du copyright).

## Priorité d'exécution suggérée

1. Audit `/my-space/*` (impact utilisateur quotidien le plus fort) — #5
2. Étendre `<Button size="xl">` + migrer les CTAs primaires — #1
3. Étendre `<Card>` padding/radius — #2
4. Pages publiques tarifs/faq/news/ressources — #4
5. `<Input>` / `<SelectTrigger>` taille `lg` — #3
6. Tf-slide animation wizard — #8
7. Polish focus ring + tokens secondaires — #9, #12
8. Migration `bg-primary` → `bg-gabon-blue` si pertinent — #6

## Tests à faire à la fin

- [ ] `/` light + dark — screenshot
- [ ] `/sign-in` light + dark + mobile 412px — screenshot
- [ ] `/sign-up` (404 normal, route archivée)
- [ ] `/register` ProfileSelector + visa sub-selector — light + dark
- [ ] `/register?type=long_stay` chaque phase Identity + chaque step
- [ ] `/register` SubmittedScreen après soumission
- [ ] `/my-space/` dashboard light + dark (login requis)
- [ ] `/my-space/profile/edit` light + dark
- [ ] `/my-space/settings` light + dark
- [ ] Pages publiques (tarifs, faq, news, ressources, formulaires,
      mentions-legales, confidentialite) light + dark
- [ ] Mobile 412×900 partout
- [ ] Lighthouse a11y score (vérifier focus visible + contrastes)
