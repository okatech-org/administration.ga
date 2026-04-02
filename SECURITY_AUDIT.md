# 🛡️ AUDIT DE SÉCURITÉ COMPLET — GABON DIPLOMATIE
**Portail Diplomatique & Consulaire de la République Gabonaise**
**Date :** 2 Avril 2026 | **Niveau :** SECRET DÉFENSE
**Auditeur :** Antigravity AI Security Engine (Claude Sonnet 4.6 Thinking)

---

## RÉSUMÉ EXÉCUTIF

> [!IMPORTANT]
> Ce système gère des données diplomatiques, consulaires et personnelles de ressortissants gabonais à l'étranger. Une faille de sécurité représente un risque d'État de niveau critique.

| Domaine | Score Actuel | Score Cible |
|---|---|---|
| **Authentification & Sessions** | 🟡 7/10 | 🟢 10/10 |
| **Autorisation & RBAC** | 🟢 8/10 | 🟢 10/10 |
| **Protection API & Rate Limiting** | 🟡 7.5/10 | 🟢 10/10 |
| **Gestion des Secrets** | 🔴 4/10 | 🟢 10/10 |
| **XSS / Injection** | 🟡 7/10 | 🟢 10/10 |
| **Monitoring & Détection** | 🟡 6/10 | 🟢 10/10 |
| **Réponse aux Cyberattaques** | 🔴 3/10 | 🟢 10/10 |
| **Cryptographie** | 🟢 8/10 | 🟢 10/10 |
| **Infrastructure & DevSecOps** | 🔴 5/10 | 🟢 10/10 |

**Score Global : 6.2/10 → Objectif : 10/10**

---

## PARTIE 1 — ARCHITECTURE AUDITÉE

```
┌────────────────────────────────────────────────────────┐
│  APPS (Turborepo Monorepo — bun@1.2.17)                │
│  ├── citizen-web   (consulat.ga)                        │
│  ├── citizen-mobile (Expo)                              │
│  ├── agent-web     (diplomate.ga / Next.js)             │
│  ├── agent-desktop (Tauri — deep link diplomate://)     │
│  └── backoffice-web (admin.consulat.ga)                 │
├────────────────────────────────────────────────────────┤
│  CONVEX BACKEND (EU-West-1 Frankfurt)                   │
│  ├── Better Auth v1.5.6 (Sessions + scrypt)             │
│  ├── @convex-dev/rate-limiter v0.3.2                    │
│  ├── HTTP Router (CORS/auth/stripe/warehouse)           │
│  └── NEOCORTEX (monitoring: signaux, limbique, etc.)   │
├────────────────────────────────────────────────────────┤
│  SERVICES TIERS                                         │
│  ├── Stripe v20.4.1 (paiements)                         │
│  ├── LiveKit v2.15 (vidéo temps-réel)                   │
│  ├── Bird (SMS/WhatsApp/Email)                          │
│  ├── Resend v6.9 (emails transactionnels)               │
│  ├── PostHog (analytics + data warehouse)               │
│  └── Google AI / Gemini (IA générative)                 │
└────────────────────────────────────────────────────────┘
```

---

## PARTIE 2 — FORCES EXISTANTES ✅

### 2.1 Authentification Solide
- **Better Auth** avec **scrypt** (résistant GPU attacks, bien supérieur à bcrypt)
- **PIN à 6 chiffres** avec scrypt hash + verrouillage après **3 échecs** (30 min)
- **OTP rotation** obligatoire tous les **90 jours** pour le PIN
- **Temp password pattern** (UUID crypto + expiration 30s) pour sessions cross-domain
- **OTT (One-Time Token)** sécurisé pour l'app desktop Tauri (expiration 3 min)

### 2.2 RBAC Hiérarchique
- `SuperAdmin > AdminSystem > Admin > User`
- Anti-privilege-escalation : `callerRank >= targetRank` → refus
- `assertCanDoTask()` avant chaque opération sensible
- `specialPermissions` par membership (`grant`/`deny`)

### 2.3 CORS Strict
- Whitelist via `TRUSTED_ORIGINS` (pas de `*`)
- Origines inconnues → headers vides (browser bloque)
- `isProductionDeployment()` garde indépendante

