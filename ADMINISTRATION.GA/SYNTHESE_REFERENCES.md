# Synthèse opérationnelle — Références ADMINISTRATION.GA

> **Source :** Lecture exhaustive de `5e-Republique-Gabon-Institutions.md`, `iCorrespondance-Specification-Fonctionnelle.md`, `PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`.
> **Statut :** Produit en Phase 0 pour servir de référence aux phases 1-9.
> **Mise à jour :** 2026-05-21

---

## A. RÉFÉRENTIEL INSTITUTIONNEL (5e République)

### A.1 Pouvoir Exécutif — Présidence (tutelleLevel=0)

| # | slug | Nom officiel | Parent |
|---|---|---|---|
| 1 | `presidence` | Présidence de la République | — |
| 2 | `vice-presidence-republique` | Vice-Présidence de la République | presidence |
| 3 | `secretariat-general-presidence` | Secrétariat général de la Présidence | presidence |
| 4 | `cabinet-civil-presidence` | Cabinet civil | presidence |
| 5 | `cabinet-militaire-presidence` | Cabinet militaire / état-major particulier | presidence |
| 6 | `dg-protocole-etat` | DG du Protocole d'État | presidence |
| 7 | `dg-communication-presidentielle` | DG de la Communication présidentielle | presidence |
| 8 | `garde-republicaine` | Garde républicaine | presidence |
| 9 | `vice-presidence-gouvernement` | Vice-Présidence du Gouvernement | presidence |

### A.2 Ministères (tutelleLevel=1) — 27 entrées + 1 ministère délégué

| # | slug | ministrySubType | Nom officiel |
|---|---|---|---|
| 10 | `min-defense` | `defense` | Défense Nationale (M. État) |
| 11 | `min-interieur` | `interior_security` | Intérieur, Sécurité, Décentralisation |
| 12 | `min-economie-finances` | `economy_finance` | Économie, Finances, Dette, Participations |
| 13 | `min-budget` | `budget` (délégué) | Ministre Délégué au Budget |
| 14 | `min-affaires-etrangeres` | `foreign_affairs` | Affaires Étrangères, Coopération, Diaspora |
| 15 | `min-justice` | `justice` | Justice, Garde des Sceaux, Droits Humains |
| 16 | `min-petrole-gaz` | `oil_gas` | Pétrole et Gaz |
| 17 | `min-mines` | `mines` | Mines et Ressources Géologiques |
| 18 | `min-eau-energie` | `water_energy` | Accès Universel Eau et Énergie |
| 19 | `min-agriculture` | `agriculture` | Agriculture, Élevage, Développement Rural |
| 20 | `min-peche-mer` | `fisheries_sea` | Pêche, Mer, Économie Bleue |
| 21 | `min-eaux-forets` | `forest_environment` | Eaux et Forêts, Environnement, Climat |
| 22 | `min-sante` | `health` | Santé |
| 23 | `min-education` | `education` (M. État) | Éducation Nationale, Instruction Civique |
| 24 | `min-enseignement-superieur` | `higher_education` | Enseignement Supérieur, Recherche, Porte-Parole |
| 25 | `min-transports` | `transport_logistics` (M. État) | Transports, Marine Marchande, Logistique |
| 26 | `min-travaux-publics` | `public_works` | Travaux Publics, Construction |
| 27 | `min-logement` | `housing_urbanism` | Logement, Habitat, Urbanisme, Cadastre |
| 28 | `min-industrie` | `industry` | Industrie, Transformation Locale |
| 29 | `min-commerce` | `commerce_sme` | Commerce, PME-PMI, Entrepreneuriat Jeunes |
| 30 | `min-numerique` | `digital_economy` | Économie Numérique, Digitalisation, Innovation |
| 31 | `min-fonction-publique` | `civil_service` | Fonction Publique, Renforcement Capacités |
| 32 | `min-travail` | `labor_employment` | Travail, Plein Emploi, Dialogue Social, Formation |
| 33 | `min-affaires-sociales` | `social_affairs` | Affaires Sociales, Enfance, Femme |
| 34 | `min-jeunesse-sports` | `youth_sports_culture` | Jeunesse, Sports, Culture, Arts |
| 35 | `min-tourisme` | `tourism_crafts` | Tourisme Durable, Artisanat |
| 36 | `min-communication` | `media_communication` | Communications et Médias |
| 37 | `min-planification` | `planning_prospective` | Planification, Prospective |
| 38 | `min-reformes-institutions` | `reforms_institutional_relations` | Réforme, Relations avec les Institutions |

