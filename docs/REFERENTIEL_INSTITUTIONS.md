# Référentiel des institutions — ADMINISTRATION.GA

> **Cible :** toute personne qui crée, modifie, ou source une donnée institutionnelle (org, titulaire, organigramme, tutelle).
> **Statut :** **document d'index** — la source canonique est ailleurs (voir §1).
> **Mis à jour :** mai 2026 (Phase 9).

---

## 1. Sources canoniques

**Toute** donnée institutionnelle de ce projet (libellé officiel, slug, titulaire, hiérarchie, tutelle, compétences) DOIT trouver sa source dans l'un des documents suivants :

| Document | Rôle | Format |
|---|---|---|
| [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md) | **Référentiel exhaustif** des institutions de la 5e République gabonaise. Source autoritaire pour les libellés, organigrammes, tutelles. | Markdown long format (~42 KB) |
| [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.pdf`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.pdf) | Même contenu en PDF imprimable. | PDF |
| [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) | **Synthèse opérationnelle** — slugs canoniques, `ministrySubType`, points d'arbitrage tranchés, glossaire des sigles. À utiliser au quotidien comme cheat-sheet. | Markdown (~20 KB) |
| [`../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md`](../ADMINISTRATION.GA/PROJET_DIGITALISATION_GOUVERNEMENT_GABONAIS.md) | Vision cible globale (modules, gouvernance, canaux souverains). | Markdown |

Ce document `REFERENTIEL_INSTITUTIONS.md` est un **index** : il ne contient pas la donnée brute, il pointe vers les fichiers ci-dessus et rappelle les règles d'usage.

---

## 2. Volumétrie globale (cible)

D'après le référentiel canonique, le périmètre d'`administration.ga` couvre **~260+ entités** :

| Catégorie | Nombre |
|---|---|
| Présidence et organes rattachés (Vice-Présidence, Cabinets, DG Protocole, DG Comm, Garde républicaine) | ~9 |
| Ministères (27) + Ministère délégué Budget (1) | 28 |
| Directions Générales sous tutelle ministérielle | ~110 |
| Établissements publics et entreprises sous tutelle (EP / EPIC / sociétés à participation) | ~80 |
| Chambres parlementaires (Assemblée nationale, Sénat, Office Parlementaire d'Évaluation) | 3 |
| Juridictions suprêmes (Cour Constitutionnelle, Cour de Cassation, Conseil d'État, Cour des Comptes, Haute Cour de Justice, CJR, CSM) | 7 |
| Institutions consultatives (CESEC, Médiateur, CNDH, CNLCEI) | 4 |
| AAI (HAC, CGE, ARCEP, ARSEE, CNPDCP, ANPI, ARTF, ANAC, Conseil Économique Nation, Comité Transition Énergétique) | 10 |
| Collectivités locales (9 provinces + préfectures + sous-préfectures + conseils) | 9 (province) + N |
| **Total estimé** | **~260+** |

Ces chiffres sont indicatifs et évoluent au gré des décrets de réorganisation. La source canonique reste [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md).

---

## 3. Slugs canoniques — extrait

Les slugs sont stables et utilisés dans les seeds Convex (`convex/seeds/seedMinistries.ts`, `seedDirectionsGenerales.ts`, etc.) et dans les routes publiques (`/orgs/{slug}`).

### 3.1 Pouvoir Exécutif (tutelleLevel=0)

`presidence`, `vice-presidence-republique`, `secretariat-general-presidence`, `cabinet-civil-presidence`, `cabinet-militaire-presidence`, `dg-protocole-etat`, `dg-communication-presidentielle`, `garde-republicaine`, `vice-presidence-gouvernement`.

### 3.2 Ministères (tutelleLevel=1)

`min-defense`, `min-interieur`, `min-economie-finances`, `min-budget`, `min-affaires-etrangeres`, `min-justice`, `min-petrole-gaz`, `min-mines`, `min-eau-energie`, `min-agriculture`, `min-peche-mer`, `min-eaux-forets`, `min-sante`, `min-education`, `min-enseignement-superieur`, `min-transports`, `min-travaux-publics`, `min-logement`, `min-industrie`, `min-commerce`, `min-numerique`, `min-fonction-publique`, `min-travail`, `min-affaires-sociales`, `min-jeunesse-sports`, `min-tourisme`, `min-communication`, `min-planification`, `min-reformes-institutions`.

### 3.3 Directions Générales clés (tutelleLevel=2)

- **min-interieur :** `dgdi`, `dgop`, `dgl`, `dg-operations`, `oclad`, `dg-decentralisation`, `dg-securite-civile`, `dg-hygiene`
- **min-economie-finances :** `dgi`, `dgddi`, `dgbfip`, `dgtcp`, `dgepf`, `dg-dette`, `dgcrcp`, `dg-concurrence`, `dgs`
- **min-affaires-etrangeres :** `dgap-mae`, `dg-affaires-economiques-culturelles`, `dg-cooperation-internationale`, `dg-integration-sous-regionale`, `dg-diaspora`, `dg-protocole-mae`, `dg-affaires-juridiques-consulaires`
- **min-justice :** `dg-affaires-civiles`, `dg-affaires-criminelles`, `dgap-penitentiaire`, `dg-droits-humains`, `ig-services-judiciaires`
- **min-numerique :** `dg-economie-numerique`, `dg-digitalisation`, `dg-innovation`, `dg-cybersecurite`

Voir [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §A.3 pour la liste exhaustive.

### 3.4 Établissements publics échantillon (tutelleLevel=3)

- **Finances :** `beac`, `bgd`, `cdc`, `caistab`, `fgis`, `societe-patrimoniale`, `anpi`, `loterie-nationale`
- **Énergie/Eau :** `seeg`, `fser`, `arsee`
- **Pétrole :** `goc`, `sogara`, `sndp`
- **Santé :** `chul`, `chuo`, `chua`, `cnamgs`, `cnss`, `ihpa`, `cermel`, `opn`
- **Transports :** `anac`, `oprag`, `sogatra`, `setrag`, `asecna`, `artf`, `onsfag`
- **Eaux/Forêts :** `anpn`, `aeaffb`, `ageos`, `cnc-climat`, `snbg`
- **Numérique :** `aninf`, `poste-gabon`, `gabon-digital`

### 3.5 Parlement et juridictions (tutelleLevel=0)

`assemblee-nationale`, `senat`, `office-parlementaire-evaluation`, `cour-constitutionnelle`, `cour-cassation`, `conseil-etat`, `cour-comptes`, `haute-cour-justice`, `cour-justice-republique`, `csm`.

### 3.6 Institutions consultatives et AAI (tutelleLevel=0)

`cesec`, `mediateur-republique`, `cndh`, `cnlcei`, `hac`, `cge`, `arcep`, `arsee`, `cnpdcp`, `anpi`, `artf`, `anac`, `conseil-economique-nation`, `comite-transition-energetique`.

### 3.7 Collectivités locales (tutelleLevel=1)

9 provinces : `prov-estuaire`, `prov-haut-ogooue`, `prov-moyen-ogooue`, `prov-ngounie`, `prov-nyanga`, `prov-ogooue-ivindo`, `prov-ogooue-lolo`, `prov-ogooue-maritime`, `prov-woleu-ntem`. Préfectures et sous-préfectures rattachées au `min-interieur`.

---

## 4. `ministrySubType` — 28 portefeuilles 2026

Les sous-types ministériels sont définis dans `convex/lib/constants.ts` → `MinistrySubType` et `convex/lib/validators.ts` → `ministrySubTypeValidator`. La liste exhaustive des 28 portefeuilles est dans [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §A.2.

---

## 5. Règle critique — Ne JAMAIS inventer

> **Toute donnée métier (titulaire, libellé officiel, compétence, organigramme, tutelle) DOIT être vérifiée dans [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md). En cas d'ambiguïté, lever une question d'arbitrage AVANT d'écrire — ne jamais combler par inférence.**

Cette règle s'applique en particulier à :

- **Titulaires** (ministres, vice-président, directeurs généraux, responsables d'EP, présidents d'AAI, ambassadeurs). Source : décrets de nomination publiés au Journal Officiel. Les seeds ne doivent pas pré-remplir un titulaire sans cette source.
- **Libellés officiels** : utiliser la formulation exacte du décret de création (et non une formulation usuelle). Ex : "Ministère délégué auprès du Ministre de l'Économie et des Finances, chargé du Budget" et non "Ministère du Budget".
- **Hiérarchies / tutelles** : les rattachements DG ↔ ministère et EP ↔ ministère doivent suivre les décrets organiques. Ne pas inférer d'un nom de ministère.
- **Compétences** : se limiter à ce qui est explicitement attribué par décret. Ne pas étendre une compétence par déduction.

### 5.1 Arbitrages déjà tranchés

Voir [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) §D pour les 14 points d'arbitrage déjà tranchés ou à trancher, notamment :

- "Pas de Premier ministre" en 5e République → canal logique conservé sous alias "Primature" pointant vers `vice-presidence-gouvernement`.
- Conflit sigle **DGAP** (DG Affaires Politiques MAE vs DG Administration Pénitentiaire Justice) → résolu en `dgap-mae` vs `dgap-penitentiaire`.
- Conflit nommage **SNI** (Société Nationale Immobilière vs Société Nationale d'Imprimerie) → résolu en `sni-immobiliere` vs `sni-imprimerie`.
- **POSTE GABON** rattachée à `min-numerique` (à vérifier post-remaniement 2026).
- **Sécurité Pénitentiaire** (corps paramilitaire Justice) : entité distincte ou DG ? — à trancher.
- **Parquets & magistrature** : non détaillés dans le référentiel — modélisation à proposer.

### 5.2 Comment ajouter une nouvelle institution

1. **Vérifier** qu'elle existe bien dans [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md). Si non, **stop** : il faut d'abord enrichir le référentiel (PR séparée avec source décret/JO).
2. **Choisir un slug stable** suivant la convention (`min-*` pour ministères, sigle minuscule pour DG/EP/AAI, `prov-*` pour provinces).
3. **Identifier le `OrgType`** et le `ministrySubType` si applicable (cf. `convex/lib/validators.ts`).
4. **Fixer le `tutelleLevel`** (0 souverain, 1 ministère/province, 2 DG, 3 EP/service).
5. **Identifier le `parentOrgId`** si tutelleLevel >= 2.
6. **Ajouter le seed** dans le fichier approprié sous `convex/seeds/seed*.ts` (idempotent).
7. **Régénérer les types Convex** (`bunx convex codegen`).
8. **Vérifier** `bun run typecheck`.

---

## 6. Glossaire des sigles

Un glossaire exhaustif (>60 sigles : AAI, BEAC, CHUL, CNAMGS, DGAP, DGI, ENA, FSER, GOC, OPRAG, SEEG, SETRAG, SNI, etc.) est maintenu dans [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) en annexe. Le consulter avant toute requête métier ou rédaction d'UI.

---

## 7. Pour aller plus loin

- [`../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md`](../ADMINISTRATION.GA/5e-Republique-Gabon-Institutions.md) — source canonique (à lire en priorité)
- [`../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md`](../ADMINISTRATION.GA/SYNTHESE_REFERENCES.md) — cheat-sheet opérationnelle (à garder sous la main)
- [`./ARCHITECTURE.md`](./ARCHITECTURE.md) §4 — modèle organisationnel Convex
- [`./GOUVERNANCE.md`](./GOUVERNANCE.md) — gouvernance, RBAC, classifications
- [`./MIGRATION_FROM_DIPLOMATIE.md`](./MIGRATION_FROM_DIPLOMATIE.md) §6.4 — données seed à enrichir (titulaires, organigrammes, services)