### 2.4 Rate Limiting Backend
- Login, OTP send, PIN verify, OTT generate — tous protégés
- Clé basée sur IP ou email (non-bypassable côté client)
- `@convex-dev/rate-limiter` (token bucket, serverless-safe)

### 2.5 Comparaison Constant-Time (Anti Timing Attack)
```typescript
// warehouseAuth.ts — PARFAIT
let mismatch = 0;
for (let i = 0; i < expectedKey.length; i++) {
  mismatch |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
}
return mismatch === 0; // ✅ Résistant aux timing attacks
```

### 2.6 NEOCORTEX Monitoring
- Signaux critiques → alerte immédiate
- Cron santé système toutes les 5 minutes
- `historiqueActions` avec catégorie `SECURITE`
- `auditLog` centralisé

---

## PARTIE 3 — VULNÉRABILITÉS IDENTIFIÉES

### 🔴 CRITIQUE — Faille #1 : Secrets Exposés dans `.env.local`

```bash
# Ce fichier contient des secrets en clair
LIVEKIT_API_KEY=APItD4N8DQeC6RA           ← À RÉVOQUER IMMÉDIATEMENT
LIVEKIT_API_SECRET=9fgefw7tj8UG8fQd...    ← À RÉVOQUER IMMÉDIATEMENT
BIRD_API_KEY=HRH1FBFNPS8bh30jtAoWy...    ← À RÉVOQUER IMMÉDIATEMENT
```

**Impact :** Appels LiveKit frauduleux, SMS/WhatsApp abuse, coûts financiers.

**Correctif immédiat :**
```bash
# 1. Vérifier que .env.local est dans .gitignore
grep ".env.local" .gitignore || echo ".env.local" >> .gitignore

# 2. Scanner l'historique git
brew install gitleaks && gitleaks detect --source . --verbose

# 3. Si fuite confirmée : révoquer + BFG Repo Cleaner
# Révoquer sur LiveKit Dashboard, Bird Dashboard
# Révoquer BIRD_API_KEY dans Bird console
```

---

### 🔴 CRITIQUE — Faille #2 : `DEV_SIGNIN_ENABLED=true` + Production Origins

**Fichier :** `.env.local` L26, `http.ts` L98-212

Le `/dev/sign-in` permet la connexion **sans mot de passe** pour n'importe quel email.
`isProductionDeployment()` vérifie `CONVEX_SITE_URL` — mais un staging mal configuré
avec les vraies `TRUSTED_ORIGINS` serait exploitable.

**Correctif :**
```typescript
// http.ts — Renforcer la double garde
const DEPLOY_ENV = process.env.DEPLOY_ENV ?? "production";
if (DEPLOY_ENV !== "development" || isProductionDeployment()) {
  return new Response("Not available", { status: 403 });
}
// Ajouter un secret DEV partagé
const devSecret = request.headers.get("x-dev-auth-secret");
if (devSecret !== process.env.DEV_AUTH_SECRET) {
  return new Response("Not available", { status: 403 });
}
```

---

### 🟠 HAUTE — Faille #3 : `verifyPin` est une `mutation` Publique

**Fichier :** `convex/functions/pin.ts` L105

```typescript
// PROBLÈME : Accessible via SDK Convex côté client
export const verifyPin = mutation({   // ← DOIT être internalMutation
  args: { email, phone, pin },        // Brute-forceable directement
```

Le rate limit HTTP ne protège que l'endpoint `/api/auth/pin-session`.
Un attaquant utilisant le SDK Convex directement (`useMutation`) bypass ce rate limit.
Un PIN à 6 chiffres = 1,000,000 combinaisons → brute-forceable en quelques heures.

**Correctif :**
```typescript
// pin.ts
export const verifyPin = internalMutation({ ... });

// http.ts — Seul chemin autorisé
const result = await ctx.runMutation(internal.functions.pin.verifyPin, { ... });
```

---

### 🟠 HAUTE — Faille #4 : Absence de Content Security Policy (CSP)

