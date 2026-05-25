# `apps/pnpe` — Portail PNPE (Pôle National de Promotion de l'Emploi)

Ce fichier complète le `CLAUDE.md` racine du monorepo `administration.ga`. Il
documente la verticale **Emploi** : ce qui est spécifique au PNPE par rapport
à `apps/administration_ga` (espace agent générique).

## Identité

| Attribut | Valeur |
|---|---|
| Nom du package | `pnpe-gabon` |
| Port dev | `3008` |
| URL prod cible | `emploi.administration.ga` (alias `pnpe.ga` → redirection) |
| Public cible | Demandeurs d'emploi (D.E), employeurs, conseillers PNPE, chefs d'antenne, direction PNPE, formateurs Auto-Emploi, admin Ministère du Travail |
| Pendant côté usager | `apps/demarche_ga` (démarches administratives génériques pour citoyens) |
| Verticales parallèles | `apps/ministere_ga`, `apps/direction_ga`, `apps/mairie_ga`, `apps/administration_ga` |

Le socle technique (Next.js 16 + Convex + Better Auth + LiveKit + Tiptap) est
**identique** aux autres apps du monorepo. La verticalisation porte sur le
rebranding visible (landing, métadonnées), les rôles métiers PNPE, les modules
métier emploi (offres, candidatures, contrats), et les intégrations DGI/CNSS/
Twilio/Ediandza/ANPI.

## Référentiel métier PNPE

### Identité institutionnelle

- **Mission** : opérateur public gabonais de l'emploi (équivalent gabonais
  de Pôle Emploi / France Travail). Héritier de l'Office National de
  l'Emploi (ONE).
- **Tutelle** : Ministère du Travail, du Plein Emploi, du Dialogue Social
  et de la Formation Professionnelle.
