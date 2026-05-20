# PROMPT D'IMPLÉMENTATION — ADMINISTRATION.GA

> **Usage** : copier-coller ce prompt dans Claude Code, en étant positionné à la racine du projet `gabon-diplomatie`.
> **Objectif** : transformer (ou forker) `gabon-diplomatie` en `administration.ga` — la plateforme de digitalisation des administrations gabonaises (ministères, directions générales, établissements publics).
> **Stratégie recommandée** : fork avec migration progressive (préserve l'historique git, garde gabon-diplomatie comme référence).

---

## PROMPT À COLLER DANS CLAUDE CODE

---

```
Tu es l'architecte senior chargé d'implémenter le projet ADMINISTRATION.GA en partant du monorepo
gabon-diplomatie. Tu travailles dans le projet OkaTech, tu respectes les conventions définies dans
/Users/okatech/okatech-projects/SKILLS/CLAUDE.md et /Users/okatech/okatech-projects/Diplomatie Gabon/
gabon-diplomatie/CLAUDE.md.

# CONTEXTE

ADMINISTRATION.GA est le pendant administratif de gabon-diplomatie. Là où gabon-diplomatie gère
les représentations diplomatiques (ambassades, consulats) et les démarches consulaires, ADMINISTRATION.GA
gère les administrations gabonaises (ministères, directions générales, établissements publics, AAI)
et les démarches administratives des citoyens et entreprises sur le territoire national.

Le socle technique est IDENTIQUE — Turborepo + Convex + Next.js 14 + Better Auth + LiveKit + Tiptap.
Seuls le domaine métier, le modèle organisationnel et la terminologie changent.

## Mapping des apps et domaines

| gabon-diplomatie               | administration.ga                  | URL prod                    | Port dev |
|--------------------------------|------------------------------------|-----------------------------|----------|
| apps/agent-web (diplomate.ga)  | apps/agent-web (administration.ga) | administration.ga           | 3003     |
| apps/backoffice-web            | apps/backoffice-web                | admin.administration.ga     | 3002     |
| apps/citizen-web (consulat.ga) | apps/citizen-web (demarche.ga)     | demarche.ga                 | 3000     |
| apps/agent-desktop             | apps/agent-desktop                 | (desktop Electron)          | -        |
| apps/users-web                 | apps/users-web                     | (interne)                   | -        |

## Mapping métier

| Concept gabon-diplomatie        | Concept administration.ga                                |
|---------------------------------|----------------------------------------------------------|
| Représentation diplomatique     | Administration publique                                  |
| Ambassade / Haut-Commissariat   | Ministère / Institution souveraine                       |
| Consulat général / consulat     | Direction générale / Guichet administratif local         |
| Section consulaire              | Service / Bureau d'ordre                                 |
| Ressortissant à l'étranger      | Citoyen / Usager / Entreprise                            |
| Démarche consulaire             | Démarche administrative                                  |
| Juridiction consulaire          | Ressort territorial (province / département / commune)   |
| Chef de mission / Ambassadeur   | Ministre / Directeur général / Responsable               |
| Section visa                    | Service public dédié (cadastre, état civil, etc.)        |

# RÉFÉRENCES DOCUMENTAIRES (À LIRE EN PRÉAMBULE)

Tu DOIS lire ces documents avant de commencer :

1. /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md
   → la liste exhaustive des 31 ministères du gouvernement Oligui Nguema II (1er janvier 2026),
     leurs directions générales et établissements sous tutelle. C'est ton référentiel métier.

2. /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/ADMINISTRATION.GA/
   iCorrespondance-Specification-Fonctionnelle.md
   → la spec du module iCorrespondance (universel, déjà conçu pour gérer aussi bien
     les correspondances diplomatiques qu'administratives).

3. /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/ADMINISTRATION.GA/
   PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md
   → la vision cible : multi-tenant, modules iAsted/iDocument/iArchive/iCorrespondance/
     iBoîte/iAgenda/iCom, gouvernance Admin Système + Admin Institution.

4. /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/CLAUDE.md
   → conventions OkaTech, design system Consulat.ga (à conserver et adapter), patterns Convex,
     utilitaires @workspace/livekit et @workspace/chat, règles iAsted Mode God.

5. /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/DESIGN_CHARTER.md
   → charte graphique neumorphique Soft UI à RÉUTILISER À L'IDENTIQUE (palette achromatique
     + accents bleu/vert/amber/rose + bandes décoratives vert/jaune/bleu du drapeau gabonais).

# STRATÉGIE D'IMPLÉMENTATION : FORK + MIGRATION

Tu vas exécuter les phases ci-dessous DANS L'ORDRE. À la fin de chaque phase, tu produis un
rapport de complétion (fichiers créés/modifiés, tests passés, points d'attention) et tu attends
ma confirmation avant la phase suivante.

## PHASE 0 — Fork et bootstrap du repo (1 commit)

Objectif : créer le projet administration.ga comme fork local de gabon-diplomatie, sans toucher
au repo source.

1. Créer un nouveau répertoire frère :
   /Users/okatech/okatech-projects/Diplomatie Gabon/administration.ga/
   (note : on garde le chemin sous "Diplomatie Gabon/" pour cohérence workspace, mais le nom
   du projet et du repo git est bien "administration.ga")

2. Copier tout le contenu de gabon-diplomatie SAUF :
   - node_modules/, .turbo/, .convex/, .next/, dist/, build/
   - .env.local (à régénérer)
   - bun.lock (sera régénéré)
   - logs.txt, convex_logs.txt, next_logs.txt, turbo_logs.txt
   - tmp/, scripts de test ponctuels

3. Renommer dans package.json racine : "gabon-diplomatie" → "administration-ga"

4. Initialiser un nouveau git :
   - git init
   - .gitignore identique
   - premier commit "feat: bootstrap administration.ga from gabon-diplomatie"

5. Créer le fichier CLAUDE.md du nouveau projet (basé sur celui de gabon-diplomatie) en
   adaptant : nom du projet, mapping des domaines, références aux administrations au lieu
   des représentations.

Critères de succès :
- bun install passe sans erreur
- bun run typecheck passe sans erreur
- aucune référence au chemin gabon-diplomatie/ ne subsiste dans les fichiers source

## PHASE 1 — Modèle organisationnel étendu (Convex)

Objectif : étendre le schéma orgs pour supporter la taxonomie complète des administrations
gabonaises définie dans le document de référence sur la 5e République.

Fichiers concernés :
- convex/lib/validators.ts (orgTypeValidator, ministrySubTypeValidator)
- convex/schemas/orgs.ts
- convex/lib/moduleCodes.ts

Actions :

1. Étendre orgTypeValidator avec les valeurs administratives :
   - "presidency" (Présidence de la République)
   - "vice_presidency" (Vice-Présidence)
   - "government" (Vice-Présidence du Gouvernement)
   - "ministry" (existe déjà — Ministère)
   - "delegated_ministry" (Ministère délégué)
   - "directorate_general" (Direction Générale)
   - "public_establishment" (Établissement public)
   - "national_agency" (Agence nationale)
   - "independent_authority" (Autorité administrative indépendante — AAI)
   - "parliament_chamber" (Assemblée nationale / Sénat)
   - "supreme_court" (Cour de cassation / Conseil d'État / Cour des comptes / Cour constitutionnelle)
   - "consultative_institution" (CESEC, Médiateur, CNDH)
   - "local_authority" (Gouvernorat, Préfecture, Mairie)
   - et CONSERVER : "embassy", "consulate", "consulate_general", "permanent_mission"
     (pour interopérabilité avec gabon-diplomatie sur les Affaires étrangères)

2. Étendre ministrySubTypeValidator pour couvrir tous les portefeuilles 2026 :
   - economy_finance, foreign_affairs, justice, interior_security, defense, education_national,
     higher_education, health, agriculture, fisheries_blue_economy, waters_forests_environment,
     petroleum_gas, mines_geology, transport_marine, public_works_construction,
     housing_urbanism_cadastre, industry_local_transformation, commerce_pme,
     digital_economy_innovation, civil_service_capacity, labor_employment_dialogue,
     social_affairs_childhood_women, youth_sports_culture_arts, sustainable_tourism_crafts,
     communication_media, planning_prospective, reform_institutions_relations,
     water_energy_access

3. Ajouter le champ tutelleLevel (nombre indiquant le niveau hiérarchique : 0 = souverain,
   1 = ministère, 2 = direction générale / établissement, 3 = service) pour faciliter
   les requêtes de hiérarchie.

4. Étendre moduleCodes pour ajouter les modules absents de la spec :
   - iAsted, iDocument, iArchive, iCorrespondance, iBoîte, iAgenda, iCom
   (vérifier ce qui existe déjà, n'ajouter que les manquants)

5. Créer une migration Convex idempotente qui :
   - ne casse aucune donnée existante
   - ajoute les nouveaux types à la liste autorisée
   - pose tutelleLevel par défaut sur les orgs existantes

Critères de succès :
- bun run dev:convex démarre sans erreur de schéma
- les tests existants (convex/tests/) passent toujours
- une nouvelle requête getOrgsByTutelle(parentOrgId) retourne la hiérarchie

## PHASE 2 — Seeds : peupler la 5e République

Objectif : créer un dataset de seed complet pour le développement, reflétant la composition
réelle du gouvernement Oligui Nguema II (1er janvier 2026).

Fichiers à créer :
- convex/seeds/administration_network_dev.ts
- convex/seeds/seedMinistries.ts
- convex/seeds/seedDirectionsGenerales.ts
- convex/seeds/seedEtablissementsPublics.ts
- convex/seeds/seedInstitutionsSouveraines.ts
- convex/seeds/seedAAI.ts

Sources :
- ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md (référentiel exhaustif)

Pour chaque entité :
- slug stable (ex: "min-eco-finances", "dgi", "anpn", "cesec")
- name + nameI18n (français source, ajouter "en" si pertinent pour les institutions
  internationales)
- type + ministrySubType si applicable
- parentOrgId pour les DG/établissements rattachés à un ministère
- tutelleLevel cohérent
- branding.flag = "GA" (drapeau gabonais)
- adresses des sièges (Libreville en grande majorité)
- modules pré-activés selon le type :
  - Souverain (Présidence, Parlement) : iAsted, iDocument, iArchive, iCorrespondance, iCom
  - Ministère : tous les modules
  - DG / Établissement : iDocument, iCorrespondance, iBoîte, iAgenda, iCom
  - AAI : iDocument, iCorrespondance, iCom

À PEUPLER (extraits attendus, liste exhaustive dans le doc de référence) :
- 1 Présidence + 1 Vice-Présidence
- 3 Ministres d'État + 26 Ministres + 1 Ministre délégué (29 ministères au total)
- Pour CHAQUE ministère : 3 à 8 Directions Générales nominatives (DGI, DGDDI, DGBFiP, DGTCP,
  DGE, DGRH, DGMG, DGF, DGFAP, DGAP, DGAJ, ANINF, ANPI, ANAC, OPRAG, ONSFAG, SOGATRA, etc.)
- Pour CHAQUE ministère : 1 à 5 établissements/agences sous tutelle (GOC, SOGARA, SEEG,
  CHUL, CENAREST + ses 5 instituts, ANPN, AGASA, ONADER, CNAMGS, CNSS, etc.)
- 2 chambres parlementaires (Assemblée nationale 145 députés, Sénat 70 sénateurs)
- 4 juridictions suprêmes
- CESEC, Médiateur de la République, CNDH
- AAI : HAC, CGE, ARCEP, ARSEE, CNPDCP, ARTF

Volumétrie cible MVP : ~150 à 200 organisations seed.

Critères de succès :
- bun convex run seeds:administration_network_dev peuple la base sans erreur
- la requête getOrgHierarchy("min-eco-finances") retourne le ministère + ses DG + ses
  établissements
- un dashboard de comptage affiche : X ministères, Y DG, Z établissements, etc.

## PHASE 3 — Renommage et rebranding des apps

Objectif : adapter chaque app à sa nouvelle identité de domaine.

### 3.1 apps/agent-web → administration.ga

- Renommer en interne (commentaires, titres, meta) toute mention "diplomate" / "diplomatie"
  par "administration" / "agent administratif"
- Mettre à jour app/layout.tsx : title, description, meta og, manifest, icônes
- Adapter les libellés UI : "Mon espace diplomate" → "Mon espace agent",
  "Ma représentation" → "Mon administration"
- Conserver l'esthétique neumorphique et la palette du DESIGN_CHARTER.md
- Mettre à jour les routes : si /diplomatic/* existent, créer /admin/* ou /administration/*
  en gardant des redirects

### 3.2 apps/backoffice-web → admin.administration.ga

- Mettre à jour app/layout.tsx pour refléter "Backoffice administration.ga"
- Adapter le menu principal : sections "Administrations" (ex-Représentations), "Démarches",
  "Utilisateurs", "Modules", "Audit", "Paramètres"
- Conserver toute la logique de gestion multi-tenant

### 3.3 apps/citizen-web → demarche.ga

- Renommer toutes les mentions "Mon espace consulaire" → "Mes démarches"
- Adapter la home : "Réalisez vos démarches administratives en ligne"
- Réutiliser le composant AddressWithAutocomplete (Controller react-hook-form) pour les
  adresses gabonaises (provinces, départements, communes)
- Garder l'inscription progressive (NIP + email + téléphone)
- Mettre à jour les routes : /demarches/* (équivalent de /services/*)

### 3.4 Variables d'environnement

Créer .env.example mis à jour :
- NEXT_PUBLIC_APP_NAME="ADMINISTRATION.GA" (par app)
- NEXT_PUBLIC_DOMAIN_CITIZEN="demarche.ga"
- NEXT_PUBLIC_DOMAIN_AGENT="administration.ga"
- NEXT_PUBLIC_DOMAIN_ADMIN="admin.administration.ga"

Critères de succès :
- Les 3 apps démarrent (bun run dev:citizen-web / dev:agent-web / dev:backoffice-web)
- Aucune chaîne hardcodée "consulat" ou "diplomatie" dans les vues utilisateur (sauf
  références techniques internes ou interopérabilité MAE)
- Les écrans d'accueil portent bien la nouvelle identité

## PHASE 4 — Adapter iCorrespondance au contexte administratif

Objectif : iCorrespondance est déjà conçu comme module universel (cf. spec fonctionnelle).
Il faut adapter la configuration des types de démarche et l'organigramme de résolution
des destinataires.

Fichiers concernés :
- convex/schemas/correspondance.ts
- convex/functions/correspondance/*.ts
- packages/agent-features/correspondance/*
- packages/ui/components/correspondance/* (si existe)

Actions :

1. Étendre TypeDemarche avec des modèles administratifs types :
   - "ADM-CNI" : Demande de Carte Nationale d'Identité (parcours Citoyen → Mairie →
     Préfecture → DGDI → Mairie)
   - "ADM-PASSPORT" : Demande de passeport (Citoyen → DGDI → Imprimerie nationale → DGDI)
   - "ADM-EXTRAIT-NAISSANCE" : Extrait de naissance (Citoyen → Mairie de naissance)
   - "ADM-CASIER-JUDICIAIRE" : Casier judiciaire (Citoyen → Greffe → Ministère Justice)
   - "ADM-PERMIS-CONDUIRE" : Permis de conduire (Citoyen → DGTT → Préfecture)
   - "ADM-NATIONALITE" : Demande de nationalité (parcours déjà décrit dans la spec)
   - "ADM-AUTORISATION-COMMERCE" : Autorisation d'exercice (Entreprise → Commerce → DGI)
   - "ADM-AGREMENT-FISCAL" : Agrément fiscal (Entreprise → DGI → Direction Économie)

2. Schémas de référence administratifs :
   - "DEM/2026/[CODE-ADM]/[SEQ]" pour les démarches
   - "ADM/2026/[INST]/[SEQ]" pour la correspondance interne
   - "INST/2026/[EMET]-[DEST]/[SEQ]" pour les échanges inter-institutions

3. Résolution annuaire :
   - Un envoi à "Le Directeur Général de la DGI" doit résoudre vers le titulaire courant
   - Implémenter resolveRecipient(orgSlug, roleSlug) qui interroge l'organigramme

4. Conserver tout le moteur de workflow, copies en lecture seule, audit immuable.

Critères de succès :
- Création d'un dossier ADM-CNI depuis citizen-web fonctionne bout en bout
- Le dossier transite Citoyen → Mairie → Préfecture → DGDI selon le parcours
- Les copies "COPIE — Passage le [date]" sont posées à chaque transit
- Journal d'audit visible côté backoffice-web

## PHASE 5 — Modules iDocument, iArchive, iBoîte, iAgenda, iCom

Objectif : si ces modules existent déjà côté gabon-diplomatie, les conserver tels quels
(ils sont génériques). Sinon, créer les MVP selon les spécifications du document
PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md (section 6).

Actions :

1. Auditer ce qui existe dans convex/ et packages/ pour chaque module
2. Pour chaque module manquant ou incomplet, créer le MVP minimal :
   - Schema Convex
   - Mutations / queries de base
   - Composants UI dans packages/ui/components/[module]/
   - Pages dans chaque app (selon les droits)
3. Brancher l'activation par institution (champ activeModules sur orgs)
4. Ajouter le Catalogue National des Modules dans backoffice-web (Admin Système)

## PHASE 6 — iAsted Mode Administration

Objectif : adapter le prompt système iAsted (assistant vocal) au contexte administratif.

Fichiers concernés :
- convex/ai/iastedRealtimePrompt.ts
- convex/ai/realtimeTools.ts
- convex/ai/realtimeToolExecutor.ts

Actions :

1. Dupliquer le prompt système et créer un mode "administration" qui :
   - Connaît les 31 ministères et leurs DG (charger le référentiel)
   - Sait orienter un citoyen vers la bonne administration ("Pour un extrait de naissance,
     adressez-vous à la mairie de votre lieu de naissance")
   - Sait composer des correspondances administratives respectant le formalisme
   - Sait initier une démarche administrative (création de dossier iCorrespondance)

2. Ajouter les business tools administratifs :
   - find_administration(query) : trouve une administration par nom/compétence
   - initiate_demarche(typeCode, citizenId) : crée un dossier
   - resolve_official(orgSlug, role) : récupère le titulaire d'un poste
   - transmit_dossier(dossierId, nextStepId) : transmet à l'étape suivante avec
     double confirmation orale

3. Respecter les variables d'environnement IASTED_AB_FORCE_MODEL / IASTED_AB_PERCENT_FULL /
   IASTED_VAD_MODE déjà documentées dans gabon-diplomatie/CLAUDE.md

## PHASE 7 — Interconnexion souveraine (canaux officiels)

Objectif : implémenter les canaux d'échange entre institutions définis dans la spec.

Canaux MVP :
- Présidence ↔ Vice-Présidence du Gouvernement
- Présidence ↔ Assemblée nationale
- Présidence ↔ Sénat
- Vice-Présidence Gouvernement ↔ Ministères
- Ministère ↔ Directions générales (tutelle)

Pour chaque canal :
- accusé de réception automatique
- horodatage
- classification autorisée (public / interne / confidentiel / secret)
- traçabilité complète

## PHASE 8 — Routes, déploiement, CI/CD

1. Mettre à jour le routing Next.js pour chaque app
2. Adapter packages/routing si nécessaire
3. Créer .github/workflows/deploy-administration-ga.yml
4. Configurer les secrets : CONVEX_DEPLOY_KEY, BETTER_AUTH_SECRET, RESEND_API_KEY,
   LIVEKIT_API_KEY, LIVEKIT_API_SECRET, OPENAI_API_KEY
5. Domaines Vercel (ou autre) : administration.ga, admin.administration.ga, demarche.ga
6. Configurer un sous-domaine sandbox : staging.administration.ga

## PHASE 9 — Documentation et conduite du changement

1. Mettre à jour README.md à la racine
2. Créer docs/ARCHITECTURE.md (vue d'ensemble)
3. Créer docs/MIGRATION_FROM_DIPLOMATIE.md (pour les développeurs venant de gabon-diplomatie)
4. Créer docs/REFERENTIEL_INSTITUTIONS.md (importer le document 5e République)
5. Créer docs/GOUVERNANCE.md (Admin Système vs Admin Institution)
6. Mettre à jour CLAUDE.md du projet

# CONVENTIONS À RESPECTER ABSOLUMENT

- Code en anglais (variables, fonctions, types, fichiers)
- Commentaires en français
- UI en français (ou clé i18n si configuré, JAMAIS de fallback)
- TypeScript strict, jamais de `any` non justifié
- Fichiers : kebab-case ; composants React : PascalCase
- Named exports préférés
- Tailwind CSS, jamais de CSS inline si Tailwind suffit
- Shadcn/UI : JAMAIS modifier components/ui/, créer des wrappers dans components/shared/
  ou components/custom/
- React Hook Form + Zod pour TOUS les formulaires
- sonner pour les toasts, lucide-react pour les icônes
- Convex customFunctions : TOUJOURS depuis lib/customFunctions.ts (authQuery/authMutation/
  authAction), JAMAIS depuis convex/_generated/server directement
- Design System : palette achromatique 6 gris + 4 accents, couleurs Gabon vert/jaune/bleu
  pour décoratif uniquement, ombres achromatiques, neumorphisme Soft UI

# PROTOCOLE D'EXÉCUTION

1. À chaque phase, tu LIS d'abord les fichiers concernés avant d'écrire
2. Tu produis des commits Git ATOMIQUES par phase, message Conventional Commits :
   - feat(orgs): extend org types for administrative entities
   - feat(seeds): seed 5e République ministries and directorates
   - refactor(citizen-web): rebrand to demarche.ga
3. Tu n'invents JAMAIS un titulaire, un libellé officiel ou une compétence administrative
   sans le vérifier dans le référentiel 5e-Republique-Gabon-Institutions.md
4. Tu testes (typecheck + lint + tests unitaires) après chaque phase et tu reportes
5. Si un choix d'architecture mérite arbitrage, tu poses la question avant d'agir
6. Tu n'effaces RIEN dans gabon-diplomatie source — tu travailles sur la copie

# COMMENCE PAR LA PHASE 0

Démarre maintenant en lisant les 5 documents de référence cités ci-dessus, puis en exécutant
la PHASE 0 (Fork et bootstrap). Produis un rapport de complétion en fin de phase et attends
ma confirmation pour la PHASE 1.
```

---

## VARIANTE COURTE — Pour itération rapide en mode "modification in-place"

Si tu préfères ne PAS forker mais transformer `gabon-diplomatie` directement en `administration.ga` :

```
Tu es l'architecte senior chargé de transformer le monorepo gabon-diplomatie en administration.ga.
La transformation est in-place (pas de fork) : tu travailles directement dans le repo actuel
mais tu renommes, étends et adaptes le code pour servir le nouveau périmètre administratif
décrit dans /Users/okatech/okatech-projects/Diplomatie Gabon/gabon-diplomatie/ADMINISTRATION.GA/
PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md.

CONSERVE la compatibilité avec le périmètre diplomatique existant (Ministère des Affaires
Étrangères, ambassades, consulats) — ils deviennent UN SOUS-ENSEMBLE du nouveau système plus
large. Le projet supporte les DEUX univers : administrations nationales (administration.ga,
admin.administration.ga, demarche.ga) ET représentations diplomatiques (diplomate.ga,
admin.consulat.ga, consulat.ga).

Approche :
1. Renomme le repo : git mv n'est pas nécessaire, mais update package.json et tous les liens.
2. Étends le schéma orgs pour supporter les nouveaux types administratifs (cf. PHASE 1
   du prompt complet).
3. Peuple les seeds avec les 31 ministères + DG + AAI de la 5e République (cf. PHASE 2).
4. Crée des routes parallèles dans chaque app : /diplomatie/* (existant) et /administration/*
   (nouveau).
5. Crée trois nouvelles "skins" de domaine : la même app peut servir administration.ga OU
   diplomate.ga selon NEXT_PUBLIC_DOMAIN_MODE=administration|diplomatie.
6. Adapte iCorrespondance avec les types de démarche administratifs (cf. PHASE 4).
7. Conserve l'esthétique neumorphique et tous les patterns existants.

Référentiel exhaustif des institutions : 5e-Republique-Gabon-Institutions.md (à lire en premier).
```

---

## ANNEXE — Fichiers de référence à fournir à Claude Code

Lors du lancement, joins ces 5 fichiers en upload :

1. `5e-Republique-Gabon-Institutions.md` — référentiel des 31 ministères + DG + AAI
2. `iCorrespondance-Specification-Fonctionnelle.md` — spec du module iCorrespondance
3. `PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md` — vision cible globale
4. `gabon-diplomatie/CLAUDE.md` — conventions et patterns OkaTech
5. `gabon-diplomatie/DESIGN_CHARTER.md` — charte graphique neumorphique

---

## DÉCISIONS PRÉALABLES À VALIDER AVANT DE LANCER LE PROMPT

Avant de coller le prompt dans Claude Code, tranche ces 5 questions :

| Question | Recommandation par défaut |
|---|---|
| Fork séparé ou modification in-place ? | **Fork séparé** (préserve l'historique de gabon-diplomatie comme référence) |
| Conserver le support du périmètre diplomatique ? | Oui (sous-ensemble du périmètre administratif, MAE = un ministère parmi 29) |
| Backend Convex partagé ou séparé ? | **Séparé** (un projet Convex par projet pour isolation prod) |
| Auth partagée (SSO) ou indépendante ? | Indépendante au MVP, SSO national en Phase 3 |
| Déploiement initial : Vercel ou OVH/VPS ? | **Vercel** pour MVP (déjà la stack gabon-diplomatie) |

---

*Document généré pour ADMINISTRATION.GA — 20 mai 2026*
*À utiliser avec Claude Code positionné à la racine du monorepo*
