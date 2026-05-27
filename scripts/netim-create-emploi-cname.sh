#!/usr/bin/env bash
#
# Création automatisée des enregistrements DNS pour `emploi.administration.ga`
# via l'API REST Netim 3.0.
#
# Pré-requis :
#   - Compte Netim avec accès API activé (Mon Compte → API → Activer)
#   - Variables d'environnement :
#       NETIM_LOGIN   = ton login API (souvent ton ID client, ex: AB1234)
#       NETIM_SECRET  = ton mot de passe API (à ne JAMAIS commit)
#   - jq installé (`brew install jq` / `apt install jq`)
#
# Usage :
#   export NETIM_LOGIN="ABXXXX"
#   export NETIM_SECRET="ton_mot_de_passe_api"
#   ./scripts/netim-create-emploi-cname.sh
#
# Documentation API : https://support.netim.com/en/docs/api-rest-3-0/
#
# Le script :
#   1. Ouvre une session Netim (POST /session/, Basic Auth)
#   2. Crée le CNAME `emploi` → `ghs.googlehosted.com.`
#   3. Crée le CNAME `www.emploi` → `ghs.googlehosted.com.`
#   4. Ferme la session
#
# Si un enregistrement existe déjà, le script l'affiche et continue
# (idempotent).

set -euo pipefail

# ── Config ─────────────────────────────────────────────────────────
API_URL="${NETIM_API_URL:-https://rest.netim.com/3.0}"
DOMAIN="administration.ga"
TARGET="ghs.googlehosted.com."
TTL=3600  # 1 h

# ── Validation env ────────────────────────────────────────────────
if [ -z "${NETIM_LOGIN:-}" ] || [ -z "${NETIM_SECRET:-}" ]; then
  echo "✗ Variables d'environnement manquantes."
  echo ""
  echo "Usage :"
  echo "  export NETIM_LOGIN=\"AB1234\"          # ton ID client Netim"
  echo "  export NETIM_SECRET=\"motDePasseAPI\"  # ton secret API"
  echo "  $0"
  echo ""
  echo "Activation de l'accès API :"
  echo "  1. Se connecter sur https://www.netim.com"
  echo "  2. Mon compte → API → Activer l'accès"
  echo "  3. Générer un mot de passe API dédié"
  exit 1
fi

if ! command -v jq &> /dev/null; then
  echo "✗ jq requis. Installer : brew install jq (macOS) ou apt install jq (Linux)"
  exit 1
fi

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m'

# ── 1. Open session ──────────────────────────────────────────────
echo -e "${BLUE}▶ Ouverture session Netim (${API_URL})…${NC}"

AUTH_HEADER="Authorization: Basic $(printf "%s:%s" "$NETIM_LOGIN" "$NETIM_SECRET" | base64)"

SESSION_RESPONSE=$(curl -sS -X POST "$API_URL/session/" \
  -H "$AUTH_HEADER" \
  -H "Content-Type: application/json" \
  -H "Accept-Language: FR")

if echo "$SESSION_RESPONSE" | jq -e '.sessionID' &>/dev/null; then
  SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.sessionID')
  echo -e "${GREEN}✓ Session ouverte (ID : ${SESSION_ID:0:12}…)${NC}"
elif echo "$SESSION_RESPONSE" | jq -e '.id' &>/dev/null; then
  # Variation v1 / v3 : champ `id` au lieu de `sessionID`
  SESSION_ID=$(echo "$SESSION_RESPONSE" | jq -r '.id')
  echo -e "${GREEN}✓ Session ouverte (ID : ${SESSION_ID:0:12}…)${NC}"
else
  echo -e "${RED}✗ Échec ouverture session. Réponse :${NC}"
  echo "$SESSION_RESPONSE" | jq . 2>/dev/null || echo "$SESSION_RESPONSE"
  echo ""
  echo "Causes fréquentes :"
  echo "  - NETIM_LOGIN ou NETIM_SECRET incorrects"
  echo "  - Accès API non activé sur le compte (Mon compte → API)"
  echo "  - IP non autorisée (Netim filtre les IPs source pour l'API)"
  exit 1
fi

trap 'curl -sS -X DELETE "$API_URL/session/" -H "Authorization: Bearer $SESSION_ID" > /dev/null 2>&1 || true' EXIT

# ── 2. Helper : create CNAME ─────────────────────────────────────
create_cname() {
  local subdomain="$1"
  local label="$2"

  echo -e "\n${BLUE}▶ Création CNAME : ${subdomain}.${DOMAIN} → ${TARGET}${NC}"

  local body
  body=$(jq -n \
    --arg sub "$subdomain" \
    --arg val "$TARGET" \
    --argjson ttl "$TTL" \
    '{
      subdomain: $sub,
      type: "CNAME",
      value: $val,
      options: {
        service: null,
        protocol: null,
        ttl: $ttl,
        ttlUnit: "S",
        priority: null,
        weight: null,
        port: null
      }
    }')

  local response
  response=$(curl -sS -w "\n%{http_code}" -X POST "$API_URL/domain/$DOMAIN/zone/" \
    -H "Authorization: Bearer $SESSION_ID" \
    -H "Content-Type: application/json" \
    -d "$body")

  local http_code
  http_code=$(echo "$response" | tail -1)
  local body_response
  body_response=$(echo "$response" | sed '$d')

  if [ "$http_code" = "200" ] || [ "$http_code" = "201" ]; then
    echo -e "${GREEN}✓ ${label} créé (HTTP $http_code)${NC}"
    echo "$body_response" | jq -r '.STATUS // .status // "OK"' 2>/dev/null || true
  elif echo "$body_response" | grep -qiE "already exists|déjà|conflict"; then
    echo -e "${YELLOW}⚠ ${label} existe déjà — skip${NC}"
  else
    echo -e "${RED}✗ Échec ${label} (HTTP $http_code) :${NC}"
    echo "$body_response" | jq . 2>/dev/null || echo "$body_response"
    return 1
  fi
}

# ── 3. Création des 2 CNAME ──────────────────────────────────────
create_cname "emploi" "Sous-domaine principal"
create_cname "www.emploi" "Alias www"

# ── 4. Affichage de la zone DNS pour validation ─────────────────
echo -e "\n${BLUE}▶ État actuel de la zone DNS ${DOMAIN} (filtrage emploi*)…${NC}"

ZONE=$(curl -sS -X GET "$API_URL/domain/$DOMAIN/zone/" \
  -H "Authorization: Bearer $SESSION_ID")

echo "$ZONE" | jq -r '.[] | select((.subdomain // "") | test("emploi"; "i")) | "  \(.type)  \(.subdomain).\("'"$DOMAIN"'")  →  \(.value)  (TTL=\(.options.ttl // "?"))"' 2>/dev/null || {
  echo "$ZONE" | head -50
}

echo ""
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo -e "${GREEN} ✓ Enregistrements DNS Netim créés${NC}"
echo -e "${GREEN}═══════════════════════════════════════════════════════════════${NC}"
echo ""
echo "Prochaines étapes :"
echo "  1. Attendre 15 min à 4 h pour la propagation DNS mondiale"
echo "  2. Vérifier : dig +short emploi.administration.ga CNAME"
echo "     → doit retourner : ghs.googlehosted.com."
echo "  3. Une fois résolu, le cert Let's Encrypt Cloud Run sera"
echo "     provisionné automatiquement (15-60 min de plus)"
echo "  4. Test HTTPS final : curl -I https://emploi.administration.ga/"
echo ""
echo "Si erreur côté Cloud Run, créer/vérifier le domain mapping :"
echo "  ./scripts/setup-emploi-domain.sh"