### A.3 Directions Générales (tutelleLevel=2) — ~110 DG

Exemples critiques par ministère :

- **min-interieur** : `dgdi`, `dgop`, `dgl`, `dg-operations`, `oclad`, `dg-decentralisation`, `dg-securite-civile`, `dg-hygiene`
- **min-economie-finances** : `dgi`, `dgddi`, `dgbfip`, `dgtcp`, `dgepf`, `dg-dette`, `dgcrcp`, `dg-concurrence`, `dgs`
- **min-affaires-etrangeres** : `dgap-mae`, `dg-affaires-economiques-culturelles`, `dg-cooperation-internationale`, `dg-integration-sous-regionale`, `dg-diaspora`, `dg-protocole-mae`, `dg-affaires-juridiques-consulaires`
- **min-justice** : `dg-affaires-civiles`, `dg-affaires-criminelles`, `dgap-penitentiaire`, `dg-droits-humains`, `ig-services-judiciaires`
- **min-defense** : `dg-services-speciaux`, `dg-documentation-securite-exterieure`
- **min-numerique** : `dg-economie-numerique`, `dg-digitalisation`, `dg-innovation`, `dg-cybersecurite`
- **min-petrole-gaz** : `dgh`, `dg-gaz`, `dg-produits-petroliers`

> Voir `5e-Republique-Gabon-Institutions.md` pour la liste exhaustive par ministère.

### A.4 Établissements publics et entreprises sous tutelle (tutelleLevel=3) — ~80

Échantillons clés par secteur :

- **Finances :** BEAC, BGD, CDC, CAISTAB, FGIS, Société Patrimoniale, ANPI, Loterie Nationale
- **Énergie/Eau :** SEEG, FSER, ARSEE
- **Pétrole :** Gabon Oil Company (GOC), SOGARA, SNDP
- **Mines :** SEM, COMILOG
- **Santé :** CHUL, CHUO, CHUA, CNAMGS, CNSS, IHPA, CERMEL, OPN
- **Transports :** ANAC, OPRAG, SOGATRA, SETRAG, ASECNA, ARTF, ONSFAG
- **Travaux Publics :** FER, SAG
- **Logement :** SNLS, ANUTTC, `sni-immobiliere`
- **Agriculture :** ONADER, AGASA, ACCOPA, SOTRADER, IGAD, GRAINE
- **Pêche :** ANPA, IRHO
- **Eaux/Forêts :** ANPN, AEAFFB, AGEOS, CNC-Climat, SNBG
- **Numérique :** ANINF, POSTE GABON, Gabon-Digital
- **Justice :** ENM, 9 établissements pénitentiaires, CNPCEI
- **Industrie :** GSEZ Nkok, AGANOR
- **Sup/Recherche :** UOB, USTM, USS, ENS, ENSET, INSG, IUSO, IST, CENAREST (+ IRT, IRAF, IRSH, IPHAMETRA, IRET)
- **Affaires Étrangères :** IDRI, CSGE, réseau diplomatique
- **Fonction Publique :** ENA, IEF, ONE
- **Médias :** Gabon TV, Radio Gabon, AGP, `sni-imprimerie`

### A.5 Parlement (tutelleLevel=0)

| slug | Nom | Spec |
|---|---|---|
| `assemblee-nationale` | Assemblée nationale | 145 députés, 5 ans |
| `senat` | Sénat | 70 sénateurs, 6 ans |
| `office-parlementaire-evaluation` | Office Parlementaire d'Évaluation | sous-organe |

### A.6 Juridictions suprêmes (tutelleLevel=0)

