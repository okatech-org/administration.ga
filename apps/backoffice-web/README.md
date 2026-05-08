# backoffice-web — Back-Office Super Admin

Interface d'administration centrale de la plateforme. Déployé sur **[admin.consulat.ga](https://admin.consulat.ga)**.

## Fonctionnalités

### Réseau diplomatique
- **Organisations** — Gestion des consulats, ambassades et représentations
- **Services** — Configuration globale des services consulaires
- **Demandes** — Vue transverse de toutes les demandes
- **Associations** — Gestion des associations de la diaspora

### Population
- **Utilisateurs** — Gestion des comptes utilisateurs
- **Profils** — Profils citoyens (consultation, modération)
- **Support** — Tickets de support

### Sécurité & Système
- **Audit logs** — Journal d'audit des actions
- **Monitoring** — Tableau de bord système (GCP)
- **Paramètres** — Configuration globale

### Éditorial
- **Publications** — Gestion des actualités (Actualités)
- **Tutoriels** — Guides et contenus pédagogiques
- **Événements** — Événements communautaires

## Stack

- **TanStack Start** — SSR + file-based routing
- **Convex** — Backend temps-réel
- **Better Auth** — Authentification
- **PostHog** — Analytics

## Développement

```bash
cd apps/backoffice-web

# Lancer en dev
bun run dev  # → http://localhost:3002

# Build
bun run build

# Lint / Typecheck
bun run lint
bun run typecheck
```

### Variables d'environnement (`apps/backoffice-web/.env.local`)

```env
NEXT_PUBLIC_CONVEX_URL=             # URL Convex (voir dashboard Convex)
CONVEX_SITE_URL=                    # URL site HTTP Convex
NEXT_PUBLIC_SITE_URL=               # URL de l'app (ex: http://localhost:3002)
NEXT_PUBLIC_POSTHOG_KEY=            # Clé PostHog
NEXT_PUBLIC_POSTHOG_HOST=           # Host PostHog
NEXT_PUBLIC_DEV_ACCOUNTS='[...]'    # Comptes de test (dev uniquement, optionnel)
```

## Structure

```
src/
├── routes/
│   ├── __root.tsx           # Layout racine
│   ├── _app.tsx             # Layout protégé (auth + superadmin guard)
│   └── _app/                # Routes protégées
│       ├── index.tsx        # Dashboard admin
│       ├── organizations/
│       ├── services/
│       ├── requests/
│       ├── users/
│       ├── profiles/
│       ├── support/
│       ├── audit-log/
│       ├── monitoring/
│       ├── settings/
│       ├── positions/
│       ├── modules/
│       ├── representations/
│       ├── posts/
│       ├── tutorials/
│       └── events/
├── components/
│   ├── sidebars/            # Sidebar super admin
│   ├── guards/              # SuperadminGuard
│   └── ui/                  # Composants locaux
├── hooks/
├── integrations/
└── lib/
```

## Déploiement

Automatique via GitHub Actions (`deploy-backoffice.yml`) au push sur `main`.

- **Service Cloud Run** : `backoffice-web`
- **Région** : `europe-west1`
- **Domaine** : `admin.consulat.ga`
- **Dockerfile** : `apps/backoffice-web/Dockerfile`
- **Port** : 8080

### Deploy manuel

```bash
gh workflow run deploy-backoffice.yml
```

## Accès

Seuls les utilisateurs avec le rôle `super_admin`, `admin_system` ou `admin` peuvent accéder à cette interface. Les autres utilisateurs sont redirigés.
