---
description: Schéma et flux de déploiement Cloud Run + Convex (Mémoire projet)
---

# 🚀 Architecture de Déploiement : Cloud Run & Convex

Ce document décrit le flux strict à respecter pour tout déploiement sur la plateforme diplomatique du Gabon afin d'éviter les interférences, les erreurs de proxy, et les échecs liés au blocage sur `main`.

## 🏗️ Architecture Cible
- **Plateforme Frontend / Backend SSR (Nitro)** : Google Cloud Run (europe-west1). **Attention : PAS Vercel.**
- **Backend Base de Données / API** : Convex (instance de production `usable-mole-795`).
- **Orchestration CI/CD** : GitHub Actions. Il existe 3 workflows totalement indépendants (un par app : `citizen-web`, `agent-web`, `backoffice-web`), qui sont déclenchés automatiquement en fonction des fichiers modifiés dans leurs répertoires respectifs.

## 🔒 Règles de Sécurité Git
- Le **Push direct sur la branche `main` est formellement bloqué** (par des hooks locaux et par les protections de branche sur GitHub).
- Les déploiements ne doivent jamais être forcés en interactif sur `main`.

## 🔄 Flux de Déploiement Strict Obligatoire

À partir de maintenant, pour chaque déploiement, **il faut impérativement suivre cette séquence** :

1. **Création d'une branche de travail**  
   Pour toute modification (fix, nouvelle feature), isoler le code :
   ```bash
   git checkout -b <type>/<nom-descriptif>
   ```

2. **Commit des modifications**  
   Faire des commits propres et unitaires :
   ```bash
   git add .
   git commit -m "type: description claire (ex: fix: corriger un bug d'UI)"
   ```

3. **Push de la branche vers GitHub**  
   Pousser le code directement sur la branche (et non `main`) :
   ```bash
   git push -u origin <type>/<nom-descriptif>
   ```

4. **Création de la Pull Request (PR)**  
   Créer une Pull Request via GitHub CLI ou l'interface web vers `main` :
   ```bash
   gh pr create --title "Titre clair" --body "Description des correctifs/features"
   ```

5. **Merge dans la branche `main`**  
   Une fois validée, la PR est fusionnée (merge) :
   ```bash
   gh pr merge --merge --delete-branch
   ```

6. **Déclenchement Automatique de la CI/CD**  
   - Le fait de merger dans `main` déclenche instantanément et automatiquement les workflows Cloud Run (`deploy-citizen.yml`, `deploy-agent.yml` ou `deploy-backoffice.yml`).
   - L'image Docker est reconstruite, et le service Cloud Run est mis à jour (ce qui gère le trafic HTTP SSR et le proxy d'authentification de Better Auth / Nitro).

## ⚠️ Checklist Avant de Déployer (Pièges fréquents)
- *A-t-on modifié des variables d'environnement (`CONVEX_SITE_URL`) ?* Si oui, elles doivent être déclarées comme `ARG` et `ENV` dans le `Dockerfile` aux niveaux "build" **ET** "runtime".
- *A-t-on modifié des routes API locales (`/api/auth/[...path].ts`) ?* Ces routes nécessitent que leurs fichiers soient bien recopiés dans le build Nitro (automatique avec Vite + nitro plugin, mais à vérifier si le routage bloque en prod).
- Ne comptez jamais sur les comportements "Vercel par défaut". Le projet étant sur Cloud Run, il s'exécute dans des conteneurs Linux autonomes (Oven/Bun).