`cour-constitutionnelle`, `cour-cassation`, `conseil-etat`, `cour-comptes`, `haute-cour-justice`, `cour-justice-republique`, `csm`. Juridictions inférieures : 3 cours d'appel, TPI provinciaux, tribunaux commerce/administratifs, justices de paix.

### A.7 Institutions consultatives (tutelleLevel=0)

`cesec` (60 membres, Titre VII), `mediateur-republique`, `cndh`, `cnlcei`.

### A.8 AAI (tutelleLevel=0)

`hac`, `cge`, `arcep`, `arsee`, `cnpdcp`, `anpi`, `artf`, `anac`, `conseil-economique-nation`, `comite-transition-energetique`.

### A.9 Collectivités locales (tutelleLevel=1 via min-interieur)

9 provinces (Estuaire, Haut-Ogooué, Moyen-Ogooué, Ngounié, Nyanga, Ogooué-Ivindo, Ogooué-Lolo, Ogooué-Maritime, Woleu-Ntem) + 9 préfectures + sous-préfectures + conseils municipaux/départementaux.

### A.10 Volumétrie totale

~9 entités présidentielles + 28 ministères + ~110 DG + ~80 EP/EPIC + 3 chambres parlementaires + 7 juridictions suprêmes + 4 inst. consultatives + 10 AAI + 9 provinces ≈ **260+ entités**.

---

## B. SPEC iCORRESPONDANCE

### B.1 Schémas de référence (paramétrables par TypeDemarche)

- **DEM** : `DEM/{annee}/{categorie}/{seq}` — démarches citoyennes (ex. `DEM/2026/NAT/007`)
- **ADM** : `ADM/{annee}/{orgEmetteur}/{seq}` — interne admin (ex. `ADM/2026/CONS-PAR/142`)
- **INST/NV** : `NV/{annee}/{axe}/{seq}` — diplomatique (ex. `NV/2026/GAB-FR/001`)

Segments combinables : type instrument, année, code émetteur, code destinataire, axe géo, séquentiel.

### B.2 Types de démarche identifiés

Codes nommés dans le doc : `NAT` (nationalité/nationalisation), `VISA` (visa diplomatique), `ETAT_CIVIL`. À étendre via convention `ADM-CNI`, `ADM-PASSPORT`, `DEM-NAT`, `INST-NV`. Chaque TypeDemarche définit : `code`, `nom`, `schemaReference`, `piecesRequises[]`, `parcours[]`, `delaiGlobal`, `organismeInitiateur`, `politiqueArchivage`.

### B.3 Moteur de workflow

- **Statuts dossier :** `brouillon | en_cours | en_attente | suspendu | cloture_positive | cloture_negative | cloture_administrative`
- **Statuts étape :** `a_venir | en_cours | complete | renvoi | saute`
- **Transitions clés :** créer → constituer → transmettre (bloqué si pièces manquantes) → traiter → valider/renvoyer/suspendre → clôturer (irréversible)
- **Conditions de passage :** ex. `toutes_pieces_signees`, `validation_responsable`

### B.4 Mécanisme "copie lecture seule"

À chaque transmission, le dossier actif quitte l'organisme. Entité `CopiePassage` :

```
dossierOriginalId, organismeId, etapeId, datePassage,
snapshotDossier (JSON état complet),
droitsCopie (bool), droitsImpression (bool)
```

Marquage "COPIE — Passage le [date]". Non-modifiable. Droits copie/impression paramétrables par rôle/étape.

### B.5 Audit immuable

Table `JournalAction` : `dossierId`, `utilisateurId`, `action` (`creation|transmission|signature|renvoi|consultation|impression`), `detail`, `horodatage`, `adresseIP`. Commentaire immuable (correctifs additionnels seulement). Consultation des dossiers `confidentiel|secret` obligatoirement tracée.

### B.6 `resolveRecipient(orgSlug, roleSlug)`

Comportement décrit (§2.7) :

- compte utilisateur = contact direct
- service = routage vers responsable du service (paramétrable, fallback délégation si absent)
- administration/organisme = point d'entrée (secrétariat/bureau d'ordre/accueil)
- résolution depuis organigramme enregistré

Signature TS proposée :

