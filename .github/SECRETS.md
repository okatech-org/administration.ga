# GitHub Actions Secrets — ADMINISTRATION.GA

Secrets à configurer dans Settings → Secrets and variables → Actions.

## Authentification GCP
- `WIF_PROVIDER` — Workload Identity Federation provider
- (service account : github-actions@administration-ga.iam.gserviceaccount.com)

## Convex
- `CONVEX_DEPLOY_KEY` — clé de déploiement Convex (prod)
- `CONVEX_DEPLOY_KEY_STAGING` — clé staging
- `NEXT_PUBLIC_CONVEX_URL` — URL publique du déploiement Convex
- `CONVEX_SITE_URL` — URL du backend Convex (pour webhooks)
- `NEXT_PUBLIC_CONVEX_URL_STAGING` — URL publique du déploiement Convex staging
- `CONVEX_SITE_URL_STAGING` — URL backend Convex staging

## Auth
- `BETTER_AUTH_SECRET` — secret de signature des tokens Better Auth

## Mail
- `RESEND_API_KEY` — clé API Resend

## LiveKit (visio iCom)
- `LIVEKIT_API_KEY`
- `LIVEKIT_API_SECRET`
- `NEXT_PUBLIC_LIVEKIT_WS_URL`

## OpenAI (iAsted)
- `OPENAI_API_KEY`

## Telemetry
- `NEXT_PUBLIC_POSTHOG_KEY`
- `NEXT_PUBLIC_POSTHOG_HOST`
- `POSTHOG_PERSONAL_API_KEY`
- `POSTHOG_ENV_ID`

## Maps
- `NEXT_PUBLIC_MAPBOX_TOKEN`

## Domaines (configurés via Cloud Run Domain Mappings)
| Service | Domaine prod | Domaine staging |
|---|---|---|
| admin-gabon | administration.ga | staging.administration.ga |
| admin-gabon-backoffice | admin.administration.ga | admin.staging.administration.ga |
| admin-gabon-citizen | demarche.ga | staging.demarche.ga |
