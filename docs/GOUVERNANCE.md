# Gouvernance — ADMINISTRATION.GA

> **Cible :** Admin Système, Admin Institution, et tout ingénieur travaillant sur le RBAC ou les permissions.
> **Source autoritaire :** [`../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md) §4-§5-§8-§10, et [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §C.

---

## 1. Principe — Double gouvernance

`administration.ga` repose sur une **double gouvernance** explicite :

- **Admin Système (national)** publie les règles globales (registre national des institutions, catalogue des modules, politiques de classification/rétention/audit, validation des canaux souverains).
- **Admin Institution (local)** gère la vie interne de son institution (utilisateurs, rôles, workflows locaux, activation des modules autorisés).

Cette double gouvernance garantit la **souveraineté nationale** sur les outils tout en préservant l'autonomie opérationnelle de chaque institution.

---

## 2. Responsabilités — Admin Système vs Admin Institution

Source : [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §C.5.

| Responsabilité | Admin Système | Admin Institution |
|---|---|---|
| Registre national des institutions | OK | — |
| Catalogue national des modules | OK | — |
| Politique de classification / rétention / audit | OK (publie) | hérite + applique |
| Validation des canaux d'interconnexion souveraine | OK | — |
| Activation des modules sur une institution | autorise / verrouille | active si autorisé |
| Gestion des utilisateurs et rôles internes | — | OK |
| Workflows locaux | — | OK |
| Connexion des directions sous tutelle | — | OK |
| Cycle de vie des données locales | — | OK |
| Audit et traçabilité (lecture) | OK (transverse) | OK (local) |

### 2.1 Admin Système — qui ?

Rôle souverain national détenu par une instance ad-hoc (typiquement la Vice-Présidence du Gouvernement ou un organe rattaché à la Présidence). Implémentation : permission `system.admin` portée par une membership sur l'org racine `administration-ga-system` (org synthétique non-administrative).

### 2.2 Admin Institution — qui ?

Rôle local porté par un ou plusieurs utilisateurs avec membership active sur l'organisation cible (ministère, DG, EP, AAI, juridiction, collectivité). Implémentation : ModuleCode `settings` avec niveau `admin` (cf. `MODULE_ACCESS_TASKS` dans `convex/lib/moduleCodes.ts`).

---

## 3. Catalogue National des Modules

### 3.1 Rôle

Le Catalogue National est **publié et maintenu par Admin Système**. Il comprend :

- les **spécifications fonctionnelles** par module (iCorrespondance, iDocument, iArchive, iAgenda, iBoîte, iCom, iAsted, etc.) ;
- les **politiques globales** (classification, rétention, audit) qui s'appliquent par défaut ;
- la **validation des intégrations souveraines** (canaux Présidence/Assemblée/SGG/Ministères).

Les politiques sont **héritées** du ministère vers ses directions sous tutelle. Une DG ne peut pas appliquer une politique moins stricte que son ministère de tutelle.

### 3.2 États d'autorisation (niveau Admin Système)

Pour chaque couple `(module, institution)`, Admin Système définit un état d'autorisation :

| État | Sens |
|---|---|
| `autorise` | Le module est disponible pour cette institution. Admin Institution peut l'activer ou non. |
| `interdit` | Le module n'est pas disponible. Admin Institution ne peut pas l'activer. |
| `verrouille` | Le module est **imposé** (toujours activé). Admin Institution ne peut pas le désactiver. |

### 3.3 États d'activation (niveau Admin Institution) — `activeModules`

Pour chaque module **autorisé**, Admin Institution définit un état local stocké dans le champ `activeModules` de l'org :

| État | Sens |
|---|---|
| `enabled` | Le module est actif pour cette institution et ses utilisateurs. |
| `disabled` | Le module est volontairement désactivé localement. |
| `locked` | État imposé par Admin Système (override) — non modifiable localement. |

Le mapping s'opère dans `convex/schemas/orgs.ts` (champ `activeModules`) avec un trigger qui rejette toute mutation `disabled` sur un module en `verrouille`.

### 3.4 Récursivité ministère → directions

Une DG sous tutelle d'un ministère hérite par défaut de l'état d'activation du ministère. L'Admin Institution de la DG peut :

- **désactiver** un module activé par le ministère (sauf si `locked`)
- **activer** un module non activé par le ministère, si Admin Système l'a `autorise` au niveau DG aussi

---

## 4. Canaux d'interconnexion souveraine

Source : [`./ARCHITECTURE.md`](./ARCHITECTURE.md) §9 et `convex/schemas/sovereignChannels.ts` + `convex/functions/sovereignChannels.ts`.

### 4.1 Définition

Un **canal souverain** est un lien de communication formel entre deux institutions souveraines (orgA ↔ orgB), avec :

- une liste de **classifications autorisées** (`public | interne | confidentiel | secret`)
- un flag **accusé de réception** (envoi → réception → ouverture → acquittement)
- un flag **horodatage qualifié** (timestamping certifié sur chaque évènement)
- une option **signature électronique** du chef de poste

### 4.2 Canaux pré-câblés (Phase 7)

| Canal | Description |
|---|---|
| `Presidence ↔ vice-presidence-gouvernement` | Alias "Primature". Communications Présidence ↔ chef du gouvernement. |
| `Presidence ↔ assemblee-nationale` | Communications Présidence ↔ Assemblée nationale. |
| `Presidence ↔ senat` | Communications Présidence ↔ Sénat. |
| `secretariat-general-presidence ↔ min-*` | SGG ↔ chaque ministère pour la circulation des notes et décrets. |

### 4.3 Règles d'usage (PROJET §8.2)

- **Aucun partage automatique** entre institutions. Toute transmission est explicite et tracée.
- La **classification la plus stricte** du dossier s'applique aux pièces jointes (un dossier `confidentiel` ne peut pas être transmis via un canal qui n'autorise que `interne`).
- **Traces complètes** : envoi / réception / ouverture / acquittement, journalisés dans `sovereignChannelEvents`.
- **Accusés horodatés** : chaque évènement reçoit un timestamp serveur immuable.

### 4.4 Création d'un nouveau canal

La création d'un canal souverain est une **mutation Admin Système** uniquement. Elle :

1. Vérifie que les deux orgs existent et sont de type souverain (`presidency`, `parliament_chamber`, `supreme_court`, `ministry`, etc.).
2. Calcule le slug lexicographique stable (`orgAslug__orgBslug` triés alphabétiquement).
3. Vérifie l'idempotence (rejet si le canal existe déjà).
4. Insère dans `sovereignChannels` avec `isActive=true`.
5. Émet un évènement `sent` initial de type "création" dans `sovereignChannelEvents`.

---

## 5. Classifications

Source : [`../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md) §10.2.

