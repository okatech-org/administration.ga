# Réorganisation du menu "Opérations" — Corps Administratif

## Contexte

Le menu latéral de l'espace Corps Administratif doit être restructuré pour mieux refléter les fonctions métier d'une ambassade/consulat. La section **Opérations** regroupe désormais trois volets majeurs.

## Structure Actuelle du Sidebar

```
Commandes       → Dashboard
Opérations      → Demandes, Registre Consulaire
Communication   → iBoîte, iCorrespondance
Modules Métier  → iDocument, iAgenda
Contenu         → Actualités (Posts)
Administration  → Paramètres
```

## Structure Proposée

```
Commandes        → Dashboard
Opérations
  ├─ Affaires Diplomatiques   (NOUVEAU — page à créer)
  ├─ Affaires Consulaires     (fusionne Demandes + Registre en tabs horizontaux)
  └─ Gestion Actualités       (déplace Posts ici + renomme)
Communication   → iBoîte, iCorrespondance
Modules Métier  → iDocument, iAgenda
Administration  → Paramètres  (inclut Services)
```

> [!IMPORTANT]
> La section **Contenu** disparaît car "Actualités" est absorbée par **Opérations > Gestion Actualités**.

---

## Proposed Changes

### 1. Sidebar — `org-sidebar.tsx`

#### [MODIFY] [org-sidebar.tsx](file:///Users/okatech/okatech-projects/Diplomatie%20Gabon/gabon-diplomatie/apps/agent-web/src/components/org/org-sidebar.tsx)

- Remplacer la section `Opérations` par les 3 nouvelles entrées
- Ajouter les icônes : `Globe2` (Diplomatiques), `Users` (Consulaires), `Newspaper` (Actualités)  
- Supprimer la section "Contenu" (posts est absorbé)
- Ajouter les nouvelles routes : `/affaires-diplomatiques`, `/affaires-consulaires`, `/gestion-actualites`

---

### 2. Affaires Consulaires — Fusion en page à tabs

#### [NEW] [affaires-consulaires.tsx](file:///Users/okatech/okatech-projects/Diplomatie%20Gabon/gabon-diplomatie/apps/agent-web/src/routes/_app/affaires-consulaires.tsx)

Page unique avec **2 tabs horizontaux** :
- **Demandes** — embarque le contenu de `requests/index.tsx` (composant `DashboardRequests`)
- **Registre Consulaire** — embarque le contenu de `consular-registry/index.tsx`

> [!NOTE]
> Les routes existantes (`/requests`, `/consular-registry`) restent fonctionnelles pour la navigation interne (ex: liens depuis le dashboard). Seul le point d'entrée sidebar change.

---

### 3. Affaires Diplomatiques — Nouvelle page placeholder

#### [NEW] [affaires-diplomatiques.tsx](file:///Users/okatech/okatech-projects/Diplomatie%20Gabon/gabon-diplomatie/apps/agent-web/src/routes/_app/affaires-diplomatiques.tsx)

Page avec **4 tabs horizontaux** (contenu placeholder pour le moment) :
- **Cibles** — Entreprises, organismes partenaires potentiels
- **Lettres de Contact** — Courriers formels aux cibles
- **Plan Stratégique** — Stratégie diplomatique et économique
- **Rapports** — Rapports pour la hiérarchie (Président, Ministre)

> [!IMPORTANT]  
> Cette page sera un **placeholder structurel** avec les tabs et un état vide élégant pour chacun. Le back-end sera implémenté dans une phase ultérieure. Validez-vous cette approche ?

---

### 4. Gestion Actualités — Redirection vers Posts

#### Aucun nouveau fichier nécessaire
- La route `/posts` existe déjà avec tout le contenu fonctionnel
- Le sidebar pointe simplement vers `/posts` avec le nouveau label "Gestion Actualités"

---

## Open Questions

> [!IMPORTANT]
> 1. Pour **Affaires Diplomatiques**, souhaitez-vous que je crée uniquement la structure visuelle (tabs + empty states) sans back-end pour le moment, ou voulez-vous que j'implémente les tables Convex et les mutations dès maintenant ?
> 2. Les permissions : les **Affaires Diplomatiques** doivent-elles être réservées à un rôle spécifique (ex: Ambassadeur, Chef de Mission) ou accessibles à tous les agents ?

## Verification Plan

### Automated Tests
- Vérification TypeScript (`npx tsc --noEmit`)
- Navigation entre les 3 volets d'Opérations via le sidebar

### Manual Verification
- Clic sur chaque entrée du menu pour valider le routage
- Vérification que les tabs Demandes/Registre fonctionnent correctement sur la page Affaires Consulaires
