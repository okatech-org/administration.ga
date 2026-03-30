---
name: module-architecture
description: "🏗️ Expert Architecture Modulaire OkaTech. S'active automatiquement pour la conception de modules métier (iDocument, iCorrespondance, iAsted, etc.). Couvre la structure des modules, l'intégration, et les patterns de composition."
---

# 🏗️ Skill : Architecture Modulaire OkaTech

## Auto-Activation
- Mots-clés : module, iDocument, iCorrespondance, iAsted, iBoîte, iArchive, iCom, architecture modulaire
- Création/modification d'un module fonctionnel

## Catalogue des Modules OkaTech

### Modules Transversaux (multi-projets)
| Module | Description | Projets |
|---|---|---|
| **iDocument** | Gestion documentaire (explorer, éditeur Tiptap, import IA, preview) | consulat.ga, digitalium.io, mairie.ga |
| **iCorrespondance** | Courriers officiels, workflow approbation, envoi | consulat.ga, mairie.ga |
| **iAsted** | Assistant IA (chatbot, analyse, intent, skills) | consulat.ga, mairie.ga |
| **iBoîte** | Boîte mail interne | mairie.ga |
| **iCom** | Communication interne/externe | mairie.ga |
| **iArchive** | Archivage numérique | consulat.ga |

### Modules Spécifiques
| Module | Description | Projet |
|---|---|---|
| **PTM** | Programme de Travail Ministériel (workflow multi-niveaux) | sgg.ga |
| **GAR** | Gestion des Actes Réglementaires | sgg.ga |
| **Nominations** | Gestion des nominations officielles | sgg.ga |
| **Reporting** | Tableaux de bord et rapports | sgg.ga |
| **ConsularServices** | Services consulaires (passeport, visa, etc.) | consulat.ga |
| **ConsularRegistration** | Inscription consulaire | consulat.ga |
| **Appointments** | Rendez-vous en ligne | consulat.ga, idetude.ga |

## Conventions de Structure

### Convention 1 : Module dans `components/` (projets SPA)
```
src/components/
├── [module-name]/          # Dossier kebab-case
│   ├── ModuleComponent.tsx # Composant principal
│   ├── SubComponent.tsx    # Sous-composants
│   ├── modals/             # Dialogs/modals du module
│   └── index.ts            # Barrel exports
```

Exemple réel (mairie.ga) :
```
src/components/icorrespondance/
├── CorrespondanceManager.tsx
├── ComposeModal.tsx
├── WorkflowTimeline.tsx
├── DocumentPreview.tsx
└── index.ts
```

### Convention 2 : Module dans `components/modules/` (projets Next.js)
```
src/components/modules/
├── idocument/
│   ├── DocumentExplorer.tsx
│   ├── DocumentEditor.tsx
│   ├── FilePreview.tsx
│   └── AIImportDialog.tsx
```

### Convention 3 : Backend Convex par module
```
convex/
├── [module].ts             # Un fichier par module
│   # Contient queries + mutations du module
├── schemas/
│   └── [table].ts          # Table(s) associée(s) au module
```

## Pattern d'Activation de Module (ModuleCode)

```ts
// convex/lib/moduleCodes.ts — Contrôle QUELS modules sont accessibles
export const ModuleCode = {
  requests: "requests",
  documents: "documents",
  appointments: "appointments",
  profiles: "profiles",
  civil_status: "civil_status",
  finance: "finance",
  hr: "hr",
  communication: "communication",
  meetings: "meetings",
  // ...
};

// Chaque organisation a ses modules activés
// org.modules: ModuleCodeValue[] — défini par le superadmin
// Chaque position a ses modules accessibles
// position.modules: ModuleCodeValue[] — subset des modules de l'org
```

### Frontend — Affichage conditionnel par module
```tsx
function Sidebar({ org, membership }) {
  const modules = org.modules;          // Modules de l'org
  const positionModules = position.modules; // Modules de la position
  
  return (
    <nav>
      {positionModules.includes(ModuleCode.requests) && (
        <NavItem to="/requests" icon={FileText} label="Demandes" />
      )}
      {positionModules.includes(ModuleCode.documents) && (
        <NavItem to="/documents" icon={FolderOpen} label="Documents" />
      )}
    </nav>
  );
}
```

## Règles de Conception
1. **Autonomie** : Un module peut être activé/désactivé sans casser le reste
2. **Pas de dépendances circulaires** entre modules
3. **Communication indirecte** : Via store global ou event bus, jamais d'import direct inter-modules
4. **Backend isolé** : Chaque module a son propre fichier Convex
5. **Permissions granulaires** : `ModuleCode` (accès au module) + `TaskCode` (actions dans le module)
