# Signalement consulaire — nettoyage à expiration

## Constat

Le champ `profiles.signaledToOrgId` est posé par la mutation
`submitNotificationRequest` ([convex/functions/profiles.ts:951-953](../../../convex/functions/profiles.ts))
au moment où un citoyen soumet un signalement de présence temporaire dans
un pays (séjour < 6 mois).

**Aucune logique ne le remet à `undefined` quand le séjour est terminé.**
La date `stayEndDate` est enregistrée dans `consularNotifications`, mais
aucun cron / scheduler / mutation ne vient nettoyer le `signaledToOrgId`
du profil quand cette date est passée.

## Conséquence

Un citoyen reste rattaché à l'organisation où il s'était signalé
indéfiniment, même 2 ans après la fin de son séjour. Avec le quick fix
appliqué au picker de réunions (qui inclut `signaledToOrgId` dans la
juridiction), cela veut dire que tous les anciens visiteurs continuent
d'apparaître dans la liste des invitables.

Au-delà du picker, ça impacte aussi :
- les autres queries qui lisent `signaledToOrgId` (representations.ts,
  citizenContacts.ts, etc.)
- la cohérence du registre des ressortissants présents dans la juridiction

## Solutions à étudier

### Option 1 — Cron Convex périodique
Un cron quotidien qui parcourt les `consularNotifications` avec
`status: "active"` et `stayEndDate < now()` :
- passe le `status` à `"expired"`
- remet `profile.signaledToOrgId = undefined` **si** aucun autre
  signalement actif ne pointe vers la même org pour ce profil

### Option 2 — Computed à la lecture
Ne pas stocker `signaledToOrgId` en dur sur le profil. À la place, le
calculer à la volée via une requête sur `consularNotifications` actives.
Plus juste mais demande de refactorer tous les consommateurs du champ.

### Option 3 — Côté query uniquement
Garder `signaledToOrgId` en dur, mais à la lecture (dans le picker, dans
representations, etc.) toujours croiser avec la table
`consularNotifications` pour vérifier `status === "active"` et
`stayEndDate >= now()`. Moins propre mais zéro migration.

## Cas particuliers à traiter

- Un citoyen peut avoir **plusieurs signalements successifs** vers
  différentes orgs. Quel `signaledToOrgId` garder si plusieurs sont
  encore actifs ? Le plus récent ? Le plus long ?
- Que faire si le citoyen **prolonge** son séjour (nouvelle
  `consularNotification` qui se superpose à la première) ?
- Comment afficher l'historique côté backoffice pour qu'un agent voie
  les anciens signalements même expirés ?

## Priorité

**Moyenne**. Sans ce nettoyage, la liste des invitables va s'allonger
avec le temps. À traiter avant un volume conséquent de signalements en
production.