Aucune des apps frontend (citizen-web, agent-web, backoffice-web) ne configure de CSP.
En cas de XSS réussi, l'attaquant peut exfiltrer des cookies/tokens vers n'importe quel domaine.

**Correctif pour next.config.js :**
```javascript
const securityHeaders = [
  {
    key: 'Content-Security-Policy',
    value: [
      "default-src 'self'",
      "script-src 'self'",
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "img-src 'self' data: https: blob:",
      "connect-src 'self' wss://livekit.consulat.ga https://*.convex.cloud",
      "font-src 'self' https://fonts.gstatic.com",
      "frame-ancestors 'none'",
      "object-src 'none'",
    ].join('; ')
  },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'Strict-Transport-Security', value: 'max-age=63072000; includeSubDomains; preload' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  { key: 'Permissions-Policy', value: 'camera=(), microphone=(), geolocation=()' },
];
// Dans module.exports : headers: async () => [{ source: '/(.*)', headers: securityHeaders }]
```

---

### 🟠 HAUTE — Faille #5 : Stripe Webhook sans Validation Cryptographique Explicite

**Fichier :** `http.ts` L442-470

```typescript
if (!signature) {
  return new Response("No signature", { status: 400 });
}
// La validation est déléguée à payments.handleWebhook
// Si ce handler ne valide pas → faux webhooks, replay attacks
```

**Correctif — Ajouter `constructEventAsync` avant de confier à l'action :**
```typescript
import Stripe from "stripe";
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

// Dans le handler :
let event: Stripe.Event;
try {
  event = await stripe.webhooks.constructEventAsync(
    payload, signature, process.env.STRIPE_WEBHOOK_SECRET!
  );
} catch {
  return new Response("Invalid signature", { status: 400 });
}
// Vérification d'idempotence (anti-replay)
const already = await ctx.runQuery(internal.functions.payments.getProcessedEvent, { stripeEventId: event.id });
if (already) return new Response(JSON.stringify({ received: true }), { status: 200 });
```

---

### 🟡 MOYENNE — Faille #6 : Pas de Limite de Taille des Payloads HTTP

Aucun endpoint HTTP ne valide la taille du corps de la requête.
Attaque : payload de 100MB → épuise le compute Convex.

**Correctif (helper global) :**
```typescript
function validateSize(request: Request, maxBytes = 50_000): boolean {
  const cl = request.headers.get("content-length");
  return !cl || parseInt(cl) <= maxBytes;
}
// Dans chaque handler :
if (!validateSize(request, 10_000)) {
  return new Response(JSON.stringify({ error: "Payload too large" }), { status: 413 });
}
```

---

### 🟡 MOYENNE — Faille #7 : Warehouse API — Tables Sensibles Potentiellement Exportables

**Fichier :** `http.ts` L498-536

Si une table sensible (`users`, `profiles`) est dans `WAREHOUSE_TABLES`, elle est exportable
entièrement par quiconque ayant la clé API PostHog.

**Correctif :**
```typescript
const SAFE_EXPORT_TABLES = new Set(["requests", "appointments", "events", "services"]);
if (!SAFE_EXPORT_TABLES.has(tableName)) {
  return new Response(JSON.stringify({ error: "Table not available" }), { status: 404 });
}
```

---

## PARTIE 4 — DURCISSEMENT COMPLET

### 🔒 4.1 Système de Détection d'Intrusion (IDS) — NEOCORTEX IMMUNE

```
FLUX COMPLET D'UNE ATTAQUE DÉTECTÉE :

[ATTAQUE] → [SENSORIEL détecte] → [LIMBIQUE évalue priorité]
    ↓
CRITICAL → Blocage IP auto (24h) + SMS admin + rapport forensique
HIGH     → Rate-limit agressif + honeypot redirect + watch
MEDIUM   → Log + tarpit (réponse lente) + monitoring passif
    ↓
[PREFRONTAL décide] → [HIPPOCAMPE mémorise le pattern]
    ↓
[PLASTICITÉ adapte les seuils pour les futures attaques]
```

**Playbook de réponse automatisée :**

