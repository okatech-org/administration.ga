---
name: react-vite-spa
description: " Expert React + Vite SPA. S'active automatiquement pour les projets SPA (consulat.ga, mairie.ga, sgg.ga, idetude.ga, cnom.ga). Couvre React Router, architecture des composants, hooks, state management, et patterns Vite."
---

#  Skill : React + Vite SPA Expert

## Auto-Activation
- Le projet contient `vite.config.ts` (et PAS `next.config.*`)
- Projets : `consulat.ga`, `mairie.ga`, `sgg.ga`, `idetude.ga`, `cnom.ga`

## Architectures Réelles par Projet

### consulat.ga — Structure Standard
```
src/
├── components/
│   ├── admin/        # Composants back-office (gestion org)
│   ├── ai/           # Interface iAsted
│   ├── auth/         # Login, inscription
│   ├── common/       # Composants réutilisables
│   ├── dashboard/    # Dashboard agent
│   ├── documents/    # Module iDocument
│   ├── guards/       # Route guards (auth, RBAC)
│   ├── home/         # Landing page sections
│   ├── icons/        # Icônes SVG custom
│   ├── meetings/     # Visioconférence
│   ├── notifications/
│   ├── org/          # Gestion organisation
│   ├── payment/      # Paiement
│   ├── registration/ # Inscription consulaire
│   ├── services/     # Services consulaires
│   ├── shared/       # Composants partagés (PageHeader, etc.)
│   ├── sidebars/     # Sidebars par rôle
│   └── ui/           # Shadcn (NE PAS MODIFIER)
├── config/           # Configuration app
├── data/             # Données statiques
├── hooks/            # Custom hooks
├── integrations/     # Intégrations externes
├── lib/              # Utilitaires (cn(), etc.)
├── routes/           # Pages par route
└── stores/           # Zustand stores
```

### mairie.ga — Architecture Cerveau + Standard
```
src/
├── Consciousness/    #  Orchestration IA iAsted
├── Cortex/           #  Skills, entités, rules
├── LimbicSystem/     #  Connectors (Supabase)
├── Neurons/          #  Hooks spécialisés (auth, profile, request)
├── Senses/           #  Inputs
├── Signals/          #  Event bus
├── components/       # Composants UI classiques
│   ├── admin/
│   ├── icorrespondance/  # Module iCorrespondance
│   ├── iasted/           # Chat iAsted
│   ├── iboite/           # Module iBoîte
│   ├── icom/             # Module iCom
│   ├── documents/
│   ├── editor/
│   ├── dashboard/
│   └── shared/
├── hooks/            # Hooks + hooks/neurons/
├── layouts/          # AdminLayout, DashboardLayout, PublicLayout
├── pages/
├── services/
├── stores/           # Zustand (documentVault, formAssistant, etc.)
└── types/
```

### sgg.ga — Architecture Services + Stores
```
src/
├── components/
│   ├── layout/       # DashboardLayout, Sidebar, Header, Breadcrumbs
│   ├── modules/      # Composants par module métier
│   ├── ptm/          # Programme de Travail Ministériel
│   ├── nominations/
│   ├── gar/          # Gestion Actes Réglementaires
│   ├── reporting/
│   ├── profil/
│   └── onboarding/
├── hooks/            # useApiData, usePTMWorkflow, useNeocortex, etc.
├── services/         # api.ts, analytics.ts, pdfExport.ts
├── stores/           # Zustand: ptmStore, reportingStore
└── types/
```

## Patterns Récurrents

### Layout Dashboard (Pattern commun à TOUS les projets)
```tsx
function DashboardLayout() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />  {/* Fixed sidebar */}
      <div className="flex-1 flex flex-col min-w-0">
        <Header />
        <main className="flex-1 overflow-y-auto p-4 lg:p-6">
          <Outlet />  {/* React Router outlet */}
        </main>
      </div>
    </div>
  );
}
```

### PageHeader (Pattern commun)
```tsx
interface PageHeaderProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  breadcrumbs?: { label: string; href?: string }[];
}

function PageHeader({ title, description, actions, breadcrumbs }: PageHeaderProps) {
  return (
    <div className="flex items-center justify-between pb-4 border-b mb-6">
      <div>
        {breadcrumbs && <Breadcrumbs items={breadcrumbs} />}
        <h1 className="text-2xl font-bold tracking-tight">{title}</h1>
        {description && <p className="text-muted-foreground mt-1">{description}</p>}
      </div>
      {actions && <div className="flex gap-2">{actions}</div>}
    </div>
  );
}
```

### Hook avec React Query (sgg.ga, idetude.ga)
```tsx
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/services/api";

function useDocuments(filters?: Filters) {
  return useQuery({
    queryKey: ["documents", filters],
    queryFn: () => api.get("/documents", { params: filters }),
    staleTime: 5 * 60 * 1000,
  });
}

function useCreateDocument() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: CreateDocInput) => api.post("/documents", data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["documents"] });
      toast.success("Document créé");
    },
  });
}
```

### Notification Toast (sonner — tous les projets)
```tsx
import { toast } from "sonner";

// Succès
toast.success("Opération réussie");

// Erreur
toast.error("Une erreur est survenue");

// Avec description
toast.success("Document créé", {
  description: "Le document a été ajouté à votre dossier.",
});

// Promise toast
toast.promise(submitForm(), {
  loading: "Envoi en cours...",
  success: "Formulaire envoyé !",
  error: "Échec de l'envoi",
});
```

## Anti-Patterns
-  JAMAIS utiliser des patterns Next.js dans un projet Vite
-  JAMAIS mettre de logique métier dans les composants — utiliser hooks/services
-  JAMAIS oublier les états loading/error dans les data-fetching hooks
-  JAMAIS modifier les fichiers `components/ui/` (Shadcn)
-  JAMAIS ignorer la structure existante du projet — s'y conformer