Les 4 niveaux de classification s'appliquent à **toute donnée** transitant dans le système (correspondance, document, message, fichier joint, évènement de canal souverain) :

| Classification | Sens | Lecteurs |
|---|---|---|
| `public` | Donnée publique, partageable. | Tout le monde y compris non-authentifiés. |
| `interne` | Donnée interne à une institution. | Tout utilisateur authentifié avec membership active sur l'org. |
| `confidentiel` | Donnée sensible. | Lecteurs explicitement autorisés (ModuleCode + TaskCode + assignation au dossier). Consultation **tracée**. |
| `secret` | Donnée souveraine la plus sensible. | Lecteurs explicitement autorisés + niveau d'accréditation `secret` sur la membership. Consultation **tracée** + alerte temps réel à l'Admin Institution. |

### 5.1 Réconciliation iCorrespondance vs PROJET

La spec d'iCorrespondance (§3.3) liste `standard | confidentiel | secret`, mais le PROJET (§10.2) liste 4 niveaux `public | interne | confidentiel | secret`. **Décision tranchée :** s'aligner sur les 4 niveaux du PROJET. Le champ `standard` d'iCorrespondance est mappé sur `interne`. Cette décision est documentée dans [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §D.8.

### 5.2 Implémentation Convex

- **Schémas** : champ `classification` de type union `"public" | "interne" | "confidentiel" | "secret"` sur les tables `correspondance`, `documents`, `archives`, `iBoiteMessages`, `sovereignChannelEvents`.
- **Index** : `by_classification` pour filtrer rapidement les dossiers par niveau.
- **Helper de check** : `assertCanRead(userId, classification, orgId)` dans `convex/lib/permissions.ts`.
- **Audit obligatoire** : toute consultation d'une donnée `confidentiel` ou `secret` génère un évènement dans `auditLog` (cf. §7).

---

## 6. RBAC — TaskCode + ModuleCode + Position

Source : `convex/lib/taskCodes.ts`, `convex/lib/moduleCodes.ts`, `convex/lib/roles.ts`.

### 6.1 Niveaux d'abstraction

```
TaskCode (atome)        ex: "requests.view", "documents.sign", "intelligence.profiles.export"
   ↓ groupé en
ModuleCode + niveau     ex: { moduleCode: "documents", accessLevel: "editor" }
   ↓ assigné via
Position                ex: "Directeur de Cabinet", "Chef de Service", "Agent d'accueil"
   ↓ portée par
Membership              user_id × org_id × [Position] × [moduleAccess]
```

### 6.2 ModuleCode × 3 niveaux d'accès

Chaque ModuleCode expose 3 niveaux d'accès qui se résolvent en TaskCodes via le mapping `MODULE_ACCESS_TASKS` :

| Niveau | Description |
|---|---|
| `reader` | Consultation seule (tâches `*.view`) |
| `editor` | Lecture + actions métier (`*.create`, `*.process`, `*.manage`) |
| `admin` | Éditeur + peut attribuer le module à d'autres utilisateurs |

### 6.3 Resolution finale (Set<TaskCode>)

```ts
import { resolveTaskCodesFromModuleAccess } from "@/convex/lib/moduleCodes";

const tasks = resolveTaskCodesFromModuleAccess(membership.moduleAccess);
// Set { "org.view", "schedules.view", "requests.view", "documents.sign", ... }
```

