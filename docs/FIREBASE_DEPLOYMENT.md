# Déploiement Firebase — ADMINISTRATION.GA

Architecture hybride **Firebase Hosting + Cloud Run** pour ADMINISTRATION.GA.

- **Firebase Hosting** : CDN global, SSL automatique, domaines personnalisés, cache statique.
- **Cloud Run** : SSR Next.js 14 (les 3 apps de Phase 8).
- **Convex** : backend temps-réel (cf. `deploy-convex.yml`).

Firebase Hosting reçoit les requêtes et les forward via `rewrites: { run: ... }` vers les services Cloud Run correspondants. Le CDN met en cache les assets statiques (images, `_next/static/*`).

## Projet Firebase

| Propriété | Valeur |
|---|---|
| **Project ID** | `admin-gabon` |
| **Display Name** | Administration Gabon |
| **Console** | <https://console.firebase.google.com/project/admin-gabon/overview> |

## Sites Firebase Hosting

3 sites créés via `firebase hosting:sites:create` :

| Site ID | URL Firebase par défaut | Cible Cloud Run | Domaine prod |
|---|---|---|---|
| `admin-gabon` (default) | <https://admin-gabon.web.app> | `admin-gabon` | `administration.ga` |
| `admin-gabon-citizen` | <https://admin-gabon-citizen.web.app> | `admin-gabon-citizen` | `demarche.ga` |
| `admin-gabon-backoffice` | <https://admin-gabon-backoffice.web.app> | `admin-gabon-backoffice` | `admin.administration.ga` |

## Targets Hosting (`.firebaserc`)

Mapping logique site ↔ target pour `firebase deploy --only hosting:<target>` :

```json
{
  "targets": {
    "admin-gabon": {
      "hosting": {
        "agent":      ["admin-gabon"],
        "citizen":    ["admin-gabon-citizen"],
        "backoffice": ["admin-gabon-backoffice"]
      }
    }
  }
}
```

## Configuration `firebase.json`

Chaque target définit :

- **`public`** : `apps/<app>/.firebase-public` — dossier vide (placeholder) car la SSR est servie par Cloud Run.
- **`rewrites`** : `{ source: "**", run: { serviceId: "<app>", region: "europe-west1" } }` — proxy vers Cloud Run.
- **`headers`** : cache long pour images et `_next/static/**`.

