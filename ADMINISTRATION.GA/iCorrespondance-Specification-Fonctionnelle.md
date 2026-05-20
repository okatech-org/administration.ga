# iCorrespondance — Spécification Fonctionnelle Complète

## Projet : gabon-diplomatie
## Version : 1.0 — Mars 2026
## Statut : Document de référence

---

## 1. Vision et Positionnement

### 1.1. Définition

iCorrespondance est le **module de gestion des dossiers administratifs et de la correspondance officielle** du projet gabon-diplomatie. Il ne se limite pas au courrier diplomatique : c'est un outil universel de **gestion de procédures administratives** qui organise le cheminement des dossiers entre administrations, services et usagers.

Un dossier dans iCorrespondance est une **entité vivante** qui se déplace d'organisme en organisme, de service en service, selon un parcours défini par la logique métier du type de démarche. Contrairement à un simple système de fichiers, le dossier ne reste pas en place — il transite, il est traité, puis il continue son chemin. L'organisme qui l'a traité ne conserve qu'une **copie en lecture seule**, marquée comme telle, pour l'historique.

### 1.2. Positionnement dans l'écosystème gabon-diplomatie

iCorrespondance se distingue des autres modules par sa vocation :

- **iCorrespondance** officialise les démarches. C'est l'outil des procédures administratives inscrites dans un cadre réglementaire. Chaque correspondance a une référence unique, un circuit de validation, des délais, des habilitations. Elle a valeur de preuve.
- **iBoîte** est l'outil de communication informelle ou semi-formelle entre collaborateurs. On peut y envoyer un rapport, une note interne, un message rapide. C'est le choix de l'expéditeur : officialiser via iCorrespondance ou communiquer via iBoîte.
- **iDocument** gère le stockage et l'organisation des documents (fichiers). Un document peut être attaché à une correspondance, mais il existe indépendamment.
- **iArchive** gère la conservation réglementaire. Une correspondance archivée y est transférée avec sa politique de rétention.

### 1.3. Principes fondamentaux

1. **Un dossier se déplace, il ne se duplique pas.** Quand un dossier quitte un organisme après traitement, seule une copie en lecture seule reste. Le dossier actif continue son parcours.
2. **Un dossier suit un parcours défini.** Le type de démarche détermine dans quelles administrations il doit passer et dans quel ordre.
3. **Les droits sont liés à la procédure, pas à la personne.** C'est le type de dossier et l'étape en cours qui déterminent qui peut lire, signer, valider, commenter, supprimer ou arrêter le processus.
4. **Tout est tracé.** Chaque action, chaque passage, chaque signature est horodaté et consigné dans un journal immuable.
5. **Un compte = un contact.** Chaque utilisateur du système est automatiquement un contact joignable. Chaque service est un groupe de contacts. L'annuaire est le système lui-même.

---

## 2. Concepts Métier

### 2.1. Le Dossier (Entité centrale)

Un dossier est un **conteneur de pièces** qui suit une procédure administrative définie. Il est créé par un émetteur (agent ou usager) et circule entre les organismes selon un parcours prédéfini.

**Attributs d'un dossier :**

