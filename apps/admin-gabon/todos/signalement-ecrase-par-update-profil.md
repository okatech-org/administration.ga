# Signalement consulaire — effacement involontaire par update de profil

## Constat

Deux mutations `profiles` peuvent **effacer** silencieusement le
`signaledToOrgId` qu'un citoyen avait posé en faisant un signalement
consulaire :

- `upsert` ([convex/functions/profiles.ts:1028-1050](../../../convex/functions/profiles.ts))
- `updateProfile` ([convex/functions/profiles.ts:1356-1369](../../../convex/functions/profiles.ts))

Les deux appellent `resolveProfileAttachment` quand la condition
`shouldRecomputeAttachment` est vraie (résidence pas encore renseignée
ou changée). Mais elles passent en dur :

- `updateProfile` : `currentLocation: residenceCountry` + `stayDuration: 0`
- `upsert` : `currentLocation: existing?.currentLocation ?? residenceCountry`
  (jamais alimenté en pratique) + `stayDuration: 0`

`resolveProfileAttachment` retombe alors systématiquement sur le cas 1
(résidence == localisation), qui retourne `signaledToOrgId: undefined`.
Le patch écrit ce `undefined` en base, **écrasant** le signalement
existant.

## Scénario de bug

1. Citoyen A réside en France, signale sa présence au Gabon pour 3 mois
   → `signaledToOrgId = consulat_gabon`
2. Pendant son séjour au Gabon, il met à jour son adresse de résidence
   française (changement d'appartement) via citizen-web
3. `updateProfile` recalcule l'attachement → `signaledToOrgId: undefined`
4. Le citoyen A n'apparaît plus dans la juridiction du consulat du
   Gabon, alors qu'il y est physiquement.

## Cas à gérer

- Ne **jamais réécrire** `signaledToOrgId` depuis `upsert`/`updateProfile`
  sauf si on a une donnée fraîche de `currentLocation` et `stayDuration`
- Distinguer "le citoyen change sa résidence officielle" (impacte
  `managedByOrgId`) de "le citoyen modifie son profil pendant un séjour
  signalé" (ne doit toucher à rien côté signalement)
- Cas où le citoyen rentre vraiment (`residenceCountry` du séjour
  devient le `residenceCountry` officiel) : passer le signalement à
  `expired` plutôt que de le supprimer silencieusement

## Solution proposée

Modifier `resolveProfileAttachment` ou son appel dans `upsert` /
`updateProfile` pour qu'il ne retourne `signaledToOrgId` que quand on
lui passe explicitement une `currentLocation` distincte ET un
`stayDuration > 0`. Sinon, retourner `{ managedByOrgId: ..., signaledToOrgId: <inchangé> }`
plutôt que `signaledToOrgId: undefined`.

Côté `upsert`/`updateProfile`, ne patcher `signaledToOrgId` que si
`resolveProfileAttachment` retourne une **vraie valeur** (pas
`undefined`). Pas écraser un signalement existant juste parce qu'on
recalcule l'attachement résidence.

## Priorité

**Élevée**. Bug silencieux qui peut faire disparaître des citoyens
légitimement présents dans la juridiction. Difficile à reproduire en
test manuel donc risque de passer inaperçu en prod.
