# Mise en service de `emploi.administration.ga`

Ce document décrit pas-à-pas la procédure pour publier l'app PNPE
(`apps/pnpe`) sur le sous-domaine `emploi.administration.ga`, avec le
registrar **Netim** comme gestionnaire DNS et **Google Cloud Run** comme
hébergeur.

## Architecture cible

```
        Netim (DNS)                       Cloud Run (europe-west1)
   ┌─────────────────────────┐       ┌───────────────────────────────┐
   │ administration.ga       │       │ Service: pnpe-gabon           │
   │   ├─ A    @  → ...      │       │ Image:  europe-west1-docker.. │
   │   ├─ CNAME emploi    ───┼──────▶│ Port:   8080                  │
   │   └─ CNAME www.emploi ──┼──────▶│ Public: --allow-unauthenticated│
   │       (ghs.googlehosted) │       └───────────────────────────────┘
   └─────────────────────────┘                     │
                                                   │ Bind via
                                                   ▼
                                ┌─────────────────────────────────┐
                                │ Cloud Run Domain Mapping        │
                                │   - emploi.administration.ga    │
                                │   - www.emploi.administration.ga│
                                │   (managed TLS certs auto)      │
                                └─────────────────────────────────┘
```

## Pré-requis

| Item | Vérification |
|---|---|
| Compte Netim avec accès `administration.ga` | <https://www.netim.com> |
| Compte Google Cloud avec rôle `roles/run.admin` sur projet `admin-gabon` | `gcloud auth list` |
| Service Cloud Run `pnpe-gabon` déployé en `europe-west1` | `gcloud run services describe pnpe-gabon --region=europe-west1` |
| Domaine racine `administration.ga` vérifié dans GCP | <https://search.google.com/search-console> |
| `npx convex` CLI authentifié sur le deployment Convex prod | `npx convex env list` |

---

## Étape 1 — Vérifier le domaine racine `administration.ga` dans GCP

Cloud Run exige que le **domaine racine** soit vérifié avant de pouvoir
créer un domain mapping sur un sous-domaine.

1. Ouvrir <https://search.google.com/search-console/welcome>
2. Cliquer **Ajouter une propriété** → choisir **Domaine** (pas URL)
3. Saisir : `administration.ga`
4. Copier le **TXT record** affiché (format : `google-site-verification=XXXX...`)
5. Dans **Netim** :
   - Mes domaines → `administration.ga` → **Zone DNS**
   - Ajouter un enregistrement :
     - **Type** : `TXT`
     - **Nom** : `@` (ou laisser vide ; représente le domaine apex)
     - **Valeur** : `google-site-verification=XXXX...` (copier tel quel)
     - **TTL** : `3600`
6. Sauvegarder, attendre 5-15 min (propagation)
7. Retourner sur Search Console et cliquer **Vérifier**

Une fois vérifié, le domaine apparaît dans :
```bash
gcloud domains list-user-verified
```

---

## Étape 2 — Créer le Cloud Run domain mapping

Lancer le script automatisé :

```bash
chmod +x scripts/setup-emploi-domain.sh
./scripts/setup-emploi-domain.sh
```

Le script :
- Vérifie que le service `pnpe-gabon` existe
- Vérifie que `administration.ga` est vérifié dans GCP
- Crée 2 domain mappings : `emploi.administration.ga` et `www.emploi.administration.ga`
- Affiche les enregistrements DNS à créer chez Netim
- Affiche le statut du provisioning TLS

Alternative manuelle :

```bash
PROJECT_ID="admin-gabon"
REGION="europe-west1"
SERVICE_NAME="pnpe-gabon"

# Apex emploi
gcloud beta run domain-mappings create \
  --service="$SERVICE_NAME" \
  --domain="emploi.administration.ga" \
  --region="$REGION" \
  --project="$PROJECT_ID"

# Alias www
gcloud beta run domain-mappings create \
  --service="$SERVICE_NAME" \
  --domain="www.emploi.administration.ga" \
  --region="$REGION" \
  --project="$PROJECT_ID"
```

---

## Étape 3 — Créer les enregistrements DNS chez Netim

1. Se connecter sur <https://www.netim.com>
2. Mes domaines → `administration.ga` → **Zone DNS**
3. **Ajouter ces 2 enregistrements** :

### Enregistrement 1 — sous-domaine principal

| Champ | Valeur |
|---|---|
| **Type** | `CNAME` |
| **Nom (Host)** | `emploi` |
| **Cible (Value)** | `ghs.googlehosted.com.` |
| **TTL** | `3600` (1 heure) |

> ⚠️ **Important** : ne pas oublier le **point final** dans
> `ghs.googlehosted.com.` (FQDN absolu). Sinon Netim concatène
> `administration.ga` et le record devient invalide.

### Enregistrement 2 — alias www

