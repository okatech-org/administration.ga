#!/usr/bin/env bash
#
# fix-convex-local-ports.sh
#
# Corrige la configuration Docker de convex-local pour que CONVEX_SITE_ORIGIN
# et CONVEX_CLOUD_ORIGIN utilisent les ports INTERNES du conteneur (3210/3211)
# au lieu des ports HOST (qui sont remappés et inaccessibles depuis l'intérieur).
#
# Sans ce fix, le runtime Convex ne peut pas valider les JWT car il ne peut pas
# fetcher les clés JWKS depuis l'intérieur du conteneur Docker.
#
# Usage:
#   ./scripts/fix-convex-local-ports.sh
#   # ou
#   bun run fix:convex-local
#

set -euo pipefail

# ── Détection du répertoire convex-local ──
CONVEX_LOCAL_DIR="$HOME/.convex-local/projects/gabon-diplomatie"
ENV_FILE="$CONVEX_LOCAL_DIR/.env"

if [ ! -f "$ENV_FILE" ]; then
  echo "ℹ️  Pas de config convex-local trouvée ($ENV_FILE)"
  echo "   Ce script est uniquement nécessaire pour le développement en self-hosted."
  echo "   Si vous utilisez Convex Cloud, ignorez ce script."
  exit 0
fi

echo "🔧 Correction des ports Docker dans $ENV_FILE"

# ── Lire les ports depuis config.json ──
CONFIG_JSON="$HOME/.convex-local/config.json"
if [ -f "$CONFIG_JSON" ]; then
  # Extraire les ports HOST configurés pour ce projet
  HOST_API_PORT=$(python3 -c "
import json
with open('$CONFIG_JSON') as f:
    config = json.load(f)
for p in config.get('projects', []):
    if p.get('slug') == 'gabon-diplomatie' or p.get('path','').endswith('gabon-diplomatie'):
        print(p.get('ports',{}).get('api', 3270))
        break
" 2>/dev/null || echo "3270")
  HOST_SITE_PORT=$(python3 -c "
import json
with open('$CONFIG_JSON') as f:
    config = json.load(f)
for p in config.get('projects', []):
    if p.get('slug') == 'gabon-diplomatie' or p.get('path','').endswith('gabon-diplomatie'):
        print(p.get('ports',{}).get('site', 3271))
        break
" 2>/dev/null || echo "3271")
  echo "   Ports HOST détectés: api=$HOST_API_PORT, site=$HOST_SITE_PORT"
fi

# ── Les ports INTERNES du conteneur sont toujours 3210/3211 ──
INTERNAL_API_PORT=3210
INTERNAL_SITE_PORT=3211

# ── Appliquer le fix ──
# Remplacer CONVEX_SITE_ORIGIN pour utiliser le port interne
if grep -q "CONVEX_SITE_ORIGIN=http://127.0.0.1:${INTERNAL_SITE_PORT}" "$ENV_FILE" 2>/dev/null; then
  echo "   ✅ CONVEX_SITE_ORIGIN déjà correct (port $INTERNAL_SITE_PORT)"
else
  # Remplacer la ligne existante ou l'ajouter
  if grep -q "CONVEX_SITE_ORIGIN=" "$ENV_FILE"; then
    sed -i.bak "s|CONVEX_SITE_ORIGIN=.*|CONVEX_SITE_ORIGIN=http://127.0.0.1:${INTERNAL_SITE_PORT}|" "$ENV_FILE"
  else
    echo "CONVEX_SITE_ORIGIN=http://127.0.0.1:${INTERNAL_SITE_PORT}" >> "$ENV_FILE"
  fi
  echo "   ✅ CONVEX_SITE_ORIGIN → http://127.0.0.1:${INTERNAL_SITE_PORT}"
fi

# Remplacer CONVEX_CLOUD_ORIGIN pour utiliser le port interne
if grep -q "CONVEX_CLOUD_ORIGIN=http://127.0.0.1:${INTERNAL_API_PORT}" "$ENV_FILE" 2>/dev/null; then
  echo "   ✅ CONVEX_CLOUD_ORIGIN déjà correct (port $INTERNAL_API_PORT)"
else
  if grep -q "CONVEX_CLOUD_ORIGIN=" "$ENV_FILE"; then
    sed -i.bak "s|CONVEX_CLOUD_ORIGIN=.*|CONVEX_CLOUD_ORIGIN=http://127.0.0.1:${INTERNAL_API_PORT}|" "$ENV_FILE"
  else
    echo "CONVEX_CLOUD_ORIGIN=http://127.0.0.1:${INTERNAL_API_PORT}" >> "$ENV_FILE"
  fi
  echo "   ✅ CONVEX_CLOUD_ORIGIN → http://127.0.0.1:${INTERNAL_API_PORT}"
fi

# Nettoyer le backup de sed
rm -f "${ENV_FILE}.bak"

echo ""
echo "📋 Config finale:"
cat "$ENV_FILE"
echo ""

# ── Redémarrer le conteneur si Docker est disponible ──
DOCKER_CMD=$(command -v docker 2>/dev/null || echo "")
if [ -n "$DOCKER_CMD" ] && $DOCKER_CMD ps --format '{{.Names}}' 2>/dev/null | grep -q "convex-gabon-diplomatie-backend"; then
  echo "🔄 Redémarrage du conteneur Convex..."
  cd "$CONVEX_LOCAL_DIR"
  $DOCKER_CMD compose -p convex-gabon-diplomatie down 2>/dev/null || true
  $DOCKER_CMD compose -p convex-gabon-diplomatie up -d 2>&1
  echo "✅ Conteneur redémarré"
else
  echo "⚠️  Conteneur Docker non trouvé. Redémarrez-le manuellement après ce fix :"
  echo "   cd $CONVEX_LOCAL_DIR && docker compose -p convex-gabon-diplomatie up -d"
fi
