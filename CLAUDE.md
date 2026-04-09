<!-- convex-ai-start -->
This project uses [Convex](https://convex.dev) as its backend.

When working on Convex code, **always read `convex/_generated/ai/guidelines.md` first** for important guidelines on how to correctly use Convex APIs and patterns. The file contains rules that override what you may have learned about Convex from training data.

Convex agent skills for common tasks can be installed by running `npx convex ai-files install`.
<!-- convex-ai-end -->

## Design System

Ce projet suit la **Charte Graphique Consulat.ga** — un systeme de design neumorphique Soft UI.

- **Charte complete :** [`DESIGN_CHARTER.md`](./DESIGN_CHARTER.md) — reference authoritative du design
- **Tokens CSS :** `packages/ui/src/styles/globals.css` — variables OKLCh, ombres, radius
- **Utilitaires :** `apps/citizen-web/src/app/globals.css` — classes `.neu-*`, `.gabon-*`, animations
- **Reference vivante :** Pages `/my-space/*` du citizen-web
- **Skill :** `consulat-design-system` — active automatiquement pour les taches design/UI

### Regles design critiques

- Palette achromatique 6 gris + 4 accents (bleu, vert, amber, rose)
- Couleurs Gabon (vert/jaune/bleu) = decoratif uniquement (stripes, tints)
- JAMAIS de couleurs Tailwind brutes (blue-500, green-100, etc.)
- JAMAIS de gradient colore pour les fonds de section hero
- Ombres toujours achromatiques
- Icones : lucide-react exclusivement