| Champ | Valeur |
|---|---|
| **Type** | `CNAME` |
| **Nom (Host)** | `www.emploi` |
| **Cible (Value)** | `ghs.googlehosted.com.` |
| **TTL** | `3600` |

4. **Sauvegarder** les enregistrements.

---

## Étape 4 — Vérifier la propagation DNS

Compter 15 min à 4 h selon les résolveurs DNS et le TTL négatif.

```bash
# Test résolution CNAME
dig +short emploi.administration.ga CNAME
# → doit retourner : ghs.googlehosted.com.

# Test résolution finale (IP)
dig +short emploi.administration.ga A
# → doit retourner une IP de Google Frontend

# Test HTTPS (peut prendre 15-30 min de plus après DNS pour le cert TLS)
curl -I https://emploi.administration.ga/
# → doit retourner 200 OK
```

Si `dig` retourne vide, attendre. Si après 4 h toujours rien, vérifier
côté Netim que les CNAME sont bien actifs et qu'aucun A record concurrent
n'existe sur `emploi`.

---

## Étape 5 — Configurer `TRUSTED_ORIGINS` côté Convex

Better Auth refuse les requêtes provenant de domaines non listés.
Ajouter `emploi.administration.ga` dans la liste des trusted origins
sur le deployment Convex prod.

```bash
# Récupérer la valeur actuelle
npx convex env get TRUSTED_ORIGINS --prod

# Set la nouvelle valeur (concaténation avec virgules)
npx convex env set TRUSTED_ORIGINS \
  "https://emploi.administration.ga,https://www.emploi.administration.ga,https://administration.ga,https://admin.administration.ga,https://demarche.ga,https://travail.ga" \
  --prod
```

> Pour le deployment dev (`clean-guineapig-897`), ajouter aussi en preview :
> ```bash
> npx convex env set TRUSTED_ORIGINS \
>   "https://emploi.administration.ga,http://localhost:3008,http://localhost:3000,http://localhost:3002"
> ```

Redémarrer le service Cloud Run pour propager (les env vars Convex sont
lues à chaque requête, mais un redéploiement vide le cache HTTP) :

```bash
gcloud run services update pnpe-gabon --region=europe-west1 --no-traffic
gcloud run services update-traffic pnpe-gabon --region=europe-west1 --to-latest
```

---

## Étape 6 — Validation finale

| Test | Commande | Résultat attendu |
|---|---|---|
| DNS résout | `dig +short emploi.administration.ga` | IP Google Frontend |
| HTTPS répond | `curl -I https://emploi.administration.ga/` | `HTTP/2 200` |
| Cert valide | `echo \| openssl s_client -servername emploi.administration.ga -connect emploi.administration.ga:443 2>/dev/null \| openssl x509 -noout -issuer` | `issuer=C=US, O=Google Trust Services...` |
| Redirect www | `curl -I https://www.emploi.administration.ga/` | `HTTP/2 308` → `Location: https://emploi.administration.ga/` |
| Auth marche | Ouvrir <https://emploi.administration.ga/> dans un navigateur, tenter connexion | Pas d'erreur "Origin not trusted" |

---

## Dépannage

### `dig` ne résout toujours pas après 4 h

- Vérifier dans Netim qu'aucun **A record concurrent** n'existe sur
  `emploi.administration.ga` (un A et un CNAME ne peuvent pas coexister
  sur le même nom).
- Vérifier que le **point final** est présent dans la cible CNAME.
- Tester avec un résolveur public : `dig @8.8.8.8 emploi.administration.ga`

### `domain-mappings create` échoue avec "domain not verified"

Le domaine racine `administration.ga` n'est pas vérifié dans GCP →
revenir à l'étape 1.

### Cloud Run logs : "Origin not allowed" / "CORS error"

`TRUSTED_ORIGINS` côté Convex ne contient pas `emploi.administration.ga`
→ étape 5.

### HTTPS retourne 526 / 525 / cert errors

Le certificat managé est en cours de provisioning. Compter 15-60 min
après la résolution DNS. Statut :
```bash
gcloud beta run domain-mappings describe emploi.administration.ga \
  --region=europe-west1 \
  --format="yaml(status.conditions)"
```
Attendre que `CertificateProvisioned: True`.

### Le www. ne redirige pas

C'est `next.config.ts` qui gère la redirection (host header). Vérifier
que le déploiement actif inclut bien les `redirects()` (cf.
`apps/pnpe/next.config.ts` ligne 92-105).

---

## Suppression / décommissionnement

Pour retirer le mapping (rollback) :

```bash
gcloud beta run domain-mappings delete emploi.administration.ga \
  --region=europe-west1 --project=admin-gabon

gcloud beta run domain-mappings delete www.emploi.administration.ga \
  --region=europe-west1 --project=admin-gabon
```

Et supprimer les CNAME côté Netim.