| Type d'Attaque | Détection | Réponse Auto | Escalade Humaine |
|---|---|---|---|
| **Brute Force Login** | >10 tentatives/5min | Block IP 24h + notif | Si >100 tentatives |
| **Credential Stuffing** | >50 emails/h | Block plage /24 | Toujours |
| **DDoS HTTP** | >1000 req/min | Block IP + CDN rule | Immédiat |
| **Honeypot Déclenché** | Accès à `/.env` etc. | Block IP + tarpit | Si organisé |
| **Token Replay** | Même token, 2 IPs | Invalider session | Toujours |
| **Data Exfiltration** | >1000 records/min | Throttle + alerte | Toujours |
| **Insider Threat** | Actions hors horaires | Micro-surveillance | Alerte immédiate |

---

### 🔒 4.2 Honeypots (Pièges à Attaquants)

```typescript
// convex/http.ts — Ajouter après les routes légitimes

const HONEYPOT_PATHS = [
  "/admin/login", "/wp-admin", "/wp-login.php",
  "/.env", "/.git/config", "/config.json",
  "/api/v1/admin", "/phpmyadmin", "/console",
  "/api/users/export", "/api/debug", "/xmlrpc.php",
];

for (const path of HONEYPOT_PATHS) {
  http.route({
    path,
    method: "GET",
    handler: httpAction(async (ctx, request) => {
      const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "unknown";
      
      // Enregistrer l'attaquant
      await ctx.scheduler.runAfter(0, internal.functions.intrusionDetection.detectAndRespond, {
        eventType: "HONEYPOT_TRIGGERED",
        sourceIp: ip,
        metadata: { path, userAgent: request.headers.get("user-agent") },
      });
      
      // Tarpit : répondre lentement (épuise les ressources de l'attaquant)
      await new Promise(r => setTimeout(r, 3000));
      return new Response(JSON.stringify({ error: "Not found" }), { status: 404 });
    }),
  });
}
```

---

### 🔒 4.3 Canary Tokens (Données Marquées — Détection de Fuite)

```typescript
// Si nos données sont volées et utilisées ailleurs,
// le canary token nous alerte automatiquement.

// Injecter dans les réponses aux scanners :
const canaryId = crypto.randomUUID();
// → Stocker dans auditLog
// → Si quelqu'un contacte /canary/{canaryId} → ALERTE CRITIQUE

http.route({
  pathPrefix: "/canary/",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    const tokenId = request.url.split("/canary/")[1];
    await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
      type: "CANARY_TRIGGERED",   // ← Nos données ont été utilisées par l'attaquant !
      source: "CANARY_SYSTEM",
      payload: { tokenId, triggeredAt: Date.now() },
      confiance: 1.0,
      priorite: "CRITICAL",
      correlationId: crypto.randomUUID(),
    });
    return new Response("", { status: 200 }); // Silencieux pour ne pas alerter l'attaquant
  }),
});
```

---

### 🔒 4.4 Audit Log Tamper-Evident (Hash Chain)

```typescript
// Chaque entrée contient le hash de la précédente.
// Impossible de modifier le passé sans invalider toute la chaîne.

async function appendSecureAuditEntry(ctx: any, entry: any) {
  const lastEntry = await ctx.db.query("auditLog").order("desc").first();
  const previousHash = lastEntry?.chainHash ?? "GENESIS";
  
  const content = JSON.stringify({ ...entry, timestamp: Date.now(), previousHash });
  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest("SHA-256", encoder.encode(content));
  const chainHash = Array.from(new Uint8Array(hashBuffer))
    .map(b => b.toString(16).padStart(2, "0")).join("");
  
  await ctx.db.insert("auditLog", { ...entry, timestamp: Date.now(), previousHash, chainHash });
}
// Vérification d'intégrité : si chainHash d'une entrée ne correspond pas → FALSIFICATION DÉTECTÉE
```

---

## PARTIE 5 — LLM POUR LA SÉCURITÉ

### 🧠 5.1 Quel LLM Utiliser

| LLM | Usage | Recommandation |
|---|---|---|
| **Gemini 2.0 Flash** | Analyse logs temps-réel, détection anomalies | ✅ **Principal** (déjà intégré) |
| **Claude 3.5 Sonnet** | Forensique approfondie, rapports de menace | ✅ **Secondaire** (raisonnement complexe) |
| **Llama 3.1 (local)** | Analyse de logs ultra-sensibles sans envoi externe | 🔷 Pour données classifiées |

