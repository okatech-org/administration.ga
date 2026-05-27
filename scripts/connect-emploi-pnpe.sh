#!/usr/bin/env bash
#
# Orchestrateur : connecte le sous-domaine `emploi.administration.ga` au
# service Cloud Run `pnpe-gabon`, de bout en bout.
#
# Étapes exécutées :
#   1. (GCP) Cloud Run domain mapping → setup-emploi-domain.sh
#   2. (Netim) Création des CNAME via API → netim-create-emploi-cname.sh
#   3. (Convex) MAJ TRUSTED_ORIGINS pour Better Auth
#   4. (Validation) Poll DNS + cert TLS
#
# Pré-requis (env vars + CLI) :
#   - gcloud authentifié avec rôle run.admin sur projet admin-gabon
#   - NETIM_LOGIN + NETIM_SECRET (compte avec accès API Netim activé)
#   - npx convex authentifié sur le deployment prod (ou dev pour test)
#   - jq, dig, curl installés
#
# Usage :
#   export NETIM_LOGIN="ABXXXX"
#   export NETIM_SECRET="..."
#   ./scripts/connect-emploi-pnpe.sh
#
# Options :
#   --skip-netim   : ne lance pas le script Netim (DNS déjà créé)
#   --skip-gcp     : ne lance pas le mapping Cloud Run (déjà fait)
#   --skip-convex  : ne touche pas TRUSTED_ORIGINS
#   --convex-env   : 'prod' (défaut) ou 'dev'

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"

# ── Options ──────────────────────────────────────────────────────
SKIP_NETIM=false
SKIP_GCP=false
SKIP_CONVEX=false
CONVEX_ENV="prod"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --skip-netim) SKIP_NETIM=true; shift;;
    --skip-gcp) SKIP_GCP=true; shift;;
    --skip-convex) SKIP_CONVEX=true; shift;;
    --convex-env) CONVEX_ENV="$2"; shift 2;;
    *) echo "Option inconnue : $1"; exit 1;;
  esac
done

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
MAGENTA='\033[0;35m'
NC='\033[0m'

banner() {
  echo ""
  echo -e "${MAGENTA}╔══════════════════════════════════════════════════════════════╗${NC}"
  echo -e "${MAGENTA}║  $1${NC}"
  echo -e "${MAGENTA}╚══════════════════════════════════════════════════════════════╝${NC}"
}

# ── Étape 1 : Cloud Run domain mapping ──────────────────────────
if [ "$SKIP_GCP" = false ]; then
  banner "ÉTAPE 1/4 — Cloud Run domain mapping (GCP)"
  bash "$SCRIPT_DIR/setup-emploi-domain.sh" || {
    echo -e "${RED}✗ Échec setup Cloud Run. Vérifier auth gcloud et droits.${NC}"
    exit 1
  }
else
  echo -e "${YELLOW}⏩ ÉTAPE 1 skippée (--skip-gcp)${NC}"
fi

# ── Étape 2 : Netim DNS ─────────────────────────────────────────
if [ "$SKIP_NETIM" = false ]; then
  banner "ÉTAPE 2/4 — Création CNAME chez Netim"
  if [ -z "${NETIM_LOGIN:-}" ] || [ -z "${NETIM_SECRET:-}" ]; then
    echo -e "${YELLOW}⚠ NETIM_LOGIN/NETIM_SECRET non définis.${NC}"
    echo "Tu peux soit :"
    echo "  a) Exporter les credentials Netim API et relancer :"
    echo "       export NETIM_LOGIN=AB1234"
    echo "       export NETIM_SECRET=...; $0"
    echo "  b) Créer manuellement les CNAME dans le dashboard Netim"
    echo "     (voir docs/DOMAIN_SETUP_EMPLOI_ADMINISTRATION_GA.md §3)"
    echo "     puis relancer avec : $0 --skip-netim"
    exit 1
  fi
  bash "$SCRIPT_DIR/netim-create-emploi-cname.sh" || {
    echo -e "${RED}✗ Échec création DNS Netim.${NC}"
    exit 1
  }
else
  echo -e "${YELLOW}⏩ ÉTAPE 2 skippée (--skip-netim)${NC}"
fi

