# Migration Legacy — Schema `orgs` et champs dépréciés

> **Phase D5** — Document de référence pour les champs historiques dépréciés
> dans le schéma `orgs` et leur migration progressive vers les nouveaux
> sous-objets structurés.
>
> Dernière mise à jour : 2026-04-14

---

## Principe : Widen → Migrate → Narrow

Pour garantir zéro régression pendant la refonte, nous suivons le pattern
**widen-migrate-narrow** :

1. **Widen** (✅ fait) : Les nouveaux sous-objets (`addresses`, `protocol`,
   `jurisdiction`, `branding`, `orgCalendar`) cohabitent avec les champs plats
   historiques. Tous les champs sont **optionnels** dans le schéma.

2. **Migrate** (🟡 en cours) :
   - Cron horaire `syncLegacyOrgFields` maintient les deux formats en sync
     (`convex/functions/migrations.ts`).
   - Toutes les lectures doivent passer par les helpers `convex/lib/orgHelpers.ts`
     (priorité au nouveau format, fallback vers plat).
   - Nouvelles écritures vont **uniquement** dans les nouveaux sous-objets.

3. **Narrow** (⏳ différé de 3 à 6 mois) : Suppression des champs plats
   historiques une fois que toutes les lectures passent par les helpers et que
   les données sont stables.

---

## Champs dépréciés

### `orgs.address` → `orgs.addresses.physical`
- **Statut** : déprécié
- **Helper** : `getOrgAddress(org)`
- **Migration** : cron horaire sync bidirectionnel
- **Suppression planifiée** : Phase E (mid-2026)

### `orgs.headOfMission` (string) → `orgs.protocol.headOfMissionUserId` (id)
- **Statut** : déprécié (risque de désync si user renommé)
- **Helper** : `await getOrgHeadOfMissionName(ctx, org)`
- **Migration** : cron horaire — `headOfMission` est dérivé depuis
  `users[protocol.headOfMissionUserId].firstName + lastName`
- **Suppression planifiée** : Phase E (mid-2026)

### `orgs.headOfMissionTitle` → `orgs.protocol.headOfMissionTitleFr` + `headOfMissionTitleEn`
- **Statut** : déprécié (unilingue vs bilingue)
- **Helper** : `getOrgHeadOfMissionTitle(org, lang)`
- **Suppression planifiée** : Phase E

### `orgs.logoUrl` → `orgs.branding.logoStorageId`
- **Statut** : déprécié (URL CDN statique vs Convex Storage)
- **Helper** : `await getOrgLogoUrl(ctx, org)` (génère URL signée depuis
  Storage, fallback `logoUrl`)
