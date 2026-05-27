#!/usr/bin/env bash
#
# Setup du sous-domaine `emploi.administration.ga` pour le service Cloud Run
# `pnpe-gabon` (projet GCP `admin-gabon`, région `europe-west1`).
#
# Ce script :
#   1. Crée le Cloud Run domain mapping `emploi.administration.ga` → pnpe-gabon
#   2. Affiche les enregistrements DNS à créer chez Netim (registrar de
#      `administration.ga`)
#   3. Vérifie le statut de provisioning du certificat TLS managé
#
# Pré-requis :
#   - gcloud CLI authentifié avec un compte ayant le rôle
#     `roles/run.admin` sur le projet `admin-gabon`
#   - Le service Cloud Run `pnpe-gabon` doit être déployé (via le workflow
#     `.github/workflows/deploy-pnpe.yml` ou manuellement)
#   - Le domaine racine `administration.ga` doit être vérifié au préalable
#     dans GCP (Search Console → DNS TXT record). Si pas encore fait, voir
#     la section "Vérification de domaine" du doc associé.
#
# Usage :
#   chmod +x scripts/setup-emploi-domain.sh
#   ./scripts/setup-emploi-domain.sh
#
# Documentation associée : docs/DOMAIN_SETUP_EMPLOI_ADMINISTRATION_GA.md

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────
PROJECT_ID="admin-gabon"
REGION="europe-west1"
SERVICE_NAME="pnpe-gabon"
DOMAIN="emploi.administration.ga"
WWW_DOMAIN="www.emploi.administration.ga"

