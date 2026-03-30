---
name: workflow-state-machine
description: "Expert Workflow et State Machine OkaTech. S'active pour les patterns RequestWorkflow (12 statuts, matrice de transitions) dans consulat.ga et PTM multi-niveaux dans sgg.ga."
---

# Skill : Workflow State Machine

## Auto-Activation
Ce skill s'active quand :
- La requete mentionne : workflow, statut, transition, etat, machine, validation, approbation, rejet
- Le code manipule des champs `status`, `workflow`, `currentStep`, `transition`
- Le contexte implique un processus multi-etapes avec des regles de transition

## Projets Concernes
| Projet | Pattern | Statuts |
|---|---|---|
| consulat.ga | RequestWorkflow | 12 statuts |
| sgg.ga | PTM multi-niveaux | Variable par type |

## Pattern RequestWorkflow — consulat.ga

### Les 12 Statuts
```typescript
type RequestStatus =
  | "draft"           // Brouillon
  | "submitted"       // Soumise
  | "in_review"       // En examen
  | "pending_docs"    // Attente documents
  | "docs_received"   // Documents recus
  | "approved"        // Approuvee
  | "rejected"        // Rejetee
  | "processing"      // En traitement
  | "ready"           // Prete
  | "delivered"       // Delivree
  | "cancelled"       // Annulee
  | "archived";       // Archivee
```

### Matrice de Transitions
```typescript
const TRANSITION_MATRIX: Record<RequestStatus, RequestStatus[]> = {
  draft:         ["submitted", "cancelled"],
  submitted:     ["in_review", "cancelled"],
  in_review:     ["pending_docs", "approved", "rejected"],
  pending_docs:  ["docs_received", "cancelled"],
  docs_received: ["in_review"],
  approved:      ["processing"],
  rejected:      ["draft"],
  processing:    ["ready"],
  ready:         ["delivered"],
  delivered:     ["archived"],
  cancelled:     ["archived"],
  archived:      [],
};

function canTransition(from: RequestStatus, to: RequestStatus): boolean {
  return TRANSITION_MATRIX[from]?.includes(to) ?? false;
}
```

### Mutation de Transition (Convex)
```typescript
export const transitionRequest = authMutation({
  args: {
    requestId: v.id("requests"),
    newStatus: v.string(),
    reason: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (!request) throw new ConvexError("Requete introuvable");

    if (!canTransition(request.status, args.newStatus)) {
      throw new ConvexError(`Transition invalide : ${request.status} -> ${args.newStatus}`);
    }

    await ctx.db.patch(args.requestId, {
      status: args.newStatus,
      lastTransitionAt: Date.now(),
      lastTransitionBy: ctx.userId,
      ...(args.reason && { statusReason: args.reason }),
    });

    await logCortexAction(ctx, {
      type: "status_transition",
      entityId: args.requestId,
      action: `${request.status} -> ${args.newStatus}`,
      userId: ctx.userId,
    });

    await ctx.db.insert("requestHistory", {
      requestId: args.requestId,
      fromStatus: request.status,
      toStatus: args.newStatus,
      changedBy: ctx.userId,
      reason: args.reason,
      timestamp: Date.now(),
    });
  },
});
```

## Pattern PTM — sgg.ga

### Structure Multi-Niveaux
```typescript
interface PTMWorkflow {
  type: PTMType;
  currentLevel: number;
  maxLevel: number;
  status: PTMStatus;
  validators: ValidatorLevel[];
}

type PTMStatus = "initiated" | "in_progress" | "validated" | "returned" | "completed" | "archived";
```

### Progression Multi-Niveaux
```typescript
function advancePTM(ptm: PTMWorkflow, decision: "approved" | "returned") {
  if (decision === "approved") {
    if (ptm.currentLevel >= ptm.maxLevel) {
      return { ...ptm, status: "completed" };
    }
    return { ...ptm, currentLevel: ptm.currentLevel + 1, status: "in_progress" };
  }
  if (decision === "returned") {
    return { ...ptm, currentLevel: Math.max(1, ptm.currentLevel - 1), status: "returned" };
  }
}
```

## Composant UI Status Badge
```tsx
const STATUS_CONFIG: Record<string, { label: string; variant: string; color: string }> = {
  draft:       { label: "Brouillon",    variant: "outline",     color: "text-gray-500" },
  submitted:   { label: "Soumise",      variant: "default",     color: "text-blue-500" },
  in_review:   { label: "En examen",    variant: "secondary",   color: "text-yellow-500" },
  pending_docs:{ label: "Attente docs", variant: "outline",     color: "text-orange-500" },
  approved:    { label: "Approuvee",    variant: "default",     color: "text-green-500" },
  rejected:    { label: "Rejetee",      variant: "destructive", color: "text-red-500" },
  processing:  { label: "En cours",     variant: "secondary",   color: "text-purple-500" },
  ready:       { label: "Prete",        variant: "default",     color: "text-emerald-500" },
  delivered:   { label: "Delivree",     variant: "default",     color: "text-green-700" },
  cancelled:   { label: "Annulee",      variant: "outline",     color: "text-gray-400" },
  archived:    { label: "Archivee",     variant: "outline",     color: "text-gray-300" },
};
```

## Conventions

1. TOUJOURS utiliser une matrice de transitions — jamais de `if/else` en cascade
2. TOUJOURS valider les permissions avant chaque transition
3. TOUJOURS logger chaque transition dans l'historique
4. TOUJOURS inclure `lastTransitionAt` et `lastTransitionBy`
5. Labels en francais dans l'UI, codes en anglais dans le backend

## Anti-Patterns
- Ne JAMAIS changer un statut sans passer par la fonction de transition
- Ne JAMAIS permettre une transition non definie dans la matrice
- Ne JAMAIS oublier de logger la transition dans l'historique
- Ne JAMAIS coder les transitions en dur dans les composants UI
- Ne JAMAIS utiliser des nombres magiques pour les statuts
