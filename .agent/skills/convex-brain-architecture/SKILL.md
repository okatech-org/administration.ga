---
name: convex-brain-architecture
description: "Expert Architecture Cerveau Neuro-Mimetique OkaTech. S'active pour les patterns Neocortex/Hippocampe/Limbique (consulat.ga backend) et Consciousness/Cortex/Neurons (mairie.ga frontend). Pattern unique a l'ecosysteme OkaTech."
---

# Skill : Architecture Cerveau (Neuro-Mimetique)

## Auto-Activation
Ce skill s'active quand :
- La requete mentionne : cerveau, neocortex, hippocampe, limbique, cortex, consciousness, neurons, audit, brain
- Un fichier contient des imports depuis des modules cerveau
- Le contexte implique la couche intelligence/audit d'un projet OkaTech

## IMPORTANT
Les termes `Neocortex`, `Hippocampe`, `Limbique`, `Cortex`, `Consciousness`, `Neurons` sont des NOMS DE MODULES INTERNES OkaTech. Ce NE sont PAS des librairies externes.

## Pattern Backend — consulat.ga (Convex)

### Architecture des Modules Cerveau
```
convex/
├── neocortex/           # Intelligence et prise de decision
│   ├── analyzer.ts      # Analyse des donnees, scoring, predictions
│   ├── planner.ts       # Planification des actions
│   └── decisions.ts     # Logique de decision automatisee
├── hippocampus/         # Memoire et historique
│   ├── memory.ts        # Stockage contextuel, historique des actions
│   ├── recall.ts        # Rappel d'informations passees
│   └── patterns.ts      # Detection de patterns recurrents
├── limbic/              # Emotions et priorites
│   ├── urgency.ts       # Scoring d'urgence des requetes
│   ├── priority.ts      # Priorisation automatique
│   └── alerts.ts        # Systeme d'alertes intelligentes
```

### Fonction logCortexAction
```typescript
import { logCortexAction } from "../lib/cortex";

export const processRequest = authMutation({
  args: { requestId: v.id("requests"), action: v.string() },
  handler: async (ctx, args) => {
    // ... logique metier ...
    await logCortexAction(ctx, {
      type: "request_processed",
      entityId: args.requestId,
      action: args.action,
      userId: ctx.userId,
      metadata: { /* contexte */ },
    });
  },
});
```

### Triggers et Reactions
```typescript
export const onRequestStatusChange = trigger({
  table: "requests",
  type: "update",
  handler: async (ctx, { oldDoc, newDoc }) => {
    if (oldDoc.status !== newDoc.status) {
      await ctx.runMutation(internal.neocortex.analyzer.analyzeStatusChange, {
        requestId: newDoc._id,
        oldStatus: oldDoc.status,
        newStatus: newDoc.status,
      });
      await ctx.runMutation(internal.hippocampus.memory.recordEvent, {
        type: "status_change",
        entityId: newDoc._id,
      });
      await ctx.runMutation(internal.limbic.urgency.evaluate, {
        requestId: newDoc._id,
        newStatus: newDoc.status,
      });
    }
  },
});
```

## Pattern Frontend — mairie.ga (React + Zustand)

### Architecture des Stores Cerveau
```
src/stores/
├── consciousness/        # Couche de conscience globale
│   ├── awarenessStore.ts
│   └── contextStore.ts
├── cortex/               # Traitement et logique
│   ├── processingStore.ts
│   └── decisionStore.ts
└── neurons/              # Connexions et communication
    ├── signalStore.ts
    └── synapseStore.ts
```

### Pattern Zustand Persiste
```typescript
import { create } from "zustand";
import { persist } from "zustand/middleware";

export const useConsciousnessStore = create<ConsciousnessState>()(
  persist(
    (set) => ({
      currentContext: null,
      awareness: "normal",
      setContext: (ctx) => set({ currentContext: ctx }),
      elevateAwareness: (level) => set({ awareness: level }),
    }),
    { name: "consciousness-store" }
  )
);
```

## Conventions

1. Utiliser la metaphore neuroscientifique de maniere coherente dans le projet
2. Chaque "region du cerveau" a sa responsabilite unique
3. TOUJOURS tracer les actions via `logCortexAction` dans le backend
4. Les stores frontend cerveau DOIVENT utiliser Zustand persist
5. Ne PAS melanger les metaphores entre projets

## Anti-Patterns
- Ne JAMAIS creer un module cerveau sans le documenter
- Ne JAMAIS ignorer le logging cortex dans les mutations critiques
- Ne JAMAIS acceder aux tables internes du cerveau directement
- Ne JAMAIS supposer que ces noms sont des librairies externes
