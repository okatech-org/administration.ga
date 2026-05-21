# todos — agent-web

Notes de points d'attention identifiés au fil des sessions, à traiter
plus tard. Chaque fichier décrit un cas spécifique avec contexte,
conséquences, solutions envisagées et priorité.

## Index

### Signalement consulaire

- [signalement-cleanup-a-expiration.md](./signalement-cleanup-a-expiration.md)
  — `profile.signaledToOrgId` n'est jamais nettoyé après expiration du
  séjour (`stayEndDate`).
- [signalement-ecrase-par-update-profil.md](./signalement-ecrase-par-update-profil.md)
  — Les mutations `upsert` / `updateProfile` peuvent écraser
  silencieusement un signalement existant en réécrivant
  `signaledToOrgId: undefined`.
- [signalement-rattachement-avant-validation.md](./signalement-rattachement-avant-validation.md)
  — `signaledToOrgId` est posé dès la soumission (`status: Requested`),
  avant validation par un agent.