# ── Couleurs pour la lisibilité ──────────────────────────────────
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_step() { echo -e "\n${BLUE}══════════════════════════════════════════════════════════${NC}"; echo -e "${BLUE} ▶ $1${NC}"; echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"; }
log_ok()   { echo -e "${GREEN}✓ $1${NC}"; }
log_warn() { echo -e "${YELLOW}⚠ $1${NC}"; }
log_err()  { echo -e "${RED}✗ $1${NC}"; }

# ── 1. Vérifications préalables ──────────────────────────────────
log_step "1. Vérifications préalables"

if ! command -v gcloud &> /dev/null; then
    log_err "gcloud CLI non trouvée. Installer : https://cloud.google.com/sdk/docs/install"
    exit 1
fi

CURRENT_PROJECT=$(gcloud config get-value project 2>/dev/null || echo "")
if [ "$CURRENT_PROJECT" != "$PROJECT_ID" ]; then
    log_warn "Projet GCP actuel : '$CURRENT_PROJECT' — passage à '$PROJECT_ID'"
    gcloud config set project "$PROJECT_ID"
fi
log_ok "Projet GCP : $PROJECT_ID"

# Vérifie que le service Cloud Run existe
if ! gcloud run services describe "$SERVICE_NAME" --region="$REGION" &> /dev/null; then
    log_err "Service Cloud Run '$SERVICE_NAME' non trouvé dans région '$REGION'."
    log_err "Déclencher le workflow .github/workflows/deploy-pnpe.yml avant ce script."
    exit 1
fi
log_ok "Service Cloud Run trouvé : $SERVICE_NAME"

# ── 2. Vérification du domaine racine ───────────────────────────
log_step "2. Vérification du domaine racine administration.ga"

VERIFIED_DOMAINS=$(gcloud domains list-user-verified 2>/dev/null || echo "")
if echo "$VERIFIED_DOMAINS" | grep -q "administration.ga"; then
    log_ok "Domaine administration.ga déjà vérifié dans GCP"
else
    log_warn "Domaine administration.ga PAS encore vérifié dans GCP."
    log_warn "Étapes à suivre :"
    echo ""
    echo "  a) Ouvrir : https://search.google.com/search-console/welcome"
    echo "  b) Ajouter une propriété de type 'Domaine' : administration.ga"
    echo "  c) Copier le TXT record proposé (format : google-site-verification=XXX)"
    echo "  d) Le créer chez Netim (zone DNS administration.ga) :"
    echo "       Type : TXT"
    echo "       Nom  : @ (ou administration.ga)"
    echo "       Valeur : la chaîne google-site-verification=..."
    echo "       TTL : 3600"
    echo "  e) Attendre 5-15 min puis cliquer 'Vérifier' dans Search Console"
    echo "  f) Relancer ce script une fois vérifié"
    exit 1
fi

# ── 3. Création du domain mapping ───────────────────────────────
log_step "3. Création du domain mapping Cloud Run → $DOMAIN"

EXISTING_MAPPING=$(gcloud beta run domain-mappings list \
    --region="$REGION" \
    --filter="metadata.name=$DOMAIN" \
    --format="value(metadata.name)" 2>/dev/null || echo "")

if [ -n "$EXISTING_MAPPING" ]; then
    log_ok "Domain mapping $DOMAIN existe déjà"
else
    log_warn "Création du domain mapping $DOMAIN..."
    gcloud beta run domain-mappings create \
        --service="$SERVICE_NAME" \
        --domain="$DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID"
    log_ok "Domain mapping créé"
fi

# Idem pour www. (sera redirigé par next.config.ts redirects)
EXISTING_WWW_MAPPING=$(gcloud beta run domain-mappings list \
    --region="$REGION" \
    --filter="metadata.name=$WWW_DOMAIN" \
    --format="value(metadata.name)" 2>/dev/null || echo "")

if [ -n "$EXISTING_WWW_MAPPING" ]; then
    log_ok "Domain mapping $WWW_DOMAIN existe déjà"
else
    log_warn "Création du domain mapping $WWW_DOMAIN (redirige vers $DOMAIN)..."
    gcloud beta run domain-mappings create \
        --service="$SERVICE_NAME" \
        --domain="$WWW_DOMAIN" \
        --region="$REGION" \
        --project="$PROJECT_ID"
    log_ok "Domain mapping www créé"
fi

# ── 4. Affichage des records DNS à créer chez Netim ─────────────
log_step "4. Enregistrements DNS à créer chez Netim"

echo ""
echo "Récupération des records cibles depuis Cloud Run..."
echo ""

gcloud beta run domain-mappings describe "$DOMAIN" \
    --region="$REGION" \
    --format="value(status.resourceRecords[].name,status.resourceRecords[].rrdata,status.resourceRecords[].type)" \
    --project="$PROJECT_ID" || true

echo ""
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${YELLOW}  ACTION MANUELLE REQUISE — DASHBOARD NETIM${NC}"
echo -e "${YELLOW}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "1. Se connecter sur : https://www.netim.com/"
echo "2. Aller dans : Mes domaines → administration.ga → Zone DNS"
echo "3. Ajouter les enregistrements suivants :"
echo ""
echo "   ┌─────────────────────────────────────────────────────────┐"
echo "   │  Sous-domaine principal : emploi                       │"
echo "   ├─────────────────────────────────────────────────────────┤"
echo "   │  Type  : CNAME                                          │"
echo "   │  Nom   : emploi                                         │"
echo "   │  Cible : ghs.googlehosted.com.                          │"
echo "   │  TTL   : 3600 (1 h)                                     │"
echo "   └─────────────────────────────────────────────────────────┘"
echo ""
echo "   ┌─────────────────────────────────────────────────────────┐"
echo "   │  Alias www :                                            │"
echo "   ├─────────────────────────────────────────────────────────┤"
echo "   │  Type  : CNAME                                          │"
echo "   │  Nom   : www.emploi                                     │"
echo "   │  Cible : ghs.googlehosted.com.                          │"
echo "   │  TTL   : 3600                                           │"
echo "   └─────────────────────────────────────────────────────────┘"
echo ""
echo "   IMPORTANT : ne pas oublier le point final dans 'ghs.googlehosted.com.'"
echo "   (FQDN absolu, sinon Netim concatène le domaine)."
echo ""

# ── 5. Polling du provisioning TLS ──────────────────────────────
log_step "5. Provisioning du certificat TLS managé"

echo "Cloud Run provisionne automatiquement un cert Let's Encrypt une fois"
echo "les records DNS résolus correctement. Vérification du statut..."
echo ""

gcloud beta run domain-mappings describe "$DOMAIN" \
    --region="$REGION" \
    --format="yaml(status.conditions)" \
    --project="$PROJECT_ID" 2>/dev/null | grep -E "type:|status:|message:" | head -20 || true

echo ""
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo -e "${BLUE} Setup complété !${NC}"
echo -e "${BLUE}══════════════════════════════════════════════════════════${NC}"
echo ""
echo "Prochaines étapes :"
echo "  1. Créer les 2 enregistrements CNAME chez Netim (voir ci-dessus)"
echo "  2. Attendre la propagation DNS (15 min à 4 h, selon TTL et résolveurs)"
echo "  3. Vérifier la résolution :"
echo "       dig +short emploi.administration.ga CNAME"
echo "       → doit retourner : ghs.googlehosted.com."
echo "  4. Tester l'accès HTTPS :"
echo "       curl -I https://emploi.administration.ga/"
echo "       → doit retourner 200 OK ou redirect vers /"
echo "  5. Configurer TRUSTED_ORIGINS côté Convex :"
echo "       npx convex env set TRUSTED_ORIGINS \\"
echo "         \"https://emploi.administration.ga,https://www.emploi.administration.ga,...\""
echo ""
echo "Doc complète : docs/DOMAIN_SETUP_EMPLOI_ADMINISTRATION_GA.md"