### 🧠 5.2 Security AI Agent (Gemini)

```typescript
// convex/ai/securityAgent.ts — À créer

export const analyzeSecuritySignals = action({
  args: {},
  handler: async (ctx) => {
    const signals = await ctx.runQuery(internal.monitoring.getRecentSecuritySignals, {
      windowMs: 24 * 60 * 60 * 1000,
    });
    
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash-exp" });
    const prompt = `
Tu es un expert cybersécurité pour un portail gouvernemental gabonais.
Analyse ces ${signals.length} signaux et retourne un JSON :
{
  "threatLevel": "NONE|LOW|MEDIUM|HIGH|CRITICAL",
  "attackerProfile": "script_kiddie|organized_criminal|state_sponsored|insider",
  "mitreAttackTechniques": ["T1110", ...],
  "immediateActions": [...],
  "isCoordinated": boolean,
  "confidenceScore": 0.0-1.0,
  "narrativeSummary": "string en français"
}
Signaux : ${JSON.stringify(signals.slice(0, 50))}
    `;
    
    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text().match(/\{[\s\S]*\}/)![0]);
    
    if (analysis.threatLevel === "CRITICAL") {
      // Déclencher réponse automatique immédiate
      await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
        type: "LLM_THREAT_CRITICAL", source: "SECURITY_AI_AGENT",
        payload: analysis, confiance: analysis.confidenceScore, priorite: "CRITICAL",
        correlationId: crypto.randomUUID(),
      });
    }
    
    return analysis;
  },
});
```

### 🧠 5.3 Détection d'Insider Threat par LLM

Le LLM compare le **comportement normal** d'un utilisateur (30 derniers jours)
avec ses **actions récentes** (24 dernières heures) pour détecter :
- Accès en dehors des heures de bureau
- Téléchargements massifs inhabituels
- Accès à des zones non-autorisées
- Modifications/suppressions anormales

---

## PARTIE 6 — CHIFFREMENT DES DONNÉES SENSIBLES

### 🔐 6.1 AES-256-GCM pour les Champs Ultra-Sensibles

```typescript
// convex/lib/encryption.ts — À créer

export async function encryptField(plaintext: string): Promise<string> {
  const keyBytes = Uint8Array.from(atob(process.env.FIELD_ENCRYPTION_KEY!), c => c.charCodeAt(0));
  const key = await crypto.subtle.importKey("raw", keyBytes, { name: "AES-GCM" }, false, ["encrypt"]);
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const ciphertext = await crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, new TextEncoder().encode(plaintext));
  return `${btoa(String.fromCharCode(...iv))}.${btoa(String.fromCharCode(...new Uint8Array(ciphertext)))}`;
}
```

### 🔐 6.2 Champs Prioritaires à Chiffrer

| Champ | Table | Priorité |
|---|---|---|
| `passportNumber` | `profiles` | 🔴 CRITIQUE |
| `nationalId` | `profiles` | 🔴 CRITIQUE |
| `diplomaticContent` | `diplomaticLetters` | 🔴 CRITIQUE |
| `phoneNumber` | `profiles` | 🟠 HAUTE |
| `addressLine` | `profiles` | 🟡 MOYENNE |
| `pinHash` | `users` | ✅ Déjà hashé (scrypt) |

---

## PARTIE 7 — FEUILLE DE ROUTE PRIORISÉE

### 🚨 Sprint 1 — Semaine 1 (URGENT)

```bash
# Actions immédiates sans écrire une ligne de code
gitleaks detect --source . --verbose        # Scanner l'historique
git log --all -p | grep -i "API_SECRET"     # Chercher les fuites
```

- [ ] 🔴 **Révoquer et régénérer** LiveKit API Key/Secret, Bird API Key
- [ ] 🔴 **Vérifier `.gitignore`** inclut `.env.local`
- [ ] 🔴 **Transformer `verifyPin`** en `internalMutation`
- [ ] 🔴 **Valider `WAREHOUSE_TABLES`** — aucune table sensible
- [ ] 🟠 **Ajouter `DEPLOY_ENV` check** pour `/dev/sign-in`