```ts
resolveRecipient(orgSlug: string, roleSlug?: string): {
  userId?: Id<"users">;
  serviceId?: Id<"orgServices">;
  orgEntryPointId?: Id<"orgs">;
}
```

### B.7 Rôles contextuels (par étape, pas par personne)

`lecteur | contributeur | validateur | signataire | transmetteur | superviseur | administrateur_procedure`.

Confidentialité : `standard | confidentiel | secret`. Priorité : `normal | urgent | confidentiel`.

---

## C. VISION GLOBALE (PROJET_DIGITALISATION)

### C.1 Modules cibles (7 du noyau)

| Module | Rôle (1 ligne) |
|---|---|
| **iAsted** | Assistant IA par institution (RAG sur documents autorisés, respect strict permissions) |
| **iDocument** | Création/classement/versioning/validation/partage contrôlé des documents |
| **iArchive** | Conservation long terme avec règles de rétention, verrouillage non-altération, audit |
| **iCorrespondance** | Courriers officiels entrants/sortants, circuit affectation→traitement→validation→transmission |
| **iBoîte** | Messagerie institutionnelle informelle (inbox, notifs workflow, accusés réception) |
| **iAgenda** | Planification réunions, convocations, échéances, rappels par institution/utilisateur |
| **iCom** | Diffusion notes/annonces/consignes avec validation éditoriale et canaux institution/direction/projet |

### C.2 Canaux d'interconnexion souveraine

Canaux explicites : `Presidence ↔ Primature` (alias **Vice-Présidence du Gouvernement**), `Presidence ↔ Assemblee Nationale`, `SGG ↔ Ministeres`.

Règles : aucun partage automatique, classification la plus stricte du dossier appliquée aux PJ, traces complètes (envoi/réception/ouverture), accusés horodatés.

Classifications autorisées par canal : `public | interne | confidentiel | secret`.

### C.3 Activation par institution (`activeModules`)

Double gouvernance :

1. **Admin Système** publie règle globale : `autorise | interdit | verrouille`
2. **Admin Institution** active localement : `enabled | disabled | locked`

État `locked` = imposé/bloqué par Admin Système (override).

### C.4 Catalogue National des Modules

Publié et maintenu par Admin Système. Comprend : spécifications fonctionnelles par module, politiques globales (classification, rétention, audit), validation des intégrations souveraines. Politiques héritées du ministère vers ses directions sous tutelle.

### C.5 Gouvernance — Admin Système vs Admin Institution

| Responsabilité | Admin Système | Admin Institution |
|---|---|---|
| Registre national institutions | ✓ | — |
| Catalogue modules | ✓ | — |
| Politique classification/rétention/audit | ✓ | hérite + applique |
| Validation canaux souverains | ✓ | — |
| Activation modules | autorise/verrouille | active si autorisé |
| Gestion users/rôles internes | — | ✓ |
| Workflows locaux | — | ✓ |
| Connexion directions sous tutelle | — | ✓ |
| Cycle vie données locales | — | ✓ |

### C.6 Socle technique transverse obligatoire

SSO national + fédération, RBAC par institution/direction, journal d'audit, stockage sécurisé fichiers, moteur workflow (validation/délégation/SLA), recherche metadata+plein texte, notifications, API Gateway, multi-tenant via `tenant_id` sur toutes données.

### C.7 Roadmap (extrait du document source)

- **Phase 0 source :** cadrage, politiques, parcours, KPI
- **Phase 1 source :** registre institutions + tutelles + RBAC + audit + catalogue modules
- **Phase 2 source :** iDocument + iCorrespondance + iBoîte + workflows + recherche
- **Phase 3 source :** interconnexion souveraine (canaux, signature/horodatage, accusés)
- **Phase 4 source :** iAgenda + iCom + iAsted + extension nationale

> Le découpage en **9 phases d'implémentation** retenu pour ce projet diffère et est défini dans `PROMPT_IMPLEMENTATION_ADMINISTRATION_GA.md`.

---

## D. POINTS DE VIGILANCE / ARBITRAGES À TRANCHER

