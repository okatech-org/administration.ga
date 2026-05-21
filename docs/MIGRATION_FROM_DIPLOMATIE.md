# Migration depuis `gabon-diplomatie`

> **Cible :** ingénieurs qui veulent comprendre d'où vient le code, pourquoi ces choix, et ce qui reste à finir.
> **Origine :** ce projet est un **fork** du monorepo [`gabon-diplomatie`](https://github.com/okatech-org/gabon-diplomatie), bootstrappé le 15 mai 2026.
> **État :** 9 phases d'implémentation complétées (mai 2026). Dette résiduelle documentée §5.

---

## 1. Contexte — pourquoi ce fork ?

### 1.1 Le constat

`gabon-diplomatie` est la plateforme de la République Gabonaise pour ses **représentations diplomatiques** (ambassades, consulats, missions permanentes) et les **démarches consulaires** des Gabonais à l'étranger (CNI consulaire, passeport, visa, état civil, immatriculation, etc.).

Lors du cadrage du projet `PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS` (mars 2026), il est apparu que :

1. Le **socle technique** de `gabon-diplomatie` (Turborepo + Convex + Next.js 14 + Better Auth + LiveKit + Tiptap) couvrait à 90% les besoins de l'administration nationale.
2. Le **module iCorrespondance** était déjà conçu de manière **universelle** pour gérer aussi bien des correspondances diplomatiques que des correspondances administratives internes (cf. spec dans [`../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md`](../ADMINISTRATION.GA/iCorrespondance-Specification-Fonctionnelle.md)).
3. Les **modules transversaux** (iDocument, iArchive, iAgenda, iCom, iAsted) étaient indépendants du domaine métier et donc directement transposables.
4. Le **modèle de données** orgs/memberships/services était suffisamment générique pour absorber la taxonomie administrative (Présidence, ministères, DG, EP, AAI, parlement, juridictions, collectivités).

Forker `gabon-diplomatie` pour créer `administration.ga` permettait donc :

- de **gagner ~6 mois** de développement frontend + backend par rapport à un nouveau projet ;
- de **partager les évolutions** transversales du socle entre les deux plateformes pendant un certain temps (avant de diverger naturellement) ;
- de **garantir l'interopérabilité** entre les deux plateformes (notamment pour les Affaires Étrangères, qui font le pont) ;
- de **conserver l'historique git** des phases de bootstrap pour traçabilité.

### 1.2 La frontière fonctionnelle

| Domaine | `gabon-diplomatie` | `administration.ga` |
|---|---|---|
| Audience principale | Ressortissants gabonais à l'étranger + agents diplomatiques | Citoyens et entreprises sur le territoire + agents administratifs |
| Organismes gérés | Ambassades, consulats, missions permanentes | Présidence, ministères, directions générales, établissements publics, AAI, parlement, juridictions, collectivités |
| Démarches | Démarches consulaires (CNI consulaire, passeport, visa, etc.) | Démarches administratives nationales (CNI, passeport intérieur, état civil, casier judiciaire, cadastre, etc.) |
| Domaines publics | `consulat.ga`, `diplomate.ga`, `admin.consulat.ga` | `demarche.ga`, `administration.ga`, `admin.administration.ga` |
| Pilotage | Ministère des Affaires Étrangères | Présidence + Vice-Présidence du Gouvernement + Admin Système |

Les deux plateformes restent **interconnectables** via le canal souverain `Presidence ↔ MAE` (Phase 7), et le module `consular_affairs` est conservé dans le catalogue d'`administration.ga` pour les démarches mixtes.

---

## 2. Mapping métier

| Concept `gabon-diplomatie` | Concept `administration.ga` |
|---|---|
| Représentation diplomatique | Administration publique |
| Ambassade / Haut-Commissariat | Ministère / Institution souveraine |
| Consulat / Consulat général | Direction générale / Guichet administratif local |
| Section consulaire | Service / Bureau d'ordre |
| Ressortissant à l'étranger | Citoyen / Usager / Entreprise |
| Démarche consulaire | Démarche administrative |
| Juridiction consulaire | Ressort territorial (province / département / commune) |
| Ambassadeur / Chef de mission | Ministre / Directeur général / Responsable |
| Section visa | Service public dédié (cadastre, état civil, etc.) |

### Mapping des apps

| Source `gabon-diplomatie` | Cible `administration.ga` | URL prod | Port dev |
|---|---|---|---|
| `apps/agent-web` (diplomate.ga) | `apps/admin-gabon` | `administration.ga` | 3003 |
| `apps/backoffice-web` (admin.consulat.ga) | `apps/admin-gabon-backoffice` | `admin.administration.ga` | 3002 |
| `apps/citizen-web` (consulat.ga) | `apps/admin-gabon-citizen` | `demarche.ga` | 3000 |
| `apps/agent-desktop` | `apps/agent-desktop` | — | — |

### Variables d'environnement de domaine

```
NEXT_PUBLIC_APP_NAME=ADMINISTRATION.GA
NEXT_PUBLIC_DOMAIN_CITIZEN=demarche.ga
NEXT_PUBLIC_DOMAIN_AGENT=administration.ga
NEXT_PUBLIC_DOMAIN_ADMIN=admin.administration.ga
```

---

## 3. Ce qui a été conservé à l'identique

Le **socle technique** est strictement le même que `gabon-diplomatie` :

- **Turborepo + Bun** (1.2.17) pour la gestion monorepo
- **Next.js 14** (App Router, React 19) pour les 3 apps web
- **Convex** comme backend (schémas TS, queries/mutations/actions, real-time subscriptions)
- **Better Auth** (OTP email/SMS, OAuth IDN, multi-domaine, plugin `convex` + `crossDomain`)
- **LiveKit** pour les appels et réunions (avec `@workspace/livekit` partagé)
- **Tiptap** pour l'édition de correspondance et de documents
- **shadcn/ui + Tailwind CSS** (~45 composants partagés dans `@workspace/ui`)
- **PostHog** pour la télémétrie
- **GCP Cloud Run + Artifact Registry** pour le déploiement
- **OpenAI Realtime + Gemini + Anthropic** pour iAsted / Mr Ray / analyse de documents

La **charte graphique** `Consulat.ga` (palette achromatique 6 gris + 4 accents, neumorphisme Soft UI, identité Gabon en décoratif) est conservée telle quelle — elle est applicable à l'administration nationale sans modification, le branding étant tout aussi institutionnel. Voir [`../DESIGN_CHARTER.md`](../DESIGN_CHARTER.md).

Les **patterns OkaTech** sont aussi conservés :
- `customFunctions` (`authQuery`, `authMutation`, `authAction`) imposés pour tout endpoint Convex
- RBAC à 3 niveaux (TaskCode → ModuleCode → Position)
- Workflow d'iCorrespondance avec copies lecture seule et audit immuable
- iAsted Mode God (registry + dispatcher + system prompt)

---

## 4. Ce qui a changé

| Domaine | Évolution |
|---|---|
| `OrganizationType` | +12 types administratifs (`presidency`, `vice_presidency`, `government`, `delegated_ministry`, `directorate_general`, `public_establishment`, `national_agency`, `independent_authority`, `parliament_chamber`, `supreme_court`, `consultative_institution`, `local_authority`). Les 8 types diplomatiques sont conservés en héritage. |
| `MinistrySubType` | +28 portefeuilles 2026 du gouvernement Oligui Nguema II (cf. [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §A.2). Les valeurs legacy sont conservées. |
| `tutelleLevel` | Nouveau champ `0|1|2|3` sur `orgs` matérialisant la hiérarchie souverain/ministère/DG/EP. Helper `getOrgsByTutelle()` ajouté. |
| `ModuleCode` | +3 modules `iasted`, `iarchive`, `iboite` (catégorie `noyau_administratif`). Les 16 modules historiques sont conservés. |
| Seeds | Nouveau dataset "5e République" (~270 entités : Présidence, 28 ministères, ~110 DG, ~80 EP, AAI, parlement, juridictions, 9 provinces). |
| iCorrespondance | +8 types ADM-* (notes de service, lettres officielles, transmissions, accusés). `resolveRecipient(orgSlug, roleSlug)` ajouté pour le routage administratif. |
| iAsted | Mode Administration ajouté avec 4 business tools souverains (`list_institutions`, `describe_institution`, `list_correspondance_admin`, `send_sovereign_message`). |
| Sovereign channels | Nouvelles tables `sovereignChannels` + `sovereignChannelEvents` pour matérialiser les liens formels entre institutions souveraines, avec audit immuable. |
| Domaines | `consulat.ga` → `demarche.ga`, `diplomate.ga` → `administration.ga`, `admin.consulat.ga` → `admin.administration.ga`. |
| Branding apps | 3 apps rebrandées (titres, manifeste PWA, favicons, metadata, layout) sur le nouveau nom. |
| CI/CD | Workflow `deploy-administration-ga.yml` ajouté + workflows `deploy-citizen.yml` / `deploy-agent.yml` / `deploy-backoffice.yml` reconfigurés sur le service Cloud Run `administration-ga`. |

---

## 5. Plan d'implémentation en 9 phases — détail des PRs

L'implémentation est découpée en 9 phases, chacune correspondant à une PR sur [`okatech-org/administration.ga`](https://github.com/okatech-org/administration.ga). Chaque phase est atomique : `bun run typecheck` passe entre chaque PR (sauf la régression historique `agent-desktop` non liée).

| Phase | PR | Branche | Commit principal | Sujet |
|---|---|---|---|---|
| 0 | [#1](https://github.com/okatech-org/administration.ga/pull/1) | `feat/bootstrap-administration-ga` | `46f6a939` | Fork et bootstrap depuis `gabon-diplomatie`. Renommage `package.json` racine. Premier `CLAUDE.md`. |
| 1 | [#2](https://github.com/okatech-org/administration.ga/pull/2) | `feat/phase1-org-model-extended` | `ae400d12` | Modèle organisationnel étendu : 12 nouveaux `OrgType`, 28 nouveaux `MinistrySubType`, champ `tutelleLevel`, helper `getOrgsByTutelle()`, migration `backfillTutelleLevel`. |
| 2 | [#3](https://github.com/okatech-org/administration.ga/pull/3) | `feat/phase2-seeds-administration` | `39497e6c` + `acb19ae5` | Seeds 5e République : 270 entités (5 fichiers `seedMinistries`, `seedDirectionsGenerales`, `seedEtablissementsPublics`, `seedInstitutionsSouveraines`, `seedAAI`). Idempotents. |
| 3 | [#4](https://github.com/okatech-org/administration.ga/pull/4) | `feat/phase3-rebranding-apps` | `21eb1b7b` | Rebranding 3 apps : `package.json`, titres, metadata Next.js, manifeste PWA, favicons, écrans d'auth. |
| 4 | [#5](https://github.com/okatech-org/administration.ga/pull/5) | `feat/phase4-icorrespondance-administratif` | `4ea2c848` | iCorrespondance administratif : 8 types ADM-*, helper `resolveRecipient(orgSlug, roleSlug)`, mapping vers les `orgServices` et points d'entrée. |
| 5 | [#6](https://github.com/okatech-org/administration.ga/pull/6) | `feat/phase5-modules-noyau` | `27c52a99` | Modules MVP : `iasted`, `iarchive`, `iboite` ajoutés dans `MODULE_REGISTRY`. Catégorie `noyau_administratif` créée. Catalogue National câblé. |
| 6 | [#7](https://github.com/okatech-org/administration.ga/pull/7) | `feat/phase6-iasted-administration` | `5aff638f` | iAsted Mode Administration : section dédiée dans `iastedRealtimePrompt.ts`, 4 business tools souverains, double confirmation orale obligatoire pour `send_sovereign_message`. |
| 7 | [#8](https://github.com/okatech-org/administration.ga/pull/8) | `feat/phase7-interconnexion-souveraine` | `7743c3e1` | Sovereign channels : tables `sovereignChannels` + `sovereignChannelEvents`, fonctions CRUD + audit, migration `seedSovereignChannels` (Presidence ↔ VPG, ↔ AN, ↔ Sénat, SGG ↔ ministères). |
| 8 | [#9](https://github.com/okatech-org/administration.ga/pull/9) | `feat/phase8-cicd-cloud-run` | `f51e2f7f` | CI/CD Cloud Run : workflow `deploy-administration-ga.yml`. Reconfiguration des 3 workflows app sur le service Cloud Run `administration-ga` + Artifact Registry. |
| 9 | en cours | `feat/phase9-documentation` | — | Documentation projet : nouveau `README.md`, dossier `docs/` (architecture, migration, référentiel, gouvernance), statut 9 phases dans `CLAUDE.md`. |

---

## 6. Dette résiduelle Phase 9

Cette section liste ce qui **reste** à finir pour atteindre un état "propre" complet.

### 6.1 Textes longs (FAQ, mentions légales, guides)

Environ **~60 fichiers** dans `apps/admin-gabon-citizen/src/app/(public)/` contiennent encore des chaînes `consulat`, `consulaire`, `diplomatie`, `consulat.ga` ou `diplomate.ga` dans des **textes longs** (paragraphes de FAQ, mentions légales, politique de confidentialité, accessibilité, formulaires, guides "arrivée"/"retour"/"vie pratique", post articles, news, fiches reps).

Périmètre concret identifié :

- `apps/admin-gabon-citizen/src/app/(public)/faq/faq-items.ts` — questions/réponses FAQ
- `apps/admin-gabon-citizen/src/app/(public)/mentions-legales/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/confidentialite/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/accessibilite/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/formulaires/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/ressources/guides/{arrivee,retour,vie-pratique}/page.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/news/page.tsx` + `[slug]/post-detail-client.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/reps/reps-page-client.tsx` + `[slug]/org-detail-client.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/services/[slug]/service-detail-client.tsx`
- `apps/admin-gabon-citizen/src/app/(public)/services/page.tsx`

Ce travail est **éditorial** plus que technique : il faut réécrire les textes avec le bon vocabulaire administratif (citoyen, démarche administrative, administration publique, etc.). Hors scope d'une PR technique unique.

### 6.2 Composants à régionaliser

- `AddressWithAutocomplete` (dans `apps/admin-gabon-citizen/`) : actuellement basé sur une liste de pays restreinte (Schengen + cible diplomatique). À adapter aux provinces / départements / communes gabonaises (9 provinces + ~50 départements + ~150 communes). Voir [`../CLAUDE.md`](../CLAUDE.md) §"Decisions de non-extraction".

### 6.3 Régressions de typecheck héritées

Le projet contient une régression connue sur `agent-desktop` (TypeScript errors `TS6133`/`TS6196` non bloquantes — variables/imports déclarés mais non utilisés dans `packages/agent-features/src/features/idocument/IDocumentPage.tsx` et `packages/iasted/src/`). Cette régression existait avant Phase 0 et n'a pas été corrigée pendant les Phases 1-9 pour ne pas mélanger les sujets.

État typecheck actuel : **11/12** tasks Turborepo passent, seul `agent-desktop#typecheck` échoue avec ces TS lints. À traiter dans une PR `chore(agent-desktop): clean unused declarations` séparée.

### 6.4 Données seed à enrichir

Les seeds couvrent les ~270 entités principales mais ne contiennent **pas encore** :

- les **titulaires actuels** (ministres, DG, responsables d'EP) — à seeder à partir d'une source canonique (Journal Officiel, décrets de nomination). Ne JAMAIS inventer un titulaire (cf. règle critique dans [`../CLAUDE.md`](../CLAUDE.md)).
- l'**organigramme interne** des ministères (cabinet, secrétariat général, conseillers techniques)
- les **services et bureaux d'ordre** par direction (point d'entrée pour `resolveRecipient`)
- les **conseils municipaux/départementaux** au-delà des chefs-lieux de province

### 6.5 Modules cibles non encore livrés

Sur les 19 modules du catalogue cible, les 16 historiques + 3 nouveaux (`iasted`, `iarchive`, `iboite`) sont **enregistrés** dans `MODULE_REGISTRY` mais seuls les modules historiques + iAsted ont une **UI mature**. iArchive et iBoîte sont en MVP backend (schémas + tâches RBAC) sans UI dédiée. Voir [`./ARCHITECTURE.md`](./ARCHITECTURE.md) §5.

---

## 7. Comment contribuer

- **Avant tout PR métier** : lire [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md) et [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md).
- **Avant tout PR technique** : lire [`./ARCHITECTURE.md`](./ARCHITECTURE.md) + [`../CLAUDE.md`](../CLAUDE.md).
- **Avant tout PR design** : lire [`../DESIGN_CHARTER.md`](../DESIGN_CHARTER.md).
- Une PR = un sujet. La structure des 9 phases reste la référence pour découper le travail.
- `bun run typecheck` doit rester à 11/12 (ou mieux si vous corrigez `agent-desktop`).

---

## 8. Pour aller plus loin

- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) — architecture technique détaillée
- [`./GOUVERNANCE.md`](./GOUVERNANCE.md) — modèle de gouvernance, RBAC, classifications
- [`./REFERENTIEL_INSTITUTIONS.md`](./REFERENTIEL_INSTITUTIONS.md) — index institutionnel + règle de non-invention
- [`../ADMINISTRATION.GA/PROMPT_IMPLEMENTATION_ADMINISTRATION_GA.md`](../ADMINISTRATION.GA/PROMPT_IMPLEMENTATION_ADMINISTRATION_GA.md) — prompt d'origine du plan en 9 phases
