---
name: framer-motion-animations
description: "Expert Framer Motion. S'active pour les animations, transitions, scroll reveals, staggered grids, page transitions. Patterns reels extraits de consulat.ga, foot.cd, mairie.ga."
---

# Skill : Framer Motion Animations

## Auto-Activation
Ce skill s'active quand :
- La requete mentionne : animation, transition, fade, stagger, scroll, motion, animate, parallax
- Un fichier importe `framer-motion`
- Un composant utilise `motion.div`, `AnimatePresence`, `useInView`

## Projets Concernes
| Projet | Patterns utilises |
|---|---|
| consulat.ga | Fade-in scroll, staggered grids, page transitions |
| foot.cd | Fade-in scroll, composants animes |
| mairie.ga | Fade-in scroll, staggered grids, transitions de page |

## Import Standard
```tsx
import { motion, AnimatePresence, useInView } from "framer-motion";
```

## Patterns Reels OkaTech

### Fade-In au Scroll (le plus courant)
```tsx
const ref = useRef(null);
const isInView = useInView(ref, { once: true, margin: "-100px" });

<motion.div
  ref={ref}
  initial={{ opacity: 0, y: 20 }}
  animate={isInView ? { opacity: 1, y: 0 } : { opacity: 0, y: 20 }}
  transition={{ duration: 0.5, ease: "easeOut" }}
>
  {children}
</motion.div>
```

### Staggered Grid (cartes, listes)
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 },
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {items.map((item) => (
    <motion.div key={item.id} variants={itemVariants}>
      <Card>{item.content}</Card>
    </motion.div>
  ))}
</motion.div>
```

### Page Transitions (React Router ou Next.js)
```tsx
<AnimatePresence mode="wait">
  <motion.div
    key={pathname}
    initial={{ opacity: 0, x: -20 }}
    animate={{ opacity: 1, x: 0 }}
    exit={{ opacity: 0, x: 20 }}
    transition={{ duration: 0.3 }}
  >
    {children}
  </motion.div>
</AnimatePresence>
```

### Hover & Tap (boutons, cartes interactives)
```tsx
<motion.button
  whileHover={{ scale: 1.02 }}
  whileTap={{ scale: 0.98 }}
  transition={{ type: "spring", stiffness: 400, damping: 17 }}
>
  {label}
</motion.button>
```

### Layout Animations (filtres, tris)
```tsx
<motion.div layout layoutId={`card-${id}`} transition={{ type: "spring", damping: 25 }}>
  {content}
</motion.div>
```

## Conventions OkaTech

1. **Performance** : Utiliser `will-change-transform` (Tailwind) pour les animations frequentes
2. **Accessibilite** : Respecter `prefers-reduced-motion` via `useReducedMotion()` de framer-motion
3. **Durees** : 0.2-0.5s micro-interactions, 0.3-0.8s transitions de page
4. **Easing** : `easeOut` entrees, `easeIn` sorties, `spring` interactions

## Anti-Patterns
- Ne JAMAIS animer `width`/`height` directement — utiliser `scale` ou `layout`
- Ne JAMAIS utiliser `setTimeout` pour sequencer — utiliser `staggerChildren` ou `delay`
- Ne JAMAIS oublier `AnimatePresence` pour les elements qui sortent du DOM
- Ne JAMAIS utiliser des durees > 1s pour des animations UI
- Ne JAMAIS animer `left`/`top` — utiliser `x`/`y` (GPU-accelere)