1. **Pas de Premier ministre** dans la 5e Rép, mais `PROJET_DIGITALISATION` §8.1 cite "Presidence ↔ Primature". **Décision proposée :** conserver le canal logique avec alias "Primature" → `vice-presidence-gouvernement`.
2. **Conflit sigle DGAP** : DG Affaires Politiques (MAE) **ou** DG Administration Pénitentiaire (Justice). **Décision proposée :** `dgap-mae` vs `dgap-penitentiaire`.
3. **Conflit nommage SNI** : Société Nationale Immobilière (Logement) **ou** Société Nationale d'Imprimerie (Médias). **Décision proposée :** `sni-immobiliere` vs `sni-imprimerie`.
4. **DG Statistique (DGS)** partagée entre Économie/Finances et Planification. **À trancher :** rattachement principal + `secondaryTutelleOrgIds[]` ?
5. **Ministère délégué Budget** : `tutelleLevel=1` avec `parent=min-economie-finances`. **Décision proposée :** OK.
6. **`institutionType` enum** : prévoir `presidence | gouvernement | ministry | direction | parlement | juridiction | aai | consultative | collectivite | etablissement_public`.
7. **iCorrespondance §2.6 `delaiReponseAttendue`** (par message) vs **`TypeDemarche.delaiGlobal`** : **Décision proposée :** le plus court prévaut.
8. **Vocabulaires classification divergents** : `standard|confidentiel|secret` (iCorrespondance §3.3) vs `public|interne|confidentiel|secret` (PROJET §10.2). **Décision :** aligner sur 4 niveaux PROJET (manque `interne` côté iCorrespondance).
9. **`CopiePassage.snapshotDossier`** : JSON complet potentiellement volumineux. **À trancher :** politique de rétention dédiée + lien iArchive ?
10. **Workflow designer visuel** (§11 source) en évolution future : Phase 0/1 doit-elle pré-cabler les abstractions ?
11. **`POSTE GABON`** rattachée à min-numérique. **À vérifier :** confirmer post-remaniement 2026 (historiquement min-communication).
12. **Sécurité Pénitentiaire** : corps paramilitaire sous tutelle Justice. **À trancher :** entité distincte ou DG ?
13. **Parquets & magistrature** : non détaillés dans le doc source → modélisation à proposer (tutelle Justice implicite).
14. **DGS Planification** : DG dans 2 ministères. **Solution proposée :** `secondaryTutelleOrgIds[]` sur orgs.

---

## ANNEXE — Glossaire des sigles