# ── Étape 3 : Convex TRUSTED_ORIGINS ────────────────────────────
if [ "$SKIP_CONVEX" = false ]; then
  banner "ÉTAPE 3/4 — Convex TRUSTED_ORIGINS"
  if ! command -v npx &> /dev/null; then
    echo -e "${YELLOW}⚠ npx non trouvé — skip${NC}"
  else
    cd "$REPO_ROOT"
    CONVEX_ARGS=()
    [ "$CONVEX_ENV" = "prod" ] && CONVEX_ARGS+=("--prod")

    CURRENT=$(npx convex env get TRUSTED_ORIGINS "${CONVEX_ARGS[@]}" 2>/dev/null || echo "")

    NEW_ORIGIN_APEX="https://emploi.administration.ga"
    NEW_ORIGIN_WWW="https://www.emploi.administration.ga"

    if [[ "$CURRENT" == *"$NEW_ORIGIN_APEX"* ]]; then
      echo -e "${GREEN}✓ TRUSTED_ORIGINS contient déjà $NEW_ORIGIN_APEX${NC}"
    else
      echo "Valeur actuelle : ${CURRENT:-<vide>}"
      MERGED="${CURRENT:+${CURRENT},}${NEW_ORIGIN_APEX},${NEW_ORIGIN_WWW}"
      echo "Nouvelle valeur : $MERGED"
      echo ""
      read -rp "Confirmer la MAJ de TRUSTED_ORIGINS sur le deployment ${CONVEX_ENV} ? [y/N] " ans
      if [[ "$ans" =~ ^[Yy]$ ]]; then
        npx convex env set TRUSTED_ORIGINS "$MERGED" "${CONVEX_ARGS[@]}"
        echo -e "${GREEN}✓ TRUSTED_ORIGINS mis à jour${NC}"
      else
        echo -e "${YELLOW}⏩ MAJ Convex annulée par l'utilisateur${NC}"
      fi
    fi
  fi
else
  echo -e "${YELLOW}⏩ ÉTAPE 3 skippée (--skip-convex)${NC}"
fi

# ── Étape 4 : Polling DNS + cert ────────────────────────────────
banner "ÉTAPE 4/4 — Validation propagation DNS + cert TLS"

echo "Polling de la résolution CNAME (timeout 5 min, intervalle 30 s)…"
DNS_OK=false
for i in $(seq 1 10); do
  RESULT=$(dig +short emploi.administration.ga CNAME 2>/dev/null || echo "")
  if echo "$RESULT" | grep -q "ghs.googlehosted.com"; then
    echo -e "${GREEN}✓ DNS résolu : $RESULT${NC}"
    DNS_OK=true
    break
  fi
  echo "  [$i/10] Pas encore résolu… (attendre 30 s)"
  sleep 30
done

if [ "$DNS_OK" = false ]; then
  echo -e "${YELLOW}⚠ DNS pas encore propagé après 5 min.${NC}"
  echo "  Propagation peut prendre jusqu'à 4 h selon les résolveurs."
  echo "  Reprendre la vérif manuellement : dig +short emploi.administration.ga"
else
  echo ""
  echo "Test HTTPS (cert peut prendre 15-60 min après DNS pour être provisionné)…"
  HTTP_STATUS=$(curl -sI -o /dev/null -w "%{http_code}" "https://emploi.administration.ga/" --max-time 10 2>&1 || echo "fail")
  if [ "$HTTP_STATUS" = "200" ] || [ "$HTTP_STATUS" = "301" ] || [ "$HTTP_STATUS" = "302" ] || [ "$HTTP_STATUS" = "308" ]; then
    echo -e "${GREEN}✓ HTTPS répond (HTTP $HTTP_STATUS) — PNPE est en ligne !${NC}"
  else
    echo -e "${YELLOW}⚠ HTTPS retourne $HTTP_STATUS — cert TLS probablement en provisioning.${NC}"
    echo "  Vérif statut cert :"
    echo "    gcloud beta run domain-mappings describe emploi.administration.ga \\"
    echo "      --region=europe-west1 --format='yaml(status.conditions)'"
  fi
fi

echo ""
echo -e "${GREEN}╔══════════════════════════════════════════════════════════════╗${NC}"
echo -e "${GREEN}║  ✓ Pipeline emploi.administration.ga ↔ pnpe-gabon configuré ║${NC}"
echo -e "${GREEN}╚══════════════════════════════════════════════════════════════╝${NC}"
echo ""
echo "Doc complète : docs/DOMAIN_SETUP_EMPLOI_ADMINISTRATION_GA.md"