- **Partenaire technique** : ANINF (protocole d'accord du 17 février 2025).
- **Direction générale** : M. Anicet EDZANG (DG en exercice).

### Trois programmes

1. **Emploi Salarié** — mise en correspondance demandeurs ↔ employeurs
   (CDI, CDD, intérim, stage, alternance).
2. **Auto-Emploi** — accompagnement entrepreneurial avec formation Business
   Model Canvas (BMC), passerelle vers ANPI-Gabon pour la formalisation.
3. **Formation professionnelle et apprentissage** — suivi des contrats
   d'apprentissage, de professionnalisation, d'adaptation et d'insertion.

### Sept antennes régionales

| Province | Ville | Statut |
|---|---|---|
| Estuaire | Libreville | Siège |
| Haut-Ogooué | Franceville | Opérationnelle |
| Moyen-Ogooué | Lambaréné | Ouverture février 2026 |
| Ogooué-Lolo | Koulamoutou | Opérationnelle |
| Ogooué-Maritime | Port-Gentil | Opérationnelle |
| Nyanga | Tchibanga | Opérationnelle |
| Woleu-Ntem | Oyem | Opérationnelle |

**Provinces non encore couvertes** (à anticiper) : Ngounié, Ogooué-Ivindo.

## Rôles PNPE

Les sept rôles métier PNPE seront déclarés en Phase 7 dans le
`memberRoleValidator` (`convex/lib/validators.ts`) et dans l'enum
`MemberRole` (`convex/lib/constants.ts`).

1. `demandeur_emploi` — D.E inscrit, recherche emploi salarié ou auto-emploi
2. `employeur` — représentant RH d'une entreprise immatriculée
3. `conseiller_pnpe` — agent PNPE (accueil, validation, accompagnement)
4. `chef_antenne_pnpe` — pilote une antenne provinciale
5. `direction_pnpe` — Direction générale PNPE (Libreville)
6. `formateur_auto_emploi` — anime les sessions BMC
7. `admin_ministere_travail` — tutelle ministérielle

Le helper de rôle dédié sera créé en Phase 7 dans
`src/lib/pnpe/roles.ts` (pattern identique à l'ancien `src/lib/direction/`
des Directions Générales : `isStaffRole`, `isUserRole`,
`getHierarchyLevel`, `canManageMember`, `getRoleLabel`).

## Type d'organisation : `public_establishment`

Le PNPE est représenté par `OrganizationType.PublicEstablishment` dans
`convex/lib/constants.ts`. Le seed canonique vit dans
`convex/seeds/seedEtablissementsPublics.ts` :

```
slug: "pnpe"
name: "Pôle National de Promotion de l'Emploi"
parentSlug: "min-travail"
tutelleLevel: 2
```

⚠️ **Migration historique** : avant la Phase 1 de la digitalisation, le PNPE
était seedé sous `slug: "one"` rattaché à `min-fonction-publique`. La
correction est gérée par une migration idempotente dans
`convex/migrations/` (renomme `one → pnpe`, déplace le `parentOrgId` vers
`min-travail`).

## Architecture cible des routes (App Router)

```
apps/pnpe/src/app/
  (public)/        → landing + offres publiques + annuaire antennes (pas d'auth)
  (demandeur)/     → espace D.E (auth, rôle demandeur_emploi)
  (employeur)/     → espace entreprise (auth, rôle employeur)
  (auto-emploi)/   → parcours BMC (D.E inscrits au programme)
  (conseiller)/    → file d'attente + portefeuille (rôles conseiller, chef d'antenne, direction)
  (app)/           → routes génériques héritées (settings, profil, iAsted, etc.)
```

Le middleware racine (`apps/pnpe/middleware.ts`) route selon le rôle stocké
dans la session Better Auth :
- `demandeur_emploi` → `/(demandeur)/profil`
- `employeur` → `/(employeur)/tableau-de-bord`
- `conseiller_pnpe` / `chef_antenne_pnpe` / `direction_pnpe` → `/(conseiller)/file-d-attente`

## Tables Convex emploi (Phase 1)

Sous `convex/schemas/pnpe/` (un fichier par domaine) :

- `demandeursEmploi` — profil candidat (NIP, état civil, formation,
  expérience, compétences, CV via `_storage`, antenne rattachée)
- `employeurs` — entreprise (raison sociale, NIF, RCCM, secteur NAF,
  taille, représentant, statut vérification, documents)
- `offresEmploi` — annonce (poste, missions, profil, contrat, salaire,
  localisation, statut workflow)
- `candidatures` — lien D.E ↔ offre (CV joint, lettre, statut, historique,
  notes employeur/conseiller, issue finale)
- `antennesPnpe` — implantations territoriales (province, ville, adresse,
  chef d'antenne, conseillers, horaires)
- `contratsSuivi` — apprentissage / professionnalisation / insertion
  (parties, dates, visites de suivi, bilan)
- `programmesAutoEmploi` — inscription au parcours BMC (étape, projet,
  mentor, businessPlan storageId, lien Ediandza/ANPI)
- `bilanCompetences` — évaluation conseiller

**Validators dédiés** dans `convex/lib/validators/pnpe.ts` :
`codeProvinceGaValidator`, `codeNAFGabonValidator`, `typeContratValidator`,
`niveauEtudesValidator`, `statutDemandeurValidator`,
`statutOffreValidator`, `statutCandidatureValidator`,
`verificationEmployeurValidator`, `programmeTypeValidator`.

## Workflows métier critiques

### Inscription Demandeur d'Emploi

```
1. Inscription en ligne (NIP + identité + contact)
2. Création du compte (statut "brouillon")
3. Renseignement du profil (formation, expérience, compétences, CV)
4. Soumission (statut "en_validation")
5. Validation par un conseiller PNPE (visite agence OU contact WhatsApp/téléphone)
6. Activation du compte (statut "actif")
7. Accès au catalogue d'offres + candidatures
```

### Publication d'offre d'emploi

```
1. Connexion entreprise (compte avec statut "verifie")
2. Rédaction (statut "brouillon")
3. Soumission (statut "en_validation")
4. Validation par un conseiller PNPE (statut "publiee")
5. Réception et tri des candidatures
6. Marquage "pourvu" par employeur après embauche → notification statistique
7. Expiration auto à dateExpiration (statut "expiree")
```

### Programme Auto-Emploi

```
1. Demandeur s'inscrit au programme
2. Conseiller évalue le projet
3. Inscription en formation BMC (présentiel agence OU en ligne via Ediandza)
4. Élaboration du business plan simplifié dans l'éditeur Tiptap (template BMC 9 blocs)
5. Mise en relation avec ANPI-Gabon pour formalisation
6. Suivi post-installation par le conseiller
```

### Suivi d'un contrat d'apprentissage

```
1. Enregistrement du contrat (apprenti + maître d'apprentissage + entreprise)
2. Suivi des échéances (durée, rémunération, formation théorique)
3. Visites de suivi par le conseiller (3 minimum)
4. Bilan de fin de contrat
5. Aide à l'insertion post-apprentissage
```

## Intégrations externes (Phase 7)

- **DGI** — vérification fiscale des employeurs (API ou import CSV mensuel)
- **CNSS** — attestation de situation sociale
- **CNAMGS** — rattachement contrats à l'assurance maladie (futur)
- **ANPI-Gabon** — formalisation des projets auto-emploi
- **Ediandza** (`ediandza.ga`) — catalogue de formations professionnelles
- **ONE-Entreprendre** (`oneentreprendre.com`) — accompagnement à la création
- **Twilio** — SMS + WhatsApp Business (validation D.E, rappels RDV)
- **Resend** — emails transactionnels
- **LiveKit** — visio (entretiens employeur ↔ candidat, RDV conseiller ↔ D.E,
  sessions BMC distantes)
- **iAsted Mode Emploi** — agent vocal IA spécialisé emploi (4 business tools
  dédiés : `pnpe_match_candidates`, `pnpe_draft_job_offer`,
  `pnpe_suggest_trainings`, `pnpe_explain_labor_code`)

## Rebranding effectué (Phase 0)

- `package.json` : `direction-gabon` → `pnpe-gabon`, port `3006` → `3008`
- `src/app/layout.tsx` : titre `PNPE — Pôle National de Promotion de l'Emploi | République Gabonaise`
- `next.config.ts` : redirects `pnpe.ga` et `www.emploi.administration.ga`
  vers `emploi.administration.ga`, sourcemap project `pnpe-gabon`
- `Dockerfile` : `apps/direction.ga` → `apps/pnpe`
- `playwright.config.ts` + `tests/e2e/global-setup.ts` : baseURL
  `localhost:3008`
- `.env.example` : `NEXT_PUBLIC_APP_NAME=PNPE`,
  `NEXT_PUBLIC_DOMAIN_EMPLOI=emploi.administration.ga`, placeholders
  Twilio/Resend/DGI/CNSS/Ediandza/ANPI
- `src/components/landing/Navbar.tsx` : logo `DIRECTION.GA` → `PNPE.GA`
- `src/components/landing/Footer.tsx` : refonte complète (PNPE, tutelle
  Ministère du Travail, contact@pnpe.ga, mention partenariat ANINF)
- `src/components/landing/HeroSection.tsx` : aria-label `Portail PNPE`
- `src/components/landing/DownloadAppPopover.tsx` : `PNPE Agent — client
  natif pour poste de conseiller PNPE`
- Suppression : `src/lib/direction/` et `src/lib/data/directions-gabon.ts`
  (remplacés en Phase 1 par `src/lib/pnpe/`)

## Ce qui reste à faire (suite du plan)

- **Phase 1** : tables Convex emploi + correction du seed PNPE
  (`slug "one"` → `slug "pnpe"`)
- **Phase 2** : Espace Demandeur (`/inscription`, `/profil`, `/cv`,
  `/offres`, `/candidatures`, `/messages`, `/rendez-vous`, `/formation`)
- **Phase 3** : Espace Employeur (`/inscription`, `/verification`,
  `/offres`, `/candidatures`, `/vivier`, `/entretiens`)
- **Phase 4** : Programme Auto-Emploi (`/presentation`, `/formation BMC`,
  `/business-plan` Tiptap, `/mentorat`, `/financement`)
- **Phase 5** : Interface Conseiller (`(conseiller)/file-d-attente`,
  `/mes-demandeurs`, `/offres-a-valider`, `/prospection`, `/statistiques`)
- **Phase 6** : Backoffice PNPE (module `(backoffice)/pnpe/` dans
  `apps/admin_administration_ga` : dashboard, antennes, contrats,
  reporting Ministère du Travail)
- **Phase 7** : Intégrations (Better Auth + 7 rôles PNPE, DGI/CNSS,
  Resend/Twilio WhatsApp, LiveKit, iAsted Mode Emploi)
- **Phase 8** : Seeds (7 antennes, 50 D.E démo, 20 employeurs démo, 50
  offres, 100 candidatures, 5 sessions BMC, 10 contrats apprentissage)
- **Phase 9** : CI/CD Cloud Run (`.github/workflows/deploy-pnpe.yml`,
  service `pnpe-gabon`, domaine `emploi.administration.ga`)

## Design system

Aucune dérogation à la charte. La verticale **Emploi** utilise le même
`consulat-design-system` que les autres apps du monorepo :
- palette achromatique 6 gris + 4 accents (bleu, vert, amber, rose)
- couleurs Gabon (vert / jaune / bleu) en décoratif uniquement
- icônes lucide-react exclusivement
- composants Citizen Design System v3.0 (`FlatCard`, `PageHeader`,
  `SectionHeader`) via `@workspace/agent-features/components/my-space`

Cf. `DESIGN_CHARTER.md` à la racine du monorepo.

## Conventions critiques

- Code anglais, commentaires français, UI française
- TypeScript strict, jamais d'`any` non justifié
- kebab-case fichiers, PascalCase composants React, named exports
- Tailwind CSS, jamais de CSS inline si Tailwind suffit
- Shadcn/UI : JAMAIS modifier `components/ui/`, créer des wrappers
- React Hook Form + Zod pour TOUS les formulaires
- sonner pour toasts, lucide-react pour icônes
- Convex customFunctions : TOUJOURS `authMutation`/`authQuery` depuis
  `convex/lib/customFunctions.ts`
- Workflow Cloud Run : push sur branche `feat/pnpe-...` → PR → merge
  déclenche déploiement (pas de push direct sur `main`)
