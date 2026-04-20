# Code Signing & Notarisation — Agent Desktop (macOS)

> Guide complet pour signer et notariser l'app **Consulat Agent** via GitHub Actions.
> Plateforme cible : **macOS** (Apple Silicon + Intel). Windows est buildé non signé pour l'instant.

---

## 1. Prérequis

- Compte **Apple Developer Program** actif (99 USD/an)
- Certificat **Developer ID Application** généré et installé dans ton Keychain
- Accès **admin** au repo GitHub `okatech-org/gabon-diplomatie` (pour configurer les secrets)
- Un `Apple Team ID` (10 caractères, visible sur https://developer.apple.com/account#membershipTrigger)

> ⚠️ **Developer ID Application** (pas "Mac App Distribution"). Le premier est pour distribution **hors** Mac App Store — c'est ce qu'on veut pour un installeur DMG auto-hébergé via GitHub Releases.

---

## 2. Exporter le certificat en `.p12`

Le CI n'a pas accès à ton Keychain local, donc il faut exporter le certificat dans un fichier transportable.

### Étapes

1. Ouvrir **Keychain Access** (`/Applications/Utilities/Keychain Access.app`)
2. Sélectionner le trousseau **login** → catégorie **My Certificates**
3. Déplier la ligne `Developer ID Application: Okatech (XXXXXXXXXX)` — tu dois voir la clé privée attachée dessous
4. Clic droit sur la ligne du certificat → **Export "Developer ID Application: Okatech (...)"**
5. Format : **Personal Information Exchange (.p12)**
6. Nom suggéré : `agent-desktop-signing.p12`
7. Choisir un **mot de passe solide** — tu vas le réutiliser dans `MAC_CERT_PASSWORD`
8. Entrer le mot de passe du Mac si demandé

### Convertir en base64 pour GitHub Secrets

Les secrets GitHub sont du texte, pas des fichiers. On encode donc le `.p12` en base64 :

```bash
base64 -i agent-desktop-signing.p12 | pbcopy
```

Le résultat est copié dans le presse-papier — prêt à coller dans le secret `MAC_CERT_P12_BASE64`.

> 🔒 **Sécurité** : ne commit jamais le `.p12` ni sa version base64. Supprime le fichier après l'avoir mis dans GitHub.

---

## 3. Générer un app-specific password

`notarytool` (le notarisateur Apple) n'accepte PAS ton mot de passe Apple ID normal. Il faut un **app-specific password** :

1. Se connecter à https://appleid.apple.com
2. Section **Sign-In and Security** → **App-Specific Passwords** → **Generate an app-specific password**
3. Label : `electron-builder notarization` (ou ce que tu veux)
4. Copier le mot de passe format `xxxx-xxxx-xxxx-xxxx`

---

## 4. Configurer les secrets GitHub

Dans le repo : **Settings → Secrets and variables → Actions → New repository secret**.

Créer ces 5 secrets :

| Nom du secret | Valeur |
|---|---|
| `MAC_CERT_P12_BASE64` | Sortie de `base64 -i agent-desktop-signing.p12` |
| `MAC_CERT_PASSWORD` | Mot de passe choisi à l'étape 2.6 |
| `APPLE_ID` | Email de ton compte Apple Developer (ex. `you@okatech.dev`) |
| `APPLE_APP_SPECIFIC_PASSWORD` | Mot de passe `xxxx-xxxx-xxxx-xxxx` de l'étape 3 |
| `APPLE_TEAM_ID` | Team ID 10-car (ex. `ABCDE12345`) |

> Les noms `APPLE_ID`, `APPLE_APP_SPECIFIC_PASSWORD`, `APPLE_TEAM_ID` sont **lus automatiquement** par electron-builder quand `notarize: true` est activé — aucune config supplémentaire nécessaire.

---

## 5. Déclencher un build signé

### Via tag Git (recommandé pour release officielle)

```bash
git tag v1.0.1
git push origin v1.0.1
```

Le workflow `.github/workflows/build-desktop.yml` se déclenche, build les 3 targets (mac-arm64, mac-x64, win-x64), signe + notarise les binaires macOS, et publie la release sur GitHub.

### Via dispatch manuel (pour tester sans créer de tag)

1. Onglet **Actions** du repo → workflow **Build Desktop App** → **Run workflow**
2. `publish` : `false` (upload en artifact seulement) ou `true` (crée une release)

---

## 6. Vérifier la signature et la notarisation

Une fois le DMG téléchargé sur un Mac :

```bash
# Vérifier que le .app à l'intérieur est correctement signé
spctl -a -vvv -t install "Consulat Agent-1.0.0-mac-arm64.dmg"
# Attendu : "accepted" + "source=Notarized Developer ID"

# Vérifier le ticket de notarisation dans le .app
hdiutil attach "Consulat Agent-1.0.0-mac-arm64.dmg"
stapler validate "/Volumes/Consulat Agent 1.0.0-arm64/Consulat Agent.app"
# Attendu : "The validate action worked!"
hdiutil detach "/Volumes/Consulat Agent 1.0.0-arm64"
```

Si les deux commandes passent, Gatekeeper acceptera l'installation sans popup d'avertissement.

---

## 7. Troubleshooting

### `Error: No identity found for signing`

→ Le `.p12` n'a pas été importé correctement. Vérifier que `MAC_CERT_P12_BASE64` contient bien la sortie complète de `base64` (pas de retour chariot tronqué) et que `MAC_CERT_PASSWORD` est exact.

### `notarytool: Invalid credentials`

→ L'app-specific password a expiré ou a été révoqué. Régénère-en un sur appleid.apple.com et mets à jour `APPLE_APP_SPECIFIC_PASSWORD`.

### `HTTP 403 from Apple` pendant la notarisation

→ Ton compte Apple Developer n'a pas accepté les derniers termes. Connecte-toi sur https://developer.apple.com/account/ et valide les Agreements en attente.

### `electron-builder skipped notarization: APPLE_ID env var not set`

→ Le `matrix.platform == 'mac'` dans le workflow n'a pas matché (faute de frappe ?). Vérifier que la step du workflow passe bien les secrets uniquement pour les jobs macOS.

### Le `.dmg` n'est pas signé mais l'`.app` dedans l'est

→ C'est **normal**. Notre config a `dmg: sign: false` — seul l'`.app` à l'intérieur est signé/notarisé, et le `.zip` (pour electron-updater) l'est aussi. Gatekeeper valide le `.app`, pas le conteneur.

### Le koffi natif fait râler Gatekeeper

→ On a déjà `com.apple.security.cs.disable-library-validation` dans les entitlements pour que koffi puisse charger l'addon Evolis. Si tu as un nouvel addon natif, l'ajouter dans `resources/entitlements.mac.plist`.

---

## 8. Coûts et renouvellement

- Certificat Developer ID Application : **5 ans** de validité. Le renouveler 2-3 mois avant expiration.
- App-specific password : aucune expiration sauf révocation manuelle.
- Apple Developer Program : **99 USD/an**, renouvellement automatique.

---

## 9. Windows (à venir)

Quand tu auras un certificat Code Signing Windows :

1. Retirer `CSC_IDENTITY_AUTO_DISCOVERY: 'false'` pour la plateforme `win` dans `build-desktop.yml`
2. Ajouter les secrets `WIN_CSC_LINK` + `WIN_CSC_KEY_PASSWORD`
3. Un certificat **EV** (Extended Validation) est fortement recommandé pour éviter l'écran SmartScreen qui dissuade les utilisateurs.

---

## Références

- [Electron — Code Signing](https://www.electronjs.org/docs/latest/tutorial/code-signing)
- [electron-builder — Code Signing](https://www.electron.build/code-signing)
- [Apple — Notarizing macOS software before distribution](https://developer.apple.com/documentation/security/notarizing-macos-software-before-distribution)