- Référence unique (générée automatiquement selon un schéma configurable)
- Type de démarche (détermine le parcours et les règles)
- Émetteur (l'usager ou l'agent à l'origine de la procédure)
- Organisme porteur actuel (qui détient le dossier actif)
- Étape courante dans le parcours
- Statut global (en cours, en attente, complété, rejeté, suspendu, clôturé)
- Date de création, date limite, date de dernière action
- Priorité (normal, urgent, confidentiel)
- Liste des pièces constitutives

### 2.2. Le Schéma de Référence

Chaque dossier reçoit une référence unique dont le format est configurable selon le contexte :

- **Dossier diplomatique** : `NV/2026/GAB-FR/001` (type/année/axe/séquentiel)
- **Dossier administratif** : `ADM/2026/CONS-PAR/142` (type/année/organisme/séquentiel)
- **Dossier de démarche citoyenne** : `DEM/2026/NAT/007` (type/année/catégorie/séquentiel)

Le schéma est paramétrable par type de démarche. Les segments peuvent inclure : le type d'instrument, l'année, le code de l'organisme émetteur, le code de l'organisme destinataire, un axe géographique, un numéro séquentiel.

### 2.3. Les Pièces du Dossier

Un dossier contient un ensemble de **pièces** (documents) dont la composition est définie par le type de démarche.

Chaque pièce a :

- Un nom/intitulé (ex : "Extrait de naissance")
- Un statut : manquante, fournie, validée, rejetée, signée
- Un responsable : qui doit la fournir (usager, administration X, service Y)
- Un signataire : qui doit la signer/valider (un rôle, un service, une autorité)
- Un fichier attaché (lien vers iDocument)

**Exemple concret — Dossier de nationalisation :**

Un dossier de nationalisation contient 7 documents. Parmi eux, 2 doivent être signés par un ministère, 3 par différentes directions, 2 par une préfecture. Le dossier peut être complété par l'administration (qui ajoute les pièces de son ressort) et par l'usager (qui fournit ses justificatifs). Le parcours est : Usager → Consulat → Direction des Affaires Juridiques → Ministère de la Justice → Préfecture → Retour Consulat.

### 2.4. Le Parcours (Workflow)

Le parcours définit le **circuit du dossier** entre organismes et services. Il est déterminé par le type de démarche.

**Structure d'un parcours :**

Chaque étape du parcours définit :

- L'organisme/service destinataire
- Les actions attendues à cette étape (vérifier, signer, valider, compléter, émettre un avis)
- Les rôles autorisés (qui peut faire quoi à cette étape)
- La condition de passage à l'étape suivante (toutes les pièces signées, validation du responsable, etc.)
- Le délai attendu pour cette étape
- Les actions possibles : transmettre, renvoyer (si incomplet), suspendre, rejeter, clôturer

**Règle de passage :** Quand un organisme a terminé son traitement et transmet le dossier à l'étape suivante, le dossier actif quitte cet organisme. Il ne reste qu'une **copie en lecture seule** marquée "COPIE — Passage le [date]". Cette copie est non modifiable et sert uniquement d'historique. Les droits de copie et d'impression sur cette copie sont paramétrables (qui a l'autorité d'en faire une copie, d'imprimer, etc.).

### 2.5. La Correspondance (Communication formelle)

Au-delà des dossiers de procédure, iCorrespondance gère aussi la **correspondance simple** — c'est-à-dire l'envoi de courrier officiel sans nécessairement être lié à une procédure complexe :

- Envoi d'une lettre de demande spécifique
- Lettre officielle entre administrations
- Lettre officielle entre collaborateurs
- Rapport envoyé via la voie officielle
- Communication inscrite dans une procédure administrative

La correspondance simple partage le même système de référencement, de traçabilité et d'habilitations, mais ne nécessite pas un parcours multi-étapes. Elle peut être à sens unique (envoi sans attente de réponse) ou dialoguée (échange avec un délai de réponse attendu).

### 2.6. Les Délais

Les délais sont déterminés par deux sources :

- **Les paramètres du type de démarche** : chaque étape d'un parcours a un délai standard configurable (ex : "le ministère a 30 jours pour traiter cette étape").
- **L'émetteur** : lors de l'envoi d'une correspondance, l'émetteur peut indiquer le délai de réponse attendu en fonction du contexte. Par exemple, si l'émetteur écrit le 01/12 pour un événement prévu le 11/12, il attend une réponse avant le 11/12.

Le système suit ces délais, alerte en cas de retard (notification aux parties concernées) et peut escalader automatiquement selon les règles configurées.

### 2.7. L'Annuaire Intégré

iCorrespondance n'a pas besoin d'un annuaire externe. Le système est lui-même l'annuaire :

- **Un compte utilisateur = un contact.** Tout agent ou usager enregistré dans le système est joignable.
- **Un service = un groupe de contacts.** L'envoi à un service est routé vers le responsable du service (paramétrable).
- **Une administration = un accueil.** L'envoi à une administration arrive à son point d'entrée (secrétariat, accueil, bureau d'ordre).

La résolution des destinataires est intelligente : si la procédure cible "le responsable du service juridique du Consulat de Paris", le système résout automatiquement vers la bonne personne en fonction de l'organigramme enregistré.

---

## 3. Rôles et Habilitations

### 3.1. Rôles dans une procédure

Les droits ne sont pas globaux — ils sont **contextuels** et déterminés par le type de démarche et l'étape en cours :

- **Lecteur** : peut consulter le dossier et ses pièces (accès en lecture seule)
- **Contributeur** : peut ajouter ou modifier les pièces qui lui sont assignées
- **Validateur** : peut approuver ou rejeter une pièce ou une étape
- **Signataire** : peut apposer sa signature (électronique) sur une pièce
- **Transmetteur** : peut envoyer le dossier à l'étape suivante
- **Superviseur** : peut consulter tous les dossiers de son périmètre, émettre des commentaires
- **Administrateur de procédure** : peut arrêter le processus, suspendre, reprendre, modifier le parcours

### 3.2. Matrice des droits par étape

Pour chaque étape d'un parcours, la configuration définit :

| Action | Qui peut la faire |
|---|---|
| Lire le dossier | Rôles définis pour cette étape + superviseurs |
| Ajouter une pièce | Contributeurs assignés à cette étape |
| Signer une pièce | Signataires désignés pour cette pièce |
| Valider l'étape | Validateur de l'étape (responsable de service, directeur, etc.) |
| Émettre un commentaire | Tous les rôles de l'étape sauf lecteur simple |
| Transmettre à l'étape suivante | Transmetteur (en général le validateur après validation) |
| Renvoyer (incomplet) | Validateur de l'étape |
| Suspendre le dossier | Superviseur ou administrateur |
| Arrêter le processus | Administrateur de procédure uniquement |
| Faire une copie | Paramétrable par rôle et par étape |
| Imprimer | Paramétrable par rôle et par étape |

### 3.3. Confidentialité

Trois niveaux de confidentialité s'appliquent aux dossiers et correspondances :

- **Standard** : visible par tous les acteurs de la procédure
- **Confidentiel** : visible uniquement par les rôles explicitement autorisés
- **Secret** : accès restreint avec traçabilité renforcée de chaque consultation

---

## 4. Cycle de Vie d'un Dossier

### 4.1. Création

Un dossier est créé par un **émetteur** (agent ou usager). À la création :

1. Le type de démarche est sélectionné
2. Le système génère la référence unique
3. La liste des pièces requises est créée automatiquement (selon le type de démarche)
4. Le parcours est instancié (les étapes sont créées avec leurs organismes cibles)
5. Le dossier est placé à l'étape initiale

### 4.2. Constitution

L'émetteur et les contributeurs autorisés complètent le dossier :

- Ajout des pièces justificatives (upload de fichiers, lien vers iDocument)
- Renseignement des métadonnées
- Vérification de complétude (le système indique les pièces manquantes)

### 4.3. Transmission et Traitement

Le dossier est transmis à l'étape suivante. À chaque étape :

1. Le dossier arrive chez l'organisme/service désigné
2. Le responsable du service est notifié
3. Les acteurs de l'étape traitent le dossier (vérification, signature, validation)
4. Le validateur approuve et transmet — ou renvoie si le dossier est incomplet
5. À la transmission, le dossier quitte l'organisme actuel
6. Une copie en lecture seule reste, marquée "COPIE" avec la date de passage

### 4.4. Renvoi

Si un dossier est incomplet ou non conforme, le validateur peut le **renvoyer** à une étape précédente (souvent l'émetteur ou l'étape qui a fourni les pièces déficientes). Le renvoi est tracé avec le motif.

### 4.5. Suspension et Reprise

Un superviseur ou administrateur peut **suspendre** un dossier (en attente d'un événement externe, d'une décision, etc.). Le dossier reste dans son état actuel mais les délais sont gelés. La reprise relance les délais.

### 4.6. Clôture

Le dossier est clôturé quand :

- Toutes les étapes ont été complétées avec succès (clôture positive)
- Le dossier est rejeté définitivement (clôture négative)
- Le processus est arrêté par un administrateur (clôture administrative)

À la clôture, le dossier passe en lecture seule pour tous. Il peut être transféré vers iArchive selon la politique de rétention du type de démarche.

---

## 5. Fonctionnalités Détaillées

### 5.1. Gestion des Dossiers de Procédure

- Création de dossier avec sélection du type de démarche
- Constitution interactive : liste des pièces requises, statut de chaque pièce, assignation des responsables
- Visualisation du parcours : diagramme des étapes avec l'état d'avancement
- Transmission avec contrôle de complétude (le système bloque la transmission si des pièces obligatoires manquent)
- Historique complet : chaque action, chaque passage, chaque commentaire est tracé
- Copie après passage : copie en lecture seule marquée, paramétrable (droits de copie, d'impression)

### 5.2. Correspondance Simple

- Création de correspondance avec référence unique
- Types : lettre officielle, note de service, demande, rapport, communication administrative
- Envoi à un contact (personne), un service ou une administration
- Délai de réponse attendu (défini par l'émetteur selon le contexte)
- Suivi : envoyé, reçu, lu, répondu, archivé
- Pièces jointes (lien vers iDocument)

### 5.3. Recherche et Registre

- Registre chronologique (livre d'enregistrement) : entrant et sortant séparément
- Recherche par référence, par date, par émetteur, par destinataire, par type, par statut
- Filtres combinés : type de démarche + organisme + période + statut
- Recherche plein texte dans les titres, commentaires et métadonnées

### 5.4. Notifications et Alertes

- Notification à la réception d'un dossier ou d'une correspondance
- Alerte de délai : rappel avant échéance, alerte à l'échéance, escalade après dépassement
- Notification de signature requise
- Notification de renvoi (avec motif)
- Notification de clôture

### 5.5. Suivi et Tableaux de Bord

- Vue "Mes dossiers en cours" : dossiers où l'utilisateur a une action à faire
- Vue "Dossiers de mon service" : tous les dossiers en cours dans le service
- Vue "Suivi des délais" : dossiers en retard, dossiers proches de l'échéance
- Statistiques : nombre de dossiers traités, temps moyen de traitement, taux de renvoi

---

## 6. Architecture des Données

### 6.1. Entités principales

**DossierProcedure**
```
id                    : identifiant unique
reference             : string (référence unique générée)
typeDemarcheId        : référence vers TypeDemarche
emetteurId            : référence vers Utilisateur
emetteurType          : "agent" | "usager"
organismePorteurId    : référence vers Organisme (qui détient le dossier actif)
etapeCouranteId       : référence vers EtapeParcours
statut                : "brouillon" | "en_cours" | "en_attente" | "suspendu" | "cloture_positive" | "cloture_negative" | "cloture_administrative"
priorite              : "normal" | "urgent" | "confidentiel"
confidentialite       : "standard" | "confidentiel" | "secret"
dateCreation          : timestamp
dateLimite            : timestamp | null
dateDerniereAction    : timestamp
metadata              : Record<string, any>
```

**Correspondance** (correspondance simple, sans parcours multi-étapes)
```
id                    : identifiant unique
reference             : string
type                  : "lettre_officielle" | "note_service" | "demande" | "rapport" | "communication"
emetteurId            : référence vers Utilisateur
destinataireId        : référence vers Utilisateur | Service | Organisme
destinataireType      : "personne" | "service" | "organisme"
objet                 : string
contenu               : string (ou lien vers document)
statut                : "brouillon" | "envoye" | "recu" | "lu" | "repondu" | "archive"
priorite              : "normal" | "urgent" | "confidentiel"
dateEnvoi             : timestamp | null
dateReponseAttendue   : timestamp | null
piecesJointes         : référence[] vers Document (iDocument)
parentCorrespondanceId: référence | null (pour les réponses)
```

**TypeDemarche** (configuration)
```
id                    : identifiant unique
code                  : string (ex: "NAT", "VISA", "ETAT_CIVIL")
nom                   : string (ex: "Demande de nationalité")
description           : string
schemaReference       : string (modèle de génération de référence)
piecesRequises        : PieceRequise[] (liste des documents nécessaires)
parcours              : EtapeConfig[] (liste ordonnée des étapes)
delaiGlobal           : number (en jours) | null
organismeInitiateur   : référence vers Organisme
politiqueArchivage    : référence vers PolitiqueArchivage (lien iArchive)
actif                 : boolean
```

**PieceRequise** (dans un TypeDemarche)
```
nom                   : string (ex: "Extrait de naissance")
description           : string
obligatoire           : boolean
fournisseurType       : "usager" | "organisme" | "service"
fournisseurId         : référence | null (si organisme/service spécifique)
signataireRole        : string | null (ex: "directeur_juridique", "prefet")
signataireOrganismeId : référence | null
formatAccepte         : string[] (ex: ["pdf", "image"])
```

**EtapeParcours** (instance d'une étape dans un dossier actif)
```
id                    : identifiant unique
dossierId             : référence vers DossierProcedure
ordre                 : number
organismeId           : référence vers Organisme
serviceId             : référence vers Service | null
actionsAttendues      : string[] (ex: ["verifier", "signer", "valider"])
rolesAutorises        : RoleEtape[]
conditionPassage      : string (ex: "toutes_pieces_signees")
delaiJours            : number
statut                : "a_venir" | "en_cours" | "complete" | "renvoi" | "saute"
dateEntree            : timestamp | null
dateSortie            : timestamp | null
commentaires          : Commentaire[]
```

**CopiePassage** (copie en lecture seule après transit)
```
id                    : identifiant unique
dossierOriginalId     : référence vers DossierProcedure
organismeId           : référence vers Organisme (qui détient la copie)
etapeId               : référence vers EtapeParcours
datePassage           : timestamp
snapshotDossier       : JSON (état complet du dossier au moment du passage)
droitsCopie           : boolean (peut-on en faire une copie physique)
droitsImpression      : boolean (peut-on imprimer)
marque                : "COPIE — Passage le [date]"
```

**JournalAction** (audit trail immuable)
```
id                    : identifiant unique
dossierId             : référence vers DossierProcedure | Correspondance
utilisateurId         : référence vers Utilisateur
action                : string (ex: "creation", "transmission", "signature", "renvoi", "consultation", "impression")
detail                : string
horodatage            : timestamp
adresseIP             : string
```

### 6.2. Relations entre modules

```
iCorrespondance ──── pièces jointes ────→ iDocument (stockage fichiers)
iCorrespondance ──── archivage ─────────→ iArchive (conservation réglementaire)
iCorrespondance ──── notifications ─────→ iBoîte (alertes informelles)
iCorrespondance ──── contacts ──────────→ Annuaire système (comptes utilisateurs)
iCorrespondance ──── organigramme ──────→ Organismes / Services (structure)
```

---

## 7. Interfaces Utilisateur

### 7.1. Vue Agent (agent-web)

L'interface agent est organisée en dossiers et fichiers, suivant le design Finder de digitalium.io (dossiers jaunes macOS, cartes A4, 3 modes de vue).

**Dossiers principaux :**
- Mes dossiers en cours (dossiers où l'agent a une action à faire)
- Dossiers de mon service
- Correspondance envoyée
- Correspondance reçue
- Brouillons
- Archives (copies après passage)

**Actions disponibles :**
- Créer un dossier (sélection du type de démarche)
- Créer une correspondance simple
- Traiter un dossier (compléter, signer, valider, transmettre)
- Rechercher (par référence, date, type, destinataire)
- Consulter l'historique d'un dossier

### 7.2. Vue Administration (backoffice-web)

L'interface administration ajoute les fonctions de supervision :

- Configuration des types de démarche (parcours, pièces requises, délais)
- Configuration des schémas de référence
- Gestion des rôles et habilitations par type de procédure
- Tableaux de bord de suivi (délais, volumes, taux de renvoi)
- Gestion des escalades et des suspensions
- Audit trail complet

### 7.3. Vue Usager (citizen-web)

L'interface usager est simplifiée :

- Mes démarches en cours
- Initier une nouvelle démarche
- Compléter un dossier (ajouter mes pièces justificatives)
- Suivre l'avancement (visualisation simplifiée du parcours)
- Correspondance avec l'administration (messages liés à mes démarches)

---

## 8. Exemples de Parcours Types

### 8.1. Demande de visa diplomatique

```
Étape 1 : Agent consulaire → Créer le dossier, vérifier les pièces
Étape 2 : Chef de service consulaire → Valider la conformité
Étape 3 : Consul → Signer l'autorisation
Étape 4 : Agent consulaire → Délivrer le visa, clôturer
```

Pièces : formulaire de demande, photo, passeport (copie), note verbale de l'administration requérante, lettre d'invitation.

### 8.2. Dossier de nationalisation (complexe)

```
Étape 1 : Usager → Fournir les justificatifs (extrait de naissance, casier judiciaire, attestation de résidence)
Étape 2 : Consulat → Vérifier la complétude, ajouter l'avis consulaire
Étape 3 : Direction des Affaires Juridiques → Vérifier la conformité juridique, signer 2 pièces
Étape 4 : Ministère de la Justice → Instruire, signer 2 pièces
Étape 5 : Préfecture → Émettre l'arrêté, signer 2 pièces
Étape 6 : Consulat → Notifier l'usager, délivrer le certificat, clôturer
```

À chaque passage : le dossier actif quitte l'organisme, une copie en lecture seule reste.

### 8.3. Correspondance simple — Lettre officielle

```
Étape 1 : Agent → Rédiger (brouillon)
Étape 2 : Chef de service → Vérifier
Étape 3 : Consul/Ambassadeur → Signer
Étape 4 : Bureau d'ordre → Enregistrer et expédier
```

---

## 9. Règles Métier

1. **Aucun dossier ne peut être transmis sans référence unique enregistrée.**
2. **La transmission est bloquée si des pièces obligatoires sont manquantes** (sauf dérogation d'un administrateur).
3. **Un dossier transmis quitte l'organisme actuel.** Seule une copie en lecture seule reste.
4. **Les droits de copie et d'impression sont paramétrables** par type de dossier, par étape et par rôle.
5. **Les délais sont calculés** à partir de la date de réception à chaque étape. L'émetteur peut fixer un délai global.
6. **Un commentaire est immuable** une fois enregistré. On peut ajouter un commentaire correctif, pas modifier l'existant.
7. **La clôture est irréversible.** Un dossier clôturé ne peut pas être rouvert. Une nouvelle procédure doit être créée si nécessaire.
8. **L'envoi à un service est routé vers le responsable** du service selon l'organigramme. Si le responsable est absent, la règle de délégation s'applique.
9. **Toute consultation d'un dossier confidentiel ou secret est tracée** dans le journal d'audit.
10. **La correspondance simple peut être liée à un dossier de procédure** (ex : une lettre de relance envoyée dans le cadre d'un dossier en cours).

---

## 10. Intégration Technique

### 10.1. Backend (Convex — à implémenter)

Les tables Convex nécessaires :

- `dossiers_procedure` — les dossiers de procédure actifs
- `correspondances` — les correspondances simples
- `types_demarche` — configuration des types de démarche et parcours
- `pieces_dossier` — les pièces de chaque dossier
- `etapes_parcours` — les étapes instanciées de chaque dossier
- `copies_passage` — les copies en lecture seule après transit
- `journal_actions` — le journal d'audit immuable
- `schemas_reference` — les modèles de numérotation

### 10.2. Frontend (état actuel)

L'implémentation actuelle utilise le design Finder de digitalium.io (dossiers jaunes, cartes A4, 3 modes de vue) avec des données mock. Les composants visuels sont en place :

- DynamicFolderIcon, VaultFolderCard, VaultFileCard
- ViewModeToggle (grille/liste/colonnes)
- BreadcrumbPath, FolderContextMenu
- Dialogs : Share, ManageAccess, Info, Transmit

La prochaine étape est de brancher ces composants sur le backend Convex avec la vraie logique métier décrite dans ce document.

### 10.3. Déploiement par app

| App | Module | Fonctionnalités |
|---|---|---|
| agent-web | iCorrespondance | Création, traitement, transmission, recherche |
| backoffice-web | iCorrespondance — Administration | + Configuration des types de démarche, supervision, audit |
| citizen-web | Mes Démarches | Initier, compléter, suivre, correspondre |

---

## 11. Évolutions Futures

- Signature électronique qualifiée (intégration avec un prestataire de confiance)
- OCR pour numérisation des correspondances papier entrantes
- Modèles de rédaction protocolaire par type de correspondance
- Intégration avec des systèmes de courrier externe (API postale, coursier diplomatique)
- Statistiques avancées et reporting automatisé
- Workflow designer visuel pour les administrateurs (création de parcours par glisser-déposer)
- Multi-langue pour les correspondances internationales

---

*Document de spécification fonctionnelle — iCorrespondance — gabon-diplomatie v1.0*
*Généré le 28 mars 2026*