> `firebase.json` exige un dossier `public/` ; en mode pur rewrites, on y dépose un `robots.txt` placeholder pour que le déploiement passe. Voir [Firebase Hosting + Cloud Run](https://firebase.google.com/docs/hosting/cloud-run).

## Workflow GitHub Actions

**`.github/workflows/deploy-firebase.yml`** :

- **Triggers** : push `main` sur `firebase.json` / `.firebaserc` / ce workflow, ou `workflow_run` après les 3 workflows Cloud Run, ou dispatch manuel.
- **Input** `target` : `all` (défaut) / `agent` / `citizen` / `backoffice`.
- **Auth** : service account JSON dans `secrets.FIREBASE_SERVICE_ACCOUNT_ADMIN_GABON`.
- **Output** : URLs déployées dans le `GITHUB_STEP_SUMMARY`.

### Déploiement local

```bash
# Auth (une fois)
firebase login

# Déployer tout
firebase deploy --only hosting --project admin-gabon

# Déployer un site spécifique
firebase deploy --only hosting:agent     --project admin-gabon
firebase deploy --only hosting:citizen   --project admin-gabon
firebase deploy --only hosting:backoffice --project admin-gabon
```

## Pré-requis avant premier déploiement

### 1. Service account Firebase

Dans la console GCP, créer un SA dédié au déploiement :

```bash
gcloud iam service-accounts create firebase-deployer \
  --display-name="Firebase Hosting Deployer" \
  --project=admin-gabon

# Rôles minimaux
gcloud projects add-iam-policy-binding admin-gabon \
  --member="serviceAccount:firebase-deployer@admin-gabon.iam.gserviceaccount.com" \
  --role="roles/firebasehosting.admin"

gcloud projects add-iam-policy-binding admin-gabon \
  --member="serviceAccount:firebase-deployer@admin-gabon.iam.gserviceaccount.com" \
  --role="roles/run.viewer"

# Générer la clé JSON
gcloud iam service-accounts keys create firebase-sa-key.json \
  --iam-account="firebase-deployer@admin-gabon.iam.gserviceaccount.com"
```

Copier le contenu de `firebase-sa-key.json` dans le secret GitHub :

**Settings → Secrets and variables → Actions → `FIREBASE_SERVICE_ACCOUNT_ADMIN_GABON`**

### 2. Services Cloud Run

Les 3 services Cloud Run `admin-gabon`, `admin-gabon-citizen`, `admin-gabon-backoffice` doivent être déployés dans le projet GCP **administration-ga** (cf. Phase 8) **dans la région europe-west1**.

⚠ **Important** : Firebase project ID (`admin-gabon`) et GCP project ID des services Cloud Run (`administration-ga`) sont **différents**. Pour autoriser le cross-project rewrite, le SA Firebase doit avoir `roles/run.invoker` sur les services Cloud Run du projet `administration-ga` :

```bash
for service in admin-gabon admin-gabon-citizen admin-gabon-backoffice; do
  gcloud run services add-iam-policy-binding "$service" \
    --member="serviceAccount:service-$(gcloud projects describe admin-gabon --format='value(projectNumber)')@gcp-sa-firebasehosting.iam.gserviceaccount.com" \
    --role="roles/run.invoker" \
    --region=europe-west1 \
    --project=administration-ga
done
```

### 3. Domaines personnalisés

Dans la console Firebase Hosting (par site), ajouter les domaines personnalisés :

| Site | Domaine |
|---|---|
| `admin-gabon` | `administration.ga` |
| `admin-gabon-citizen` | `demarche.ga` |
| `admin-gabon-backoffice` | `admin.administration.ga` |

Firebase fournit des records DNS (A / TXT) à configurer chez le registrar. SSL est provisionné automatiquement.

## Ordre de déploiement

Pour un déploiement coordonné :

1. **Convex** (`deploy-convex.yml`) — backend
2. **Cloud Run** (`deploy-agent.yml`, `deploy-citizen.yml`, `deploy-backoffice.yml`) — SSR
3. **Firebase Hosting** (`deploy-firebase.yml`) — CDN/domaine

Le workflow `deploy-administration-ga.yml` orchestre l'ensemble.

## Architecture hybride — schéma

```
Utilisateur (https://demarche.ga)
        │
        ▼
┌───────────────────────────┐
│  Firebase Hosting CDN     │
│  Project: admin-gabon     │
│  Site: admin-gabon-citizen│
│  - SSL automatique        │
│  - Cache statique         │
│  - Headers Cache-Control  │
└─────────┬─────────────────┘
          │  rewrite { source: "**", run: ... }
          ▼
┌───────────────────────────┐
│  Cloud Run admin-gabon-   │
│           citizen          │
│  Project: administration-ga│
│  Region: europe-west1     │
│  - Next.js 14 SSR         │
│  - Server Components      │
│  - API Routes             │
└─────────┬─────────────────┘
          │
          ▼
┌───────────────────────────┐
│  Convex backend           │
│  - Functions              │
│  - Real-time DB           │
│  - Auth (Better Auth)     │
└───────────────────────────┘
```

## Secrets GitHub Actions requis

En plus des secrets Phase 8 (cf. `.github/SECRETS.md`) :

- **`FIREBASE_SERVICE_ACCOUNT_ADMIN_GABON`** — contenu JSON complet de la clé du SA `firebase-deployer@admin-gabon.iam.gserviceaccount.com`

## Vérification post-déploiement

```bash
# Status des sites
firebase hosting:sites:list --project admin-gabon

# Versions actives
firebase hosting:channel:list --project admin-gabon

# Tester les URLs par défaut
curl -I https://admin-gabon.web.app
curl -I https://admin-gabon-citizen.web.app
curl -I https://admin-gabon-backoffice.web.app
```

## Liens utiles

- [Firebase Hosting + Cloud Run](https://firebase.google.com/docs/hosting/cloud-run)
- [Multi-sites Firebase Hosting](https://firebase.google.com/docs/hosting/multisites)
- [Console projet admin-gabon](https://console.firebase.google.com/project/admin-gabon/overview)
- [Hosting `admin-gabon.web.app`](https://admin-gabon.web.app)