### 🔶 Sprint 2 — Semaines 2-3

- [ ] **Security Headers** (CSP, HSTS, X-Frame-Options) sur toutes les apps
- [ ] **Validation taille payload** sur tous les endpoints HTTP
- [ ] **Honeypots** (`.env`, `wp-admin`, etc.)
- [ ] **Validation Stripe webhook** avec `constructEventAsync`
- [ ] **Rate limit par user ID** sur les Convex mutations critiques

### 🔷 Sprint 3 — Mois 2

- [ ] **Security AI Agent** (Gemini — analyse logs 24h)
- [ ] **Audit Log Hash Chain** (tamper-evident)
- [ ] **Canary Tokens** (détection de fuite de données)
- [ ] **MFA obligatoire** pour tous les comptes diplomatiques
- [ ] **AES-256-GCM** pour passeports, identifiants nationaux, correspondances classifiées

### 🟢 Sprint 4 — Mois 3-4

- [ ] Pentest par tiers (Bug Bounty program)
- [ ] SIEM externe (Datadog Security / Splunk)
- [ ] Certification ISO 27001 / conformité RGPD
- [ ] Red Team Exercises trimestriels
- [ ] Disaster Recovery Plan documenté et testé

---

## PARTIE 8 — CONFORMITÉ RGPD

| Obligation | Statut | Action Requise |
|---|---|---|
| Minimisation des données | 🟡 Partiel | Auditer les champs collectés |
| Droit à l'effacement | 🟡 Soft-delete only | Hard-delete + anonymisation |
| Portabilité des données | ❌ Absent | Endpoint d'export JSON |
| Notification de fuite 72h | ❌ Absent | Créer le playbook |
| Registre des traitements | ❌ Absent | Documenter par table |

---

## PARTIE 9 — CHECKLIST CONTINUE

```bash
# À exécuter à chaque sprint
gitleaks detect --source .                   # Secrets dans le code
bun audit                                    # Dépendances vulnérables
npx audit-ci --moderate

# Vérifier les headers de sécurité en production
curl -I https://consulat.ga | grep -E "(Content-Security|X-Frame|Strict-Transport)"

# Tester les honeypots (doit retourner 404 après 3s)
curl -v https://consulat.ga/.env

# Tester le CORS
curl -H "Origin: https://evil.com" -X OPTIONS \
  https://acrobatic-mole-132.convex.site/api/auth/ -v
# → Access-Control-Allow-Origin ne doit PAS apparaître

# Tester le rate limiting PIN
for i in {1..15}; do
  curl -s -o /dev/null -w "%{http_code}\n" \
    -X POST https://acrobatic-mole-132.convex.site/api/auth/pin-session \
    -d '{"email":"test@test.com","pin":"123456"}'
done
# → Doit retourner 429 après quelques tentatives
```

---

## CONCLUSION

Le système **gabon-diplomatie** possède une base solide :
- ✅ Authentification Better Auth + scrypt (state-of-art)
- ✅ RBAC hiérarchique bien implementé
- ✅ CORS strict sans wildcard
- ✅ Rate limiting backend (non-bypassable)
- ✅ Monitoring NEOCORTEX original et intelligent

**Actions critiques immédiates** :
1. 🔴 Révoquer les secrets LiveKit/Bird potentiellement exposés
2. 🔴 Rendre `verifyPin` internal (brute-force via SDK)
3. 🟠 Déployer les security headers CSP sur toutes les apps
4. 🟠 Ajouter la validation Stripe webhook cryptographique

Avec les corrections proposées, ce système peut atteindre un niveau de sécurité **souverain**, capable de résister à des APT (Advanced Persistent Threats) de niveau état-nation.

---

*Généré le 2 Avril 2026 — Classification : CONFIDENTIEL OkaTech*
*Skills utilisés : api-security-best-practices · backend-security-coder · frontend-mobile-security-xss-scan · auth-implementation-patterns · ai-engineer*
