# agent-desktop — Application Desktop Diplomate.ga

Application desktop installable pour les agents consulaires. Wraps le frontend `agent-web` dans **Tauri v2** avec des fonctionnalites natives (mode offline, stockage chiffre, impression de cartes consulaires, licence, mises a jour automatiques).

Deployee via les **GitHub Releases** avec installeurs signes pour Windows, macOS et Linux.

---

## Stack technique

| Couche | Technologie |
|--------|-------------|
| Shell natif | [Tauri v2](https://v2.tauri.app/) (Rust backend, WebView natif) |
| Frontend | Reutilisation de `agent-web` (React 19 + TanStack Start + Tailwind + shadcn/ui) |
| Backend | [Convex](https://convex.dev/) (meme deploiement que les apps web) |
| Auth | [Better Auth](https://better-auth.com/) + MFA obligatoire |
| Stockage local | SQLite chiffre (AES-256) via `tauri-plugin-store` ou SQLite embarque |
| Sync | Bidirectionnelle cloud <-> local avec resolution de conflits |
| Licence | Verification JWT offline avec grace period 30 jours |
| Mise a jour | Tauri Updater avec signature cryptographique |
| Impression cartes | SDK imprimante dedie (a integrer — Evolis, HID, Magicard, etc.) |
| Notifications | `tauri-plugin-notification` (notifications systeme natives) |

---

## Architecture

```
apps/agent-desktop/
├── src-tauri/                     # Backend Rust (Tauri)
│   ├── Cargo.toml                 # Dependances Rust
│   ├── tauri.conf.json            # Configuration Tauri (fenetre, CSP, plugins, updater)
│   ├── capabilities/              # Permissions Tauri (acces fichiers, reseau, etc.)
│   ├── icons/                     # Icones de l'app (32x32, 128x128, .ico, .icns)
│   └── src/
│       ├── main.rs                # Point d'entree
│       ├── lib.rs                 # Commandes Tauri (invoke handlers)
│       ├── license.rs             # Verification de licence offline (JWT)
│       ├── sync.rs                # Moteur de synchronisation offline/online
│       ├── crypto.rs              # Chiffrement AES-256 du stockage local
│       ├── printer.rs             # Integration SDK imprimante cartes consulaires
│       └── updater.rs             # Logique de mise a jour
├── src/                           # Frontend React (symlink ou copie de agent-web/src)
├── package.json
├── tsconfig.json
└── vite.config.ts                 # Config Vite adaptee pour Tauri (pas de SSR)
```

---

## Configuration Tauri

```json
{
  "productName": "Diplomate.ga",
  "version": "1.0.0",
  "identifier": "ga.diplomate.app",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:3003",
    "beforeDevCommand": "bun run dev",
    "beforeBuildCommand": "bun run build"
  },
  "app": {
    "windows": [{
      "title": "Diplomate.ga — Corps Diplomatique Gabonais",
      "width": 1280,
      "height": 800,
      "minWidth": 900,
      "minHeight": 600,
      "center": true
    }],
    "security": {
      "csp": "default-src 'self'; connect-src 'self' https://*.convex.cloud https://*.convex.site wss://*.livekit.cloud https://eu.i.posthog.com; img-src 'self' https: data:; style-src 'self' 'unsafe-inline'; font-src 'self' data:; script-src 'self'"
    }
  },
  "bundle": {
    "active": true,
    "targets": ["msi", "dmg", "deb", "appimage"],
    "icon": ["icons/32x32.png", "icons/128x128.png", "icons/128x128@2x.png", "icons/icon.icns", "icons/icon.ico"],
    "windows": { "wix": { "language": "fr-FR" } },
    "macOS": { "minimumSystemVersion": "10.15" }
  },
  "plugins": {
    "updater": {
      "active": true,
      "pubkey": "<PUBLIC_KEY>",
      "endpoints": ["https://releases.diplomate.ga/{{target}}/{{arch}}/{{current_version}}"]
    },
    "notification": { "all": true },
    "store": { "all": true }
  }
}
```

---

## Fonctionnalites

### Reprises de agent-web (toutes les pages existantes)

Toutes les routes et fonctionnalites de `agent-web` sont reprises telles quelles :

- **Dashboard operationnel** — Stats, graphiques, actions rapides
- **Traitement des demandes** — Workflow 12 etats, attribution, timeline, actions
- **Rendez-vous** — Calendrier FullCalendar, planning agents
- **Registre consulaire** — Inscriptions, validation, file d'impression
- **Services** — Configuration des services de la representation
- **Publications** — Actualites et tutoriels (editeur Tiptap)
- **Equipe** — Gestion des membres, postes, permissions
- **Paiements** — Suivi Stripe
- **Statistiques** — Tableaux de bord analytiques
- **Appels video** — LiveKit (citoyen <-> agent)
- **Parametres** — Configuration de la representation

### Fonctionnalites natives desktop (nouvelles)

#### 1. Mode offline / hybride
- Cache local SQLite chiffre (AES-256) pour les donnees critiques
- File de synchronisation : mutations hors ligne stockees et rejouees a la reconnexion
- Indicateur visuel online/offline dans la barre de titre de la fenetre
- Sync bidirectionnelle : cloud -> local (pull) et local -> cloud (push)
- Resolution de conflits : last-write-wins avec journal de conflits consultable
- Temps de sync apres reconnexion : objectif < 30 secondes

#### 2. Verification de licence
- Verification au demarrage via License Server (API REST)
- JWT signe avec grace period de 30 jours en mode offline
- Identification machine via `machine-uid` (Rust)
- Activation/desactivation liee a l'ID machine
- Nombre d'activations limite par licence (configurable)

#### 3. Impression de cartes consulaires
- Integration du SDK de l'imprimante dediee (Evolis Primacy 2, HID Fargo, ou equivalent)
- Impression recto/verso avec :
  - Photo d'identite du citoyen
  - Informations consulaires (nom, prenom, date de naissance, numero d'inscription)
  - QR code de verification (lien vers le profil sur consulat.ga)
  - Drapeau et armoiries de la Republique Gabonaise
  - Numero unique de carte consulaire
- File d'impression en lot depuis la page `/admin/consular-registry/print-queue`
- Preview de la carte avant impression
- Gestion des erreurs d'impression (bourrage, encre, etc.)
- Support des encodages (puce, bande magnetique, RFID selon le modele)

#### 4. Notifications systeme natives
- Notifications OS (Windows toast, macOS notification center, Linux libnotify)
- Nouvelles demandes recues
- Appels video entrants
- Rappels de rendez-vous
- Alertes de synchronisation

#### 5. Mise a jour automatique
- Verification periodique des nouvelles versions
- Telechargement en arriere-plan
- Installation au prochain redemarrage
- Signature cryptographique de chaque mise a jour
- Rollback en cas d'echec

#### 6. Stockage local chiffre
- Chiffrement AES-256 de toutes les donnees locales
- Cle derivee du mot de passe utilisateur (PBKDF2/Argon2)
- Wipe automatique apres N tentatives echouees (configurable)

#### 7. Page de telechargement (route publique sur agent-web)
- Page `/download` accessible sans authentification sur diplomate.ga
- Liens de telechargement pour Windows (.msi), macOS (.dmg), Linux (.deb, .AppImage)
- Guide d'installation etape par etape
- Configuration requise par OS

---

## Securite

| Mesure | Detail |
|--------|--------|
| MFA obligatoire | TOTP (Google Authenticator) ou cle FIDO2/WebAuthn |
| Sessions auditees | Chaque session enregistre appareil, IP, duree |
| Revocation a distance | Un admin peut fermer toutes les sessions d'un agent |
| Timeout de session | 30 min d'inactivite → deconnexion automatique |
| Chiffrement local | AES-256 pour tout le stockage desktop |
| Classification donnees | standard, confidentiel, officiel, secret |
| Audit trail | Toutes les actions loguees dans le journal d'audit |
| CSP strict | Content Security Policy restrictive (voir tauri.conf.json) |
| Sandbox Tauri | Backend Rust avec permissions granulaires |

---

## Build & Distribution

```bash
# Pre-requis
# - Rust toolchain (rustup)
# - Bun >= 1.2.17
# - Dependances systeme Tauri (voir https://v2.tauri.app/start/prerequisites/)

# Dev
bun run dev          # Lance le frontend + Tauri en mode dev

# Build des installeurs
bun run tauri build

# Resultats :
# Windows : src-tauri/target/release/bundle/msi/Diplomate.ga_1.0.0_x64_fr-FR.msi
# macOS   : src-tauri/target/release/bundle/dmg/Diplomate.ga_1.0.0_aarch64.dmg
# Linux   : src-tauri/target/release/bundle/deb/diplomate-ga_1.0.0_amd64.deb
#           src-tauri/target/release/bundle/appimage/diplomate-ga_1.0.0_amd64.AppImage

# Signer une mise a jour
bun run tauri signer sign target/release/bundle/msi/*.msi
```

---

## CI/CD (GitHub Actions)

```yaml
name: Build Desktop Installers
on:
  push:
    tags: ['v*']
  workflow_dispatch:

jobs:
  build:
    strategy:
      matrix:
        platform: [ubuntu-22.04, macos-latest, windows-latest]
    runs-on: ${{ matrix.platform }}
    steps:
      - uses: actions/checkout@v4
      - uses: dtolnay/rust-toolchain@stable
      - uses: oven-sh/setup-bun@v2
        with:
          bun-version: "1.2.17"
      - run: bun install --frozen-lockfile
      - uses: tauri-apps/tauri-action@v0
        with:
          tagName: v__VERSION__
          releaseName: 'Diplomate.ga v__VERSION__'
          releaseBody: 'Mise a jour de Diplomate.ga Desktop'
          releaseDraft: true
```

Les installeurs sont uploades comme GitHub Releases. Le systeme de mise a jour Tauri pointe vers l'API GitHub Releases.

---

## Variables d'environnement

L'app desktop est un client Electron + Vite qui ne fait actuellement
que l'authentification via Convex/Better Auth. Seules deux variables
sont consommees par le code (`renderer/src/lib/{convex-provider,auth-client}.ts`)
et injectees par le CI dans `.github/workflows/build-desktop.yml` :

```env
VITE_CONVEX_URL=              # URL Convex (cloud)
VITE_CONVEX_SITE_URL=         # URL site HTTP Convex
```

Les autres integrations (PostHog, Stripe, LiveKit, Mapbox) ne sont
pour l'instant cablees que cote apps web Next, qui exposent ces
valeurs via leurs propres secrets `NEXT_PUBLIC_*`.

---

## Metriques de succes

- **Taille du bundle** : < 15 MB (vs ~200 MB Electron)
- **Temps de demarrage** : < 5 secondes
- **Sync offline** : < 30 secondes apres reconnexion
- **Disponibilite** : 99.9% uptime (mode online)
- **Adoption** : > 90% des agents utilisent l'app quotidiennement
- **Impression** : < 60 secondes par carte consulaire

---

## Plan d'implementation

### Phase 1 — Setup Tauri + wrapping agent-web
- [ ] Initialiser Tauri v2 dans le monorepo (`bun add -D @tauri-apps/cli@next`)
- [ ] Configurer `tauri.conf.json` (fenetre, CSP, identifiant, bundle)
- [ ] Adapter le build Vite pour Tauri (SPA mode, pas de SSR)
- [ ] Generer les icones (32x32, 128x128, .ico, .icns)
- [ ] Premier build fonctionnel qui wrappe agent-web

### Phase 2 — Fonctionnalites natives de base
- [ ] Notifications systeme natives (`tauri-plugin-notification`)
- [ ] Stockage local (`tauri-plugin-store`)
- [ ] Detection online/offline avec indicateur visuel
- [ ] Commande `get_machine_id` (Rust)

### Phase 3 — Systeme de licence
- [ ] Commande `verify_license` avec appel au License Server
- [ ] Verification JWT offline avec grace period 30 jours
- [ ] Ecran d'activation de licence au premier demarrage
- [ ] Gestion des activations/desactivations par machine

### Phase 4 — Mode offline et synchronisation
- [ ] Cache local SQLite chiffre (AES-256)
- [ ] File de mutations offline (stockage + replay)
- [ ] Sync bidirectionnelle cloud <-> local
- [ ] Resolution de conflits (last-write-wins)
- [ ] Indicateur de sync dans l'UI

### Phase 5 — Impression de cartes consulaires
- [ ] Integration du SDK imprimante (a recevoir)
- [ ] Commande Rust `print_consular_card` (invoke handler)
- [ ] Preview de carte dans l'UI (recto/verso)
- [ ] File d'impression en lot
- [ ] Gestion des erreurs d'impression

### Phase 6 — Mise a jour automatique
- [ ] Configuration Tauri Updater (endpoints, pubkey)
- [ ] Serveur de releases (GitHub Releases ou custom)
- [ ] Signature des mises a jour
- [ ] UI de notification de mise a jour disponible
- [ ] CI/CD multi-plateforme (GitHub Actions matrix build)

### Phase 7 — Page de telechargement
- [ ] Route publique `/download` sur agent-web (diplomate.ga/download)
- [ ] Cards de telechargement par OS (Windows, macOS, Linux)
- [ ] Guide d'installation
- [ ] Detection automatique de l'OS du visiteur