- **Migration** : one-way (les nouveaux logos uploadés vont dans Storage)
- **Suppression planifiée** : après que toutes les orgs aient re-uploadé leur
  logo en Storage (campagne d'audit à prévoir)

### `orgs.jurisdictionCountries[]` → `orgs.jurisdiction.primary[]`
- **Statut** : déprécié
- **Helper** : `getOrgJurisdictionPrimary(org)`
- **Migration** : cron horaire sync
- **Suppression planifiée** : Phase E

### `orgs.openingHours` → `orgCalendar.serviceHours[scopeType="default"]`
- **Statut** : déprécié (table dédiée vs champ)
- **Helper** : `await getOrgSchedule(ctx, org)`
- **Migration** : cron horaire — copie de `orgCalendar.serviceHours[default].schedule`
  vers `openingHours` si ce dernier est vide
- **Suppression planifiée** : Phase E

### `orgs.settings.workingHours` → `orgCalendar.serviceHours`
- **Statut** : déprécié (doublon avec `openingHours`)
- **Suppression planifiée** : Phase E

### `orgs.jurisdictionNotes` → `orgs.jurisdiction.notes`
- **Statut** : déprécié
- **Migration** : copie directe lors de l'écriture `updateJurisdiction`

### `orgs.shortName` → À conserver (pas de remplacement)
- **Statut** : actif, utilisé pour l'affichage compact

### `orgs.staffCount` → À conserver ou dériver
- **Statut** : à évaluer. Peut être dérivé depuis `memberships.count`.

### `orgs.modules[]` (flat) → `orgs.orgModuleConfig[]` (enrichi)
- **Statut** : dual format intentionnel
- **Logique** : `orgModuleConfig` est la source de vérité si défini ; sinon
  on dérive depuis `modules[]`
- **Suppression planifiée** : Phase E (après toutes orgs migrées vers
  `orgModuleConfig`)

### `meetings.callStatus` (string legacy) → `meetings.endReason` (union)
- **Statut** : déprécié, conservé pour compatibilité avec docs historiques
- **Suppression planifiée** : Phase F (long terme)

---

## Tables nouvelles (Phase 1-C)

| Table | Créée en | Rôle |
|---|---|---|
| `orgCalendar` | Phase 1 | Horaires par service + jours fériés + fermetures |
| `orgPhoneNumbers` | Phase 2 | Numéros structurés (rôle, provider) — à créer Phase E |
| `missedCalls` | Phase 2 | Journal des appels manqués |
| `orgIAstedConfig` | Phase 3 | Config chatbot iAsted par org |
| `orgRoleTemplates` | Phase C3 | Templates de rôles personnalisables par org |
| `orgEscalationPolicy` | Phase D3 | Politique d'escalation unifiée (chatbot + callcenter) |

---

## Checklist pour les développeurs

### Lectures
- [ ] **N'accédez JAMAIS directement** aux champs plats dépréciés listés
      ci-dessus. Utilisez les helpers dans `convex/lib/orgHelpers.ts`.
- [ ] Pour une nouvelle fonction qui a besoin de l'adresse d'une org :
      `getOrgAddress(org)` (pas `org.address`).
- [ ] Pour le chef de mission : `await getOrgHeadOfMissionName(ctx, org)`
      (pas `org.headOfMission`).

### Écritures
- [ ] Toute nouvelle mutation qui modifie des champs structurés doit écrire
      dans le **nouveau format uniquement** (ex: `patch.addresses.physical`).
- [ ] Le cron `syncLegacyOrgFields` propagera automatiquement la valeur vers
      le champ plat historique.
- [ ] Si vous devez patcher un champ plat dépréciés (ex: migration ponctuelle),
      ajoutez aussi le champ structuré correspondant pour éviter la désync.

### Review PR
- [ ] Pas de nouveau code qui lit `org.address.*`, `org.headOfMission`,
      `org.logoUrl`, `org.openingHours`, `org.jurisdictionCountries`.
- [ ] Pas de nouveau code qui écrit ces champs en priorité.
- [ ] Les nouveaux helpers sont utilisés partout où applicable.

---

## Timeline de dépréciation

| Date estimée | Action |
|---|---|
| Phase A (Q2 2026) | Sync cron activé, helpers disponibles |
| Phase B-D (Q2 2026) | Migration des lectures vers helpers |
| Phase E (Q3 2026) | Audit : combien de code lit encore champs plats ? |
| Phase F (Q4 2026) | Narrow : suppression champs plats + migration data finale |

---

## Actions recommandées après lecture

1. **Parcourir `convex/lib/orgHelpers.ts`** pour connaître les helpers disponibles.
2. **Identifier les endroits** dans votre code qui utilisent encore les champs
   plats dépréciés et ouvrir un ticket pour les migrer.
3. **Vérifier le cron `syncLegacyOrgFields`** en production : s'assurer qu'il
   s'exécute bien toutes les heures sans erreur.
4. **Ajouter des tests** pour les helpers de lecture (mock avec champ plat
   uniquement, puis mock avec nouveau format uniquement, puis les deux).

---

## Contact

Pour toute question sur la migration, consulter le plan chirurgical dans
`~/.claude/plans/zippy-puzzling-turing.md` ou demander à l'équipe backend.
