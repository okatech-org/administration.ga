# Signalement consulaire — rattachement posé avant validation

## Constat

Dans `submitNotificationRequest` ([convex/functions/profiles.ts:938-953](../../../convex/functions/profiles.ts)),
au moment où un citoyen soumet une demande de signalement, **trois
choses sont créées en une seule transaction** :

1. Un enregistrement `consularNotifications` avec
   `status: RegistrationStatus.Requested`
2. Une `request` (dossier consulaire) avec `status: RequestStatus.Draft`
   → puis `Pending` via `internalSubmit`
3. **Le profil est patché immédiatement avec `signaledToOrgId = org._id`**

Le `signaledToOrgId` est donc posé **avant** que l'agent ait vérifié le
dossier, validé les justificatifs (preuve de séjour, billet d'avion,
etc.) et accepté la demande.

## Conséquence

- Un citoyen qui soumet un signalement frauduleux ou erroné est
  immédiatement rattaché à l'org, même si l'agent rejette ensuite la
  demande. Tant qu'aucune mutation manuelle ne corrige le rattachement,
  il reste visible dans la juridiction.
- Avec le quick fix appliqué au picker de réunions
  ([convex/functions/contactSearch.ts](../../../convex/functions/contactSearch.ts)),
  ces citoyens "en cours de signalement" apparaîtront dans la liste des
  invitables — ce qui peut être voulu (le contact peut être pertinent
  avant validation) ou ne pas l'être (afficher uniquement les
  signalements actés).
- Pas de symétrie : on pose le champ à la soumission, mais on ne le
  retire pas si la demande est rejetée.

## Questions à trancher

- **Politique métier** : à partir de quel `status` un citoyen doit-il
  être rattaché à l'org ?
  - `Requested` (soumis, comme aujourd'hui) ?
  - `UnderReview` (en cours d'examen par un agent) ?
  - `Accepted` / `Active` (validé) ?
- Doit-on **filtrer le picker de réunions** uniquement sur les
  signalements à un certain statut (ex. ≥ `UnderReview`) ?
- **Rejet** : quand une demande est rejetée, faut-il :
  - Remettre `signaledToOrgId = undefined` ?
  - Le laisser en l'état (le citoyen reste « connu » de l'org) ?

## Cas particuliers

- Citoyen qui resoummet après un rejet : nouvelle entrée
  `consularNotifications` mais même `signaledToOrgId` déjà posé
- Citoyen qui annule sa demande avant validation : aucune logique de
  rollback aujourd'hui sur le `signaledToOrgId`

## Solution proposée (esquisse)

1. **Décorrélation** : ne plus patcher `signaledToOrgId` dans
   `submitNotificationRequest`. Le calculer à la lecture (option 2 du
   todo `signalement-cleanup-a-expiration`) ou le poser uniquement à la
   transition de statut vers `Active` / `Accepted`.
2. Ajouter une mutation `acceptConsularNotification` / `rejectConsularNotification`
   côté backoffice qui gère proprement la transition de statut **et**
   le rattachement.
3. Ajuster `loadCitizensByOrgAndJurisdiction` pour ne remonter que les
   signalements validés (filtrer côté `consularNotifications`).

## Priorité

**Moyenne**. Pas bloquant tant que le volume est faible et que les
agents validés les demandes rapidement, mais à clarifier avant d'ouvrir
le signalement à grande échelle.
