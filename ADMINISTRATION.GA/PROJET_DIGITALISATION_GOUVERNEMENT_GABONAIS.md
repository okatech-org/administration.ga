# Projet de Digitalisation du Gouvernement Gabonais

> Version: 1.0  
> Date: 2 Mars 2026  
> Auteur: Okatech  
> Document: Cadrage + Architecture cible + Modules + Roadmap

---

## Table des matieres

1. [Presentation generale](#1-presentation-generale)
2. [Objectifs et principes](#2-objectifs-et-principes)
3. [Perimetre et acteurs](#3-perimetre-et-acteurs)
4. [Gouvernance et roles](#4-gouvernance-et-roles)
5. [Modele institutionnel (ministeres, directions, souverain)](#5-modele-institutionnel-ministeres-directions-souverain)
6. [Modules par defaut (iAsted, iDocument, iArchive, iCorrespondance, iBoite, iAgenda, iCom)](#6-modules-par-defaut-iasted-idocument-iarchive-icorrespondance-iboite-iagenda-icom)
7. [Socle technique (multi-institution, securite, audit)](#7-socle-technique-multi-institution-securite-audit)
8. [Interconnexion inter-institutions (Presidence, Assemblee, etc.)](#8-interconnexion-inter-institutions-presidence-assemblee-etc)
9. [Donnees, workflows et referentiels](#9-donnees-workflows-et-referentiels)
10. [Securite, confidentialite et conformite](#10-securite-confidentialite-et-conformite)
11. [Deploiement et exploitation](#11-deploiement-et-exploitation)
12. [Roadmap (MVP -> National)](#12-roadmap-mvp---national)
13. [Livrables](#13-livrables)
14. [Risques et mesures](#14-risques-et-mesures)
15. [Annexes](#15-annexes)

---

## 1. Presentation generale

Ce document decrit un **projet complet de digitalisation** du Gouvernement gabonais: un systeme de connexion et de collaboration entre:
- les ministeres et leurs directions (entites sous tutelle),
- les institutions souveraines (Presidence, Assemblee Nationale, Senat, Primature, etc.),
- et, par extension, les autres organismes publics.

Le systeme est construit autour d'un **socle commun** de fonctionnalites, implementees sous forme de **modules** activables par:
- un **Admin Systeme** (niveau national),
- et/ou un **Admin d'institution** (niveau institutionnel), selon les droits accordes.

---

## 2. Objectifs et principes

### 2.1 Objectifs

- **Standardiser** les outils et processus administratifs (courrier, documents, archives, agenda, communication).
- **Connecter** les institutions entre elles via des canaux officiels et securises.
- **Tracer** toutes les actions sensibles (audit), pour renforcer la responsabilite et la transparence.
- **Accelerer** les delais de traitement (circuits de validation numeriques).
- **Renforcer la souverainete numerique** (donnees, acces, gouvernance).

### 2.2 Principes directeurs

- **Multi-institution (multi-tenant)**: separation stricte des donnees par institution, avec partage controle.
- **Securite by design**: chiffrement, classification, moindre privilege, journalisation.
- **Module-first**: toutes les capacites majeures sont des modules activables/desactivables.
- **Interoperabilite**: API-first, formats d'echange standardises, connecteurs.
- **Evolution par phases**: MVP operationnel puis extension progressive.

---

## 3. Perimetre et acteurs

### 3.1 Perimetre institutionnel (cible)

- Institutions souveraines: Presidence, Assemblee Nationale, Senat, Primature, etc.
- Ministeres: chaque ministere comme institution autonome.
- Directions: directions generales/cabinets/secretariats rattaches aux ministeres (tutelle).

### 3.2 Perimetre fonctionnel (noyau)

Le noyau est constitue des modules:
- iAsted
- iDocument
- iArchive
- iCorrespondance
- iBoite
- iAgenda
- iCom

### 3.3 Utilisateurs cibles

- Autorites et cabinets (presidence, primature, ministres, secretariats generaux).
- Directeurs / Chefs de service.
- Agents administratifs (traitement et suivi).
- Administrateurs techniques (systeme et institutions).

---

## 4. Gouvernance et roles

### 4.1 Admin Systeme (national)

Responsabilites:
- gerer le registre national des institutions (creation, statut, rattachements),
- publier et maintenir le **catalogue national des modules**,
- definir les politiques globales (ex: module autorise / interdit / verrouille),
- gouverner la securite: classification, retention, audit, acces inter-institutions,
- valider les integrations souveraines (canaux Presidence/Assemblee/etc.).

### 4.2 Admin Institution

Responsabilites:
- activer les modules **autorises** par le niveau systeme,
- gerer les utilisateurs et roles internes,
- parametrer les workflows locaux (circuits de validation, regles de diffusion),
- connecter les directions sous tutelle (delegation, heritage de politiques),
- gerer le cycle de vie des donnees locales (documents, archives, courrier).

### 4.3 Roles metier (exemples)

- Cabinet / Autorite: consultation, arbitrage, validation finale, diffusion.
- Secretaire general: coordination et supervision inter-directions.
- Directeur: pilotage d'une direction, validation, delegation.
- Chef de service: traitement et controle de qualite.
- Agent: saisie, classement, traitement quotidien.

---

## 5. Modele institutionnel (ministeres, directions, souverain)

### 5.1 Entites

- **Institution**: entite de niveau souverain ou ministeriel.
- **Direction**: entite rattachee a une institution (tutelle), avec autonomie limitee.

### 5.2 Tutelle (relation ministere -> directions)

Regles recommandees:
- Une direction appartient a un ministere (parent).
- Les politiques de securite et certains modules peuvent etre **herites** du ministere.
- Le ministere peut deleguer certaines actions (ex: validation de premier niveau), mais garde la supervision.

Exemples de flux:
- Creation d'un dossier (direction) -> validation (ministere) -> transmission (institution externe) -> archivage.

---

## 6. Modules par defaut (iAsted, iDocument, iArchive, iCorrespondance, iBoite, iAgenda, iCom)

### Regle commune: activation par module

Chaque module suit une double gouvernance:
1. Publication et regle globale (Admin Systeme): autorise/interdit/verrouille.
2. Activation locale (Admin Institution): active/desactive si autorise.

Etats par institution:
- `enabled`: module actif
- `disabled`: module inactif
- `locked`: impose ou bloque par Admin Systeme

### 6.1 iAsted (assistant IA)

But:
- assistance a la recherche, synthese, redaction, tri et orientation.

Minimum MVP:
- assistant par institution,
- base de connaissance (RAG) sur documents autorises,
- respect strict des permissions (aucun acces implicite).

### 6.2 iDocument (gestion documentaire)

But:
- creation, classement, versionning, validation, partage controle.

Minimum MVP:
- arborescence par institution/direction,
- versions + signatures/visa (optionnel phase 2),
- recherche + etiquettes + classification.

### 6.3 iArchive (archivage)

But:
- conservation long terme selon des regles de retention.

Minimum MVP:
- regler la retention par type de document,
- verrouillage (non alteration) des archives,
- pistes d'audit + export encadre.

### 6.4 iCorrespondance (courriers officiels)

But:
- gestion des courriers entrants/sortants, affectation, suivi, delais.

Minimum MVP:
- enregistrement (reference, emetteur, objet, classification),
- circuit affectation -> traitement -> validation -> transmission,
- integration pieces jointes (iDocument) et notifications (iBoite).

### 6.5 iBoite (messagerie institutionnelle)

But:
- inbox officielle: messages, notifications, accus de reception, alertes.

Minimum MVP:
- boites par role/unite,
- notifications de workflow (correspondance, documents),
- recherche et historisation.

### 6.6 iAgenda (agenda)

But:
- planification: reunions, convocations, echeances, rappels.

Minimum MVP:
- agenda par institution et par utilisateur,
- convocations + liste participants,
- synchronisation (optionnel) avec outils existants.

### 6.7 iCom (communication)

But:
- diffusion d'informations (notes, annonces, consignes) et coordination.

Minimum MVP:
- canaux de diffusion (institution, direction, projet),
- validation editoriale selon roles,
- suivi de lecture (optionnel).

---

## 7. Socle technique (multi-institution, securite, audit)

### 7.1 Capacites transverses (obligatoires)

- Identite et authentification (SSO national + federation possible).
- Autorisation: RBAC + regles par institution/direction.
- Journal d'audit: actions sensibles (lecture, partage, validation, export).
- Stockage securise des fichiers (pieces jointes, archives).
- Moteur de workflow (validation, delegation, SLA).
- Recherche (metadata + plein texte, selon droits).
- Notification (email/sms/push selon politique).
- API Gateway + integration (webhooks/event bus si besoin).

### 7.2 Multi-tenant

Objectif:
- isoler les donnees de chaque institution,
- permettre des partages controles (ex: correspondances officielles).

Implementation (conceptuelle):
- `tenant_id` sur toutes les donnees,
- regles de partage explicites (accords, canaux, destinataires),
- configurations par institution (modules, retention, classification).

---

## 8. Interconnexion inter-institutions (Presidence, Assemblee, etc.)

### 8.1 Canaux officiels

Mettre en place des **canaux d'echange** entre institutions, avec:
- regles de classification autorisees (ex: interne, confidentiel),
- traces (qui envoie, qui recoit, qui ouvre),
- accus de reception et horodatage.

Exemples de canaux:
- Presidence <-> Primature
- Presidence <-> Assemblee Nationale
- SGG <-> Ministeres

### 8.2 Regles de transmission

- Aucun partage automatique: tout transfert doit etre justifie et trace.
- Les pieces jointes suivent la classification la plus stricte du dossier.
- Les droits d'ouverture/traitement sont limites aux roles definis.

---

## 9. Donnees, workflows et referentiels

### 9.1 Referentiels minimum

- Referentiel institutions (souverain, ministere, direction, rattachements).
- Referentiel utilisateurs et roles (avec appartenance institution/direction).
- Referentiel modules (catalogue national + activation par institution).

### 9.2 Donnees metier minimum (MVP)

- Documents: metadata, versions, classification, proprietaire, acces.
- Correspondances: reference, sens (entrant/sortant), emetteur/destinataire, statut.
- Messages/notifications: fil, priorite, non-lu, rattachement au workflow.
- Agenda: evenements, participants, convocations.
- Audit: action, acteur, cible, horodatage, contexte.

### 9.3 Workflows (exemples)

Workflow "Courrier entrant":
1. Enregistrement et classification
2. Affectation (SG / Directeur / Chef)
3. Traitement (Agent)
4. Validation (Directeur/SG)
5. Reponse / Transmission
6. Archivage

Workflow "Document interne":
1. Redaction
2. Relecture
3. Validation
4. Publication/partage
5. Archivage selon retention

---

## 10. Securite, confidentialite et conformite

### 10.1 Exigences clefs

- Chiffrement en transit (TLS) et au repos.
- Segmentation des acces par institution/direction/role.
- Journalisation et alertes sur actions critiques (export, suppression, partage).
- Retention et archivage conformes aux regles nationales.
- Sauvegardes et PRA/PCA (continuites de service).

### 10.2 Classification (recommandee)

- public
- interne
- confidentiel
- secret

Chaque module doit appliquer la classification sur:
- affichage,
- partage,
- export,
- retention.

---

## 11. Deploiement et exploitation

### 11.1 Environnements

- Dev (integration continue)
- Test/Recette (validation metier + securite)
- Production (national)

### 11.2 Exploitation

- Supervision (logs, metriques, traces)
- Gestion des incidents et escalade
- Gestion des mises a jour (fenetres de maintenance)
- Tests de restauration (backups) periodiques

---

## 12. Roadmap (MVP -> National)

### Phase 0: cadrage

- validation perimetre institutionnel initial,
- definition des politiques (classification, retention, securite),
- definition des parcours utilisateurs et KPI.

### Phase 1: fondations (MVP technique)

- registre institutions + tutelles (ministeres/directions),
- RBAC + audit,
- catalogue des modules + activation (systeme + institutions).

### Phase 2: modules coeur (MVP metier)

- iDocument + iCorrespondance + iBoite,
- workflows standards,
- recherche + notifications.

### Phase 3: interconnexion souveraine

- canaux Presidence/Assemblee/Senat/Primature/SGG,
- signature/horodatage/accuses (si requis),
- renforcement securite et tracabilite.

### Phase 4: extension

- iAgenda + iCom,
- iAsted et base de connaissance par institution,
- onboarding progressif des autres institutions et directions.

---

## 13. Livrables

- Cadrage et architecture cible (ce document + schemas).
- Catalogue de modules (specifications fonctionnelles par module).
- Modele de donnees et specifications API.
- Prototype UI Admin Systeme + Admin Institution.
- MVP operationnel (Phase 1-2) avec audit.
- Playbooks exploitation (runbooks, PRA/PCA, sauvegardes).
- Plan de conduite du changement + formation.

---

## 14. Risques et mesures

- Adoption et conduite du changement:
  - mesures: formation, referents, communication, support.
- Qualite des donnees:
  - mesures: referentiels uniques, controles, migration par lots.
- Securite et fuites:
  - mesures: moindre privilege, audit, classification, tests, revues.
- Connectivite / performance:
  - mesures: optimisation, cache, mode degrade, CDN si pertinent.
- Fragmentation des outils:
  - mesures: socle commun + interop, decommission progressif.

---

## 15. Annexes

### 15.1 Glossaire

- Institution: entite souveraine ou ministerielle.
- Direction: entite sous tutelle d'une institution.
- Module: fonctionnalite activable (iDocument, iArchive, etc.).
- Multi-tenant: isolation des donnees par entite.
- RBAC/ABAC: controle d'acces par roles / attributs.

### 15.2 Fragments existants (sous-projets)

Dans le workspace, certains sous-projets peuvent servir de fragments/portails:
- `presidence.ga` (portail presidence)
- `parlement.ga` (portail parlement)
- `mairie.ga` (portails municipalites)
- `consulat.ga-core` (services consulaires)
- `pechegabon` (exemple ministere sectoriel)
- `sante` (exemple secteur sante)
- `iasted_organic` (socle assistant/plateforme)

Note: l'objectif est de **federer** ces fragments autour d'un socle commun (identite, modules, audit, canaux) sans bloquer l'evolution par institution.

### 15.3 Decisions a valider (liste courte)

- Identite: SSO national (oui/non) et schema de federation.
- Hebergement et souverainete des donnees.
- Niveau d'exigence signature/horodatage (Phase 2 ou Phase 3).
- Regles nationales de retention et archive (par type de document).