| Sigle | Définition |
|---|---|
| AAI | Autorité Administrative Indépendante |
| AEAFFB | Agence d'Exécution des Activités de la Filière Forêt-Bois |
| AGANOR | Agence Gabonaise de Normalisation |
| AGASA | Agence Gabonaise de Sécurité Alimentaire |
| AGEOS | Agence Gabonaise d'Études et d'Observations Spatiales |
| AGP | Agence Gabonaise de Presse |
| ANAC | Agence Nationale de l'Aviation Civile |
| ANINF | Agence Nationale des Infrastructures Numériques et des Fréquences |
| ANPA | Agence Nationale des Pêches et de l'Aquaculture |
| ANPI | Agence Nationale de Promotion des Investissements |
| ANPN | Agence Nationale des Parcs Nationaux |
| ANUTTC | Agence Nationale Urbanisme/Topographie/Cadastre |
| ARCEP | Autorité de Régulation des Communications Électroniques et Postes |
| ARSEE | Agence de Régulation Secteur Eau/Électricité |
| ARTF | Autorité de Régulation du Transport Ferroviaire |
| ASECNA | Agence Sécurité Navigation Aérienne Afrique/Madagascar |
| BEAC | Banque des États de l'Afrique Centrale |
| BGD | Banque Gabonaise de Développement |
| CCAIMA | Chambre Commerce/Agriculture/Industrie/Mines/Artisanat |
| CDC | Caisse des Dépôts et Consignations |
| CENAREST | Centre National Recherche Scientifique et Technologique |
| CERMEL | Centre de Recherches Médicales de Lambaréné |
| CESEC | Conseil Économique, Social, Environnemental et Culturel |
| CGE | Centre Gabonais des Élections |
| CHUL/CHUO/CHUA | CHU Libreville/Owendo/Angondjé |
| CNAMGS | Caisse Nationale d'Assurance Maladie et Garantie Sociale |
| CNDH | Commission Nationale des Droits de l'Homme |
| CNLCEI / CNPCEI | Commission Nationale Lutte/Prévention Corruption Enrichissement Illicite |
| CNPDCP | Commission Nationale Protection Données à Caractère Personnel |
| CNSS | Caisse Nationale de Sécurité Sociale |
| CSGE | Conseil Supérieur des Gabonais de l'Étranger |
| CSM | Conseil Supérieur de la Magistrature |
| DGAP | DG Affaires Politiques (MAE) **ou** DG Administration Pénitentiaire (Justice) |
| DGBFiP | DG Budget et Finances Publiques |
| DGCE | DG Construction et Équipements |
| DGCRCP | DG Contrôle des Ressources et Charges Publiques |
| DGDDI | DG des Douanes et Droits Indirects |
| DGDI | DG de la Documentation et de l'Immigration |
| DGE | DG de l'Énergie |
| DGEPF | DG Économie et Politique Fiscale |
| DGF | DG des Forêts |
| DGFAP | DG Faune et Aires Protégées |
| DGH | DG des Hydrocarbures |
| DGI | DG des Impôts |
| DGIT | DG Infrastructures de Transport |
| DGL | DG de la Logistique |
| DGMG | DG Mines et Géologie |
| DGMM | DG Marine Marchande |
| DGOP | DG Organisation et Personnel |
| DGPA | DG Pêches et Aquaculture |
| DGRH | DG Ressources Hydrauliques |
| DGS | DG de la Statistique |
| DGTCP | DG Trésor/Comptabilité Publique/Participations |
| ENA | École Nationale d'Administration |
| ENM | École Nationale de la Magistrature |
| FAG | Forces Armées Gabonaises |
| FER | Fonds d'Entretien Routier |
| FGIS | Fonds Gabonais d'Investissements Stratégiques |
| FNAS | Fonds National d'Aide Sociale |
| FPN | Forces de Police Nationale |
| FSER | Fonds Spécial d'Électrification Rurale |
| GENA | Gendarmerie Nationale |
| GOC | Gabon Oil Company |
| GSEZ | Zone Économique Spéciale de Nkok |
| HAC | Haute Autorité de la Communication |
| IDRI | Institut Diplomatique et des Relations Internationales |
| IEF | Institut de l'Économie et des Finances |
| IHPA | Institut d'Hygiène Publique et d'Assainissement |
| IPN | Institut Pédagogique National |
| IRAF / IRET / IRHO / IRSH / IRT / IPHAMETRA | Instituts de recherche du CENAREST |
| MAE | Affaires Étrangères (Ministère) |
| OCLAD | Office Central de Lutte Anti-Drogue |
| OPRAG | Office des Ports et Rades du Gabon |
| ONADER | Office National de Développement Rural |
| ONB / ONE / ONDE | Office Nat. Baccalauréat / Emploi / Droits Enfant |
| ONSFAG | Office National Sécurité Ferroviaire |
| OPN | Office Pharmaceutique National |
| SAG | Société Autoroutière du Gabon |
| SEEG | Société d'Énergie et d'Eau du Gabon |
| SEM | Société Équatoriale des Mines |
| SETRAG | Société d'Exploitation du Transgabonais |
| SGG | Secrétariat Général du Gouvernement |
| SNBG | Société Nationale des Bois du Gabon |
| SNDP | Société Nationale Distribution Produits Pétroliers |
| SNI | Société Nationale Immobilière **ou** Société Nationale d'Imprimerie |
| SNLS | Société Nationale du Logement Social |
| SOGARA | Société Gabonaise de Raffinage |
| SOGATRA | Société Nationale Transports Gabonais |
| SOTRADER | Société Transformation Agricole/Développement Rural |
| USS / USTM / UOB | Universités Sciences Santé / Sciences Tech Masuku / Omar Bongo |