Les TaskCodes transverses (`org.view`, `schedules.view`) sont **toujours** ajoutés implicitement.

### 6.4 Gating par institution

Une membership est **scopée à une org**. Pour les institutions multi-niveaux (ministère + DG + EP), un utilisateur peut avoir plusieurs memberships actives, chacune avec sa propre liste de modules et niveaux d'accès. L'Admin Institution est responsable de cohérence entre les niveaux.

---

## 7. Audit immuable

Source : `convex/schemas/auditLog.ts`, `convex/schemas/aiActivityLog.ts`, `convex/schemas/sovereignChannelEvents` (cf. Phase 7).

### 7.1 Tables d'audit

| Table | Périmètre | Phase |
|---|---|---|
| `auditLog` | Audit transverse de toute action sensible (CRUD users/roles, transmission de dossier, signature, consultation `confidentiel`/`secret`, etc.) | 0 (hérité de `gabon-diplomatie`) |
| `aiActivityLog` | Audit des actions iAsted (tool calls, retour des dispatchers, latences) | 6 |
| `sovereignChannelEvents` | Audit des évènements sur les canaux souverains | 7 |
| `journalAction` (iCorrespondance) | Audit dossier par dossier (création/transmission/signature/renvoi/consultation/impression) | 4 |

### 7.2 Caractère immuable

Une fois écrits, les évènements d'audit **ne sont jamais modifiés ni supprimés**. Les corrections passent par des évènements additionnels (`detail: "rectification: ..."`). Aucune mutation Convex ne permet `db.delete()` sur ces tables.

Le respect de cette règle est vérifié par :

- **Convention de code** : revues de PR strictes sur les tables `*Log` et `*Events`.
- **Test unitaire** : `convex/tests/audit_immutability.test.ts` vérifie l'absence de `db.delete` ou `db.patch` sur ces tables.
- **Cron de vérification** (à venir Phase 10+) : un cron périodique recalcule un hash chaîné par jour et alerte si la chaîne est rompue.

### 7.3 Rétention

Par défaut : **rétention illimitée** sur les évènements d'audit. Une politique de purge n'est applicable que par décret Admin Système, et elle est elle-même journalisée.

---

## 8. Sécurité by design

| Mesure | Implémentation |
|---|---|
| Chiffrement au repos | Stockage Convex chiffré (AES-256). Fichiers binaires dans Convex Storage + GCS chiffré. |
| Chiffrement en transit | TLS 1.3 obligatoire (HTTPS + WebSocket secure). |
| Moindre privilège | RBAC TaskCode atomique + ModuleCode + Position. Aucun rôle "super-utilisateur" sans audit. |
| Journalisation | `auditLog` immuable sur toute action sensible. |
| Authentification forte | Better Auth (OTP email/SMS), OAuth IDN, MFA en option pour les rôles `admin`/`secret`. |
| Multi-tenant | Toutes les requêtes sont scopées par `orgId` (membership active). Aucune cross-org sans canal souverain explicite. |
| Limites d'usage | `@convex-dev/rate-limiter` sur les endpoints sensibles (auth, transmission, IA). |
| Validation entrée | Convex validators (`v.union`, `v.string`, `v.id(...)`) sur toutes les mutations + Zod côté client. |

---

## 9. Procédures de support

### 9.1 Création d'une institution

Voir [`./REFERENTIEL_INSTITUTIONS.md`](./REFERENTIEL_INSTITUTIONS.md) §5.2. Toute création passe par :

1. Vérification dans le référentiel canonique.
2. Décision Admin Système (publication dans le registre national).
3. Seed Convex idempotent.
4. Création du premier Admin Institution.

### 9.2 Activation d'un module

1. Vérifier l'état d'autorisation côté Admin Système (`autorise`/`interdit`/`verrouille`).
2. Si `autorise`, Admin Institution active via `org.activeModules[moduleCode] = "enabled"`.
3. Attribuer les niveaux d'accès aux memberships pertinentes.
4. Vérifier la cohérence avec les modules du ministère de tutelle.

### 9.3 Ouverture d'un canal souverain

1. Demande Admin Système motivée (note interne, décret, etc.).
2. Validation Admin Système (le canal touche deux institutions souveraines).
3. Création via mutation `sovereignChannels.create` (Admin Système uniquement).
4. Premier ping de test pour valider la connectivité (event `sent` puis `acknowledged`).

---

## 10. Pour aller plus loin

- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture technique (modules, sovereign channels, iAsted)
- [`./REFERENTIEL_INSTITUTIONS.md`](./REFERENTIEL_INSTITUTIONS.md) — référentiel + règle de non-invention
- [`./MIGRATION_FROM_DIPLOMATIE.md`](./MIGRATION_FROM_DIPLOMATIE.md) — histoire de la migration
- [`../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md) — source canonique (§4, §5, §8, §10)
- [`../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md`](../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md) — détail spec iCorrespondance (workflow, copie passage, journal action)
- [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §C — synthèse de la gouvernance
