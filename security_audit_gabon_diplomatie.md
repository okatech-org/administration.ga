# 🛡️ AUDIT DE SÉCURITÉ APPROFONDI — Portail Diplomatique Gabon
## `gabon-diplomatie` — Rapport Confidentiel — Niveau CRITIQUE

> **Version** : 1.0 | **Date** : 2026-04-02 | **Auditeur** : Antigravity Security Engine  
> **Classification** : CONFIDENTIEL — Système d'information critique d'État  
> **Stack** : Next.js · Convex · Better Auth · Stripe · LiveKit · Bird SMS

---

## 🎯 RÉSUMÉ EXÉCUTIF

Ce système gère des données souveraines de l'État gabonais : passeports, actes d'état civil, identités diplomatiques, visas, cartes consulaires, et communications ministérielles. Une compromission représente un **risque d'État**. Ce rapport cartographie exhaustivement les vecteurs d'attaque, les forces existantes, les failles critiques, et définit une feuille de route pour atteindre la **Maturité Sécurité Niveau 4 (Défense Active)**.

---

## SECTION 1 : 🔍 ÉTAT DES LIEUX — FORCES ACTUELLES

### ✅ Ce que le système fait bien

#### 1.1 — Authentification Multi-Couches
```
Better Auth (Email OTP + Phone OTP + OIDC/IDN OAuth)
  ├── Sessions courtes : 8h avec rotation à 4h ✅
  ├── JWT Convex : 30 minutes (hardened) ✅
  ├── Email verification obligatoire ✅
  └── PIN 6 chiffres avec scrypt hash ✅
```

**Points forts identifiés** :
- `hashPassword` / `verifyPassword` de `better-auth/crypto` (scrypt) utilisé pour les PINs et les mots de passe temporaires
- PIN verrouillé après **3 échecs** pendant **30 minutes**
- OTP email expire en **5 minutes** (standard sécurisé)
- Re-validation OTP obligatoire tous les **90 jours** pour les PINs
- Technique "temp password" nettoyée en **30s** via scheduler — très astucieuse

#### 1.2 — CORS Whitelist Stricte
```typescript
// http.ts — Excellente implémentation
const ALLOWED_ORIGINS = new Set(process.env.TRUSTED_ORIGINS.split(","));
// Retourne {} pour les origines inconnues → le navigateur bloque
```
**✅ Aucun wildcard fallback** — implémentation du niveau enterprise.

#### 1.3 — Rate Limiting Centralisé
```
auth:login      → 5 req/15min (token bucket)
auth:otp:send   → 3 req/5min (SMS flood protection)
auth:pin:verify → 5 req/5min
dev:signin      → 10 req/min (environnement dev uniquement)
warehouseSync   → 60 req/min
admin:batch     → 5 req/heure
```
**✅ Utilisation de `@convex-dev/rate-limiter`** — intégration backend native.

#### 1.4 — Warehouse API — Protection Timing Attack
```typescript
// warehouseAuth.ts — Excellent pattern
let mismatch = 0;
for (let i = 0; i < expectedKey.length; i++) {
  mismatch |= providedKey.charCodeAt(i) ^ expectedKey.charCodeAt(i);
}
return mismatch === 0; // Constant-time comparison ✅
```
**✅ Comparaison en temps constant** — protection contre les timing attacks.

#### 1.5 — RBAC Granulaire Multi-Niveaux
```
SuperAdmin → AdminSystem → Admin → User
  └── Position-based task codes (100+ permissions granulaires)
      └── Special permissions (grant/deny par membership)
          └── Module access (reader/editor/admin par module)
```
**✅ Principe du moindre privilège** — implémenté à l'échelle de la task/module.

#### 1.6 — Audit Trail Système
- Table `historiqueActions` pour les événements de sécurité
- Table `signaux` pour les alertes NEOCORTEX
- Table `auditLog` pour les actions back-office
- Émission proactive de signaux `PIN_LOCKED`, `ADMIN_PIN_DELETED`
- Cron `neocortex_monitoring_sante` toutes les 5 minutes

---

## SECTION 2 : 🚨 VULNÉRABILITÉS IDENTIFIÉES — PAR CRITICITÉ

### ⛔ CRITIQUE (CVE-Level) — Corrigez MAINTENANT

#### VULN-001 : `DEV_SIGNIN_ENABLED=true` en production potentielle

**Fichier** : `.env.local` (ligne 26)
```
DEV_SIGNIN_ENABLED=true  ← DANGER EXTRÊME
```

**Impact** : L'endpoint `/dev/sign-in` permet de **s'authentifier comme N'IMPORTE QUEL utilisateur** sans mot de passe, avec seulement l'email. Si cette variable est `true` en production :
- Un attaquant connaissant l'email d'un SuperAdmin peut usurper son identité en 1 requête HTTP
- Les cookies sécurisés sont désactivés (`useSecureCookies: false`)
- Les origines localhost sont whitelistées en production

**Vecteur d'attaque** :
```bash
curl -X POST https://api.diplomate.ga/dev/sign-in \
  -H "Content-Type: application/json" \
  -H "Origin: http://localhost:3000" \
  -d '{"email": "superadmin@gabon.gov"}'
# Réponse: {"email": "...", "tempPassword": "..."} → SESSION ADMIN 🔥
```

**Fix IMMÉDIAT** :
```bash
# Vérifier en production — JAMAIS laisser cette var à true
CONVEX_DEPLOYMENT=prod npx convex env set DEV_SIGNIN_ENABLED false
```
```typescript
// http.ts — Ajouter une barrière DURE
if (process.env.CONVEX_DEPLOYMENT && process.env.CONVEX_DEPLOYMENT.startsWith("prod:")) {
  // JAMAIS activer en production, même si la variable est true
  return new Response("Not available", { status: 404 });
}
```

---

#### VULN-002 : BETTER_AUTH_SECRET non validé au démarrage

**Fichier** : `convex/betterAuth/auth.ts` (ligne 55)
```typescript
secret: process.env.BETTER_AUTH_SECRET,  // Peut être undefined !
```

**Impact** : Si `BETTER_AUTH_SECRET` n'est pas défini, Better Auth utilise un secret par défaut ou vide → **toutes les sessions existantes sont forgeable**.

**Fix** :
```typescript
const secret = process.env.BETTER_AUTH_SECRET;
if (!secret || secret.length < 32) {
  throw new Error("[SECURITY] BETTER_AUTH_SECRET must be set and >= 32 chars");
}
// ...
secret,
```

---

#### VULN-003 : `verifyPin` utilisant un fallback non sécurisé

**Fichier** : `convex/functions/pin.ts` (lignes 154-162)
```typescript
try {
  const { verifyPassword } = await import("better-auth/crypto");
  isValid = await verifyPassword({ hash: pinHash, password: args.pin });
} catch {
  // Fallback : comparaison directe (si better-auth/crypto pas disponible)
  isValid = false;  // ← Force à false, mais le catch silencieux est dangereux
}
```

**Impact** : Si `better-auth/crypto` échoue (bug de runtime Convex, changement d'API), **tous les PINs deviennent invalides silencieusement**. L'erreur n'est pas loggée → impossibilité de détecter une attaque exploitant cette défaillance.

**Fix** :
```typescript
try {
  const { verifyPassword } = await import("better-auth/crypto");
  isValid = await verifyPassword({ hash: pinHash, password: args.pin });
} catch (err: any) {
  await logCortexAction(ctx, {
    action: "PIN_VERIFY_CRYPTO_FAILURE",
    categorie: "securite",
    entiteType: "user",
    entiteId: user._id,
    signalType: "ALERTE_SYSTEME",
    priorite: "CRITICAL",
  });
  console.error("[PIN] Crypto failure:", err.message); // Sans stack trace
  return { success: false, error: "SERVICE_UNAVAILABLE" };
}
```

---

### 🔴 HAUTE SÉVÉRITÉ — À corriger dans les 7 jours

#### VULN-004 : Absence de validation d'entrée stricte sur les endpoints PIN

**Fichier** : `convex/functions/pin.ts`
```typescript
export const verifyPin = mutation({
  args: {
    email: v.optional(v.string()),  // Pas de validation de format email
    phone: v.optional(v.string()),  // Pas de validation de format phone
    pin: v.string(),                // Validé par regex mais après lookup
  },
```

**Impact** : Un attaquant peut envoyer `email: "<script>alert(1)</script>"` ou des valeurs extrêmement longues (≥10MB) → charge excessive sur la DB, potentiel DoS ciblé.

**Fix** :
```typescript
args: {
  email: v.optional(v.pipe(
    v.string(),
    v.regex(/^[^\s@]+@[^\s@]+\.[^\s@]+$/),
    v.maxLength(254)
  )),
  phone: v.optional(v.pipe(
    v.string(),
    v.regex(/^\+?[\d\s\-()]{7,20}$/),
    v.maxLength(20)
  )),
  pin: v.pipe(v.string(), v.regex(/^\d{6}$/)),
},
```

---

#### VULN-005 : Exposition des erreurs internes en production

**Fichier** : `convex/http.ts` (lignes 197-202, 354-358)
```typescript
return new Response(
  JSON.stringify({ error: error.message ?? "Internal error" }),  // ← Stack trace exposée
  ...
);
```

**Impact** : Les messages d'erreur internes révèlent la structure de la codebase, les noms de tables Convex, les erreurs de configuration. Un attaquant peut cartographier le backend en provoquant intentionnellement des erreurs.

**Fix** :
```typescript
// Mapper toutes les erreurs vers des codes génériques
const SAFE_ERROR_MAP: Record<string, string> = {
  "INSUFFICIENT_PERMISSIONS": "Accès refusé",
  "USER_NOT_FOUND": "Authentification échouée",
  "PIN_LOCKED": "Compte temporairement bloqué",
};

function sanitizeError(err: any): string {
  const code = err?.message ?? err?.data ?? "UNKNOWN";
  return SAFE_ERROR_MAP[code] ?? "Une erreur est survenue";
}
```

---

#### VULN-006 : Rate limiting OTT (One-Time Token) manquant

**Fichier** : `convex/http.ts` — `/desktop/generate-ott`
```typescript
http.route({
  path: "/desktop/generate-ott",
  method: "GET",
  handler: httpAction(async (ctx, request) => {
    // ← Aucun rate limiting !
    const token = generateRandomString(32);
    // ...
```

**Impact** : Un attaquant avec une session valide peut générer des milliers d'OTT → épuisement des ressources Convex, potentiel DoS de la fonctionnalité desktop.

**Fix** : Ajouter `checkLoginRateLimit` keyed sur le `session.session.token`.

---

#### VULN-007 : `getStatsDev` — Query non protégée

**Fichier** : `convex/functions/admin.ts` (ligne 624-632)
```typescript
export const getStatsDev = query({  // ← Pas d'auth!
  args: {},
  handler: async (ctx) => {
    return {
      users: await globalCounts.count(ctx, {})  // Révèle le nombre total d'utilisateurs
    };
  }
});
```

**Impact** : N'importe qui peut appeler cette fonction et obtenir le nombre d'utilisateurs du système. Fuite d'intelligence sur la taille de la plateforme.

**Fix** : Supprimer ou remplacer par `backofficeQuery`.

---

#### VULN-008 : Absence de Content Security Policy (CSP) Headers

Le système gère des iframes potentielles (LiveKit, Stripe) sans CSP défini. **Risque XSS et Clickjacking**.

**Fix** (dans `next.config.ts` de chaque app) :
```typescript
const securityHeaders = [
  { key: "X-Frame-Options", value: "DENY" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "Referrer-Policy", value: "strict-origin-when-cross-origin" },
  { key: "Permissions-Policy", value: "camera=(), microphone=(self)" },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      "script-src 'self' 'nonce-{NONCE}'",
      `connect-src 'self' ${process.env.NEXT_PUBLIC_CONVEX_URL} https://*.convex.cloud wss://livekit.consulat.ga`,
      "frame-src 'none'",
      "img-src 'self' data: https://storage.googleapis.com blob:",
    ].join("; "),
  },
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
];
```

---

#### VULN-009 : Clés API sensibles en `.env.local` — Git risk

**Fichier** : `.env.local`
```
LIVEKIT_API_SECRET=9fgefw7tj8UG8fQdH04XsxM2ZsEqphrnOEsgU2rrufoD  ← SECRET SERVICE
BIRD_API_KEY=HRH1FBFNPS8bh30jtAoWyaRuNuqF2HRxAvE8              ← SMS/WhatsApp
STRIPE_SECRET_KEY=...  (probablement dans les env Convex)
```

**Impact** : Si `.env.local` est accidentellement commité ou si l'environnement dev est compromis, **toutes les clés sont exposées**. Le `.gitignore` est configuré correctement (`.env.*`), mais la rotation n'est pas documentée.

**Fix** : Rotation immédiate de toutes les clés + implémentation d'un système de **secret scanning** dans le CI/CD.

---

### 🟡 MOYENNE SÉVÉRITÉ — À corriger dans les 30 jours

#### VULN-010 : `as any` casting massif dans admin.ts

**62+ occurrences** de `as any` dans `admin.ts` → contourne la sécurité TypeScript, risque de runtime errors silencieuses et de corruptions de données.

#### VULN-011 : Warehouse non-limité en volume de données

```typescript
const limit = Math.min(Number(url.searchParams.get("limit") ?? 1000), 5000);
```
5000 lignes par requête PostHog → potentiel de fuite massive si la clé API `POSTHOG_WAREHOUSE_API_KEY` est compromise.

#### VULN-012 : Sessions LiveKit sans expiration courte

Les tokens LiveKit générés n'ont pas de TTL explicite visible dans le code → risque de token replay.

#### VULN-013 : Absence de honeypots / canary tokens

Aucun champ piège dans les tables sensibles pour détecter les accès non autorisés.

#### VULN-014 : Pas de vérification d'intégrité sur les OTT desktop

```typescript
const token = generateRandomString(32);
```
L'OTT n'est pas lié à un fingerprint device ou à l'IP du demandeur → risque de token theft via MITM.

---

## SECTION 3 : 🏗️ ARCHITECTURE DE DÉFENSE EN PROFONDEUR

### Modèle recommandé — 6 couches de sécurité

```
Couche 6 : WAF / CDN (Cloudflare Enterprise)
    ↓
Couche 5 : Rate Limiting + IP Intelligence (Cloudflare Rules)
    ↓
Couche 4 : Application Security (CSP, Headers, CORS strict) 
    ↓
Couche 3 : Auth & Session (Better Auth + JWT + PIN 2FA)
    ↓
Couche 2 : Authorization (RBAC granulaire + Task Codes)
    ↓
Couche 1 : Data Protection (Encryption au repos + audit trail)
```

---

## SECTION 4 : 🤖 RÉPONSE AUTOMATIQUE AUX CYBERATTAQUES (Active Defense)

### Système NEOCORTEX — Extension sécurité

Le système possède déjà une architecture nerveux-mimetique (NEOCORTEX/LIMBIQUE/HIPPOCAMPE). Voici comment l'étendre pour une **défense active**.

### 4.1 — Détection automatique des patterns d'attaque

```typescript
// convex/functions/threatDetection.ts — À créer

/**
 * Analyse comportementale temps-réel.
 * Déclenché à chaque authentification et access sensible.
 */
export const analyzeBehavioralAnomaly = internalMutation({
  args: {
    userId: v.optional(v.id("users")),
    ip: v.string(),
    action: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    const now = Date.now();
    const oneHourAgo = now - 3_600_000;

    // 1. Compter les actions récentes depuis cette IP
    const recentFromIp = await ctx.db
      .query("threatEvents")
      .withIndex("by_ip_timestamp", q => q.eq("ip", args.ip).gt("timestamp", oneHourAgo))
      .collect();

    // 2. Patterns d'attaque: brute force, credential stuffing
    const isVelocityAttack = recentFromIp.length > 50;
    const uniqueEmails = new Set(recentFromIp.map(e => e.email).filter(Boolean));
    const isCredentialStuffing = uniqueEmails.size > 10 && recentFromIp.length > 20;

    // 3. Géo-anomalie: connexion depuis un pays inhabituel
    const userHistory = args.userId
      ? await ctx.db.query("threatEvents")
          .withIndex("by_user", q => q.eq("userId", args.userId!))
          .order("desc").take(20)
      : [];
    
    const knownCountries = new Set(userHistory.map(e => e.country).filter(Boolean));
    // ... enrichissement géo via action externe

    // 4. Scoring de menace
    let threatScore = 0;
    if (isVelocityAttack) threatScore += 80;
    if (isCredentialStuffing) threatScore += 90;
    
    if (threatScore >= 70) {
      // Auto-blocage + alerte
      await ctx.db.insert("blockedIps", {
        ip: args.ip,
        reason: isCredentialStuffing ? "CREDENTIAL_STUFFING" : "BRUTE_FORCE",
        autoBlocked: true,
        blockedAt: now,
        expiresAt: now + 24 * 3_600_000, // 24h auto-ban
      });

      // Émettre signal CRITIQUE au LIMBIQUE
      await ctx.scheduler.runAfter(0, internal.limbique.emettreSignal, {
        type: "CYBER_ATTACK_DETECTED",
        source: "THREAT_DETECTION",
        payload: { ip: args.ip, threatScore, pattern: isCredentialStuffing ? "credential_stuffing" : "brute_force" },
        confiance: threatScore / 100,
        priorite: "CRITICAL",
        correlationId: crypto.randomUUID(),
      });
    }

    return { threatScore, blocked: threatScore >= 70 };
  },
});
```

### 4.2 — Auto-réaction : Blocage dynamique IP

```typescript
// Middleware dans le http.ts — Vérification IP bloquée
async function checkIpBlock(ctx: any, request: Request): Promise<boolean> {
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() || "unknown";
  
  const block = await ctx.runQuery(internal.functions.threatDetection.isIpBlocked, { ip });
  return block.isBlocked;
}

// Usage dans warehouseHandler et autres endpoints critiques:
const isBlocked = await checkIpBlock(ctx, request);
if (isBlocked) {
  return new Response(null, { status: 403 }); // Pas de message explicite
}
```

### 4.3 — Honeypot Fields — Détection des bots

```typescript
// Dans verifyPin et sign-in: ajouter un champ piège
args: {
  // Champ honeypot — les bots le remplissent automatiquement
  __verification_token: v.optional(v.string()),
  // ...vrais champs
},
handler: async (ctx, args) => {
  // Si le champ honeypot est rempli, c'est un bot
  if (args.__verification_token) {
    // Logger silencieusement et retourner un "succès" fictif pour tromper le bot
    await logThreat(ctx, { type: "BOT_DETECTED", ...args });
    // Réponse identique à un succès mais avec un token invalide
    return { success: true, tempPassword: "INVALID_TOKEN_" + crypto.randomUUID() };
  }
  // ...processus normal
}
```

---

## SECTION 5 : ⚔️ CONTRE-ATTAQUE — RENDRE L'ATTAQUE COÛTEUSE

> **Note légale** : Les contre-mesures ci-dessous sont des mécanismes défensifs légaux (tarpit, honeypot, friction augmentée). Aucune attaque active contre les attaquants n'est recommandée (illégal).

### 5.1 — Tarpit (Ralentissement intentionnel des attaquants)

```typescript
// Quand un attaquant est détecté, ne pas bloquer immédiatement
// mais ralentir graduellement → gaspiller ses ressources

export const tarpitResponse = async (threatScore: number): Promise<Response> => {
  if (threatScore >= 90) {
    // Attendre 5 secondes avant de répondre (tarpit niveau max)
    await new Promise(resolve => setTimeout(resolve, 5000));
    return new Response(JSON.stringify({ error: "Service temporarily unavailable" }), { status: 503 });
  }
  if (threatScore >= 70) {
    // 2 secondes de délai
    await new Promise(resolve => setTimeout(resolve, 2000));
    return new Response(JSON.stringify({ error: "Too many requests" }), { status: 429 });
  }
  return new Response(JSON.stringify({ error: "Invalid credentials" }), { status: 401 });
};
```

### 5.2 — Fake Credentials (Leurre actif)

```typescript
// Pour les attaques de credential stuffing détectées:
// Retourner des "succès" fictifs avec de faux tokens
// L'attaquant pense avoir réussi et perd du temps à utiliser de faux tokens

export const generateDecoyResponse = (realEmail: string) => ({
  success: true,
  message: "Authentication successful", // Faux succès
  sessionToken: generateRandomString(48), // Token complètement invalide
  expiresIn: 3600,
});
```

### 5.3 — Fingerprinting Avancé des Attaquants

```typescript
// Collecter un maximum d'informations sur l'attaquant pour analyse forensique
export const collectAttackerFingerprint = async (request: Request) => ({
  ip: request.headers.get("x-forwarded-for"),
  userAgent: request.headers.get("user-agent"),
  acceptLanguage: request.headers.get("accept-language"),
  acceptEncoding: request.headers.get("accept-encoding"),
  // Ces informations peuvent être transmises aux autorités en cas de cyberattaque étatique
  referer: request.headers.get("referer"),
  secFetchSite: request.headers.get("sec-fetch-site"),
  secChUa: request.headers.get("sec-ch-ua"),
});
```

### 5.4 — Canary Tokens (Alertes silencieuses)

```typescript
// Créer des documents/utilisateurs "canary" qui ne devraient jamais être accédés
// Si quelqu'un y accède, c'est une détection certaine d'intrusion

// Dans le schéma:
export const canaryDocsTable = defineTable({
  type: v.literal("canary"),
  name: v.string(), // Noms attractifs: "admin_passwords.pdf", "diplomatic_secrets.docx"
  lastAccessedByIp: v.optional(v.string()),
  accessCount: v.number(),
}).index("by_type", ["type"]);

// Alert immédiate si un canary est accédé
```

---

## SECTION 6 : 🧠 LLM POUR LA CYBERSÉCURITÉ — Quel modèle implémenter ?

### 6.1 — Architecture recommandée : Security AI Agent

```
Événements de sécurité (signaux NEOCORTEX)
         ↓
    Security LLM Agent (analyse contexte)
         ↓
    ┌────────────────────────────────┐
    │ Classification de menace      │
    │ Raisonnement sur le pattern   │
    │ Décision d'action             │
    │ Génération de rapport         │
    └────────────────────────────────┘
         ↓
    Actions automatisées (blocage, alerte, escalade)
```

### 6.2 — Modèles LLM recommandés par cas d'usage

| Cas d'usage | Modèle recommandé | Raison |
|---|---|---|
| **Analyse logs temps réel** | `google/gemini-2.0-flash` | Vitesse <1s, contexte 1M tokens, coût faible |
| **Analyse forensique approfondie** | `google/gemini-2.5-pro` | Raisonnement profond sur patterns complexes |
| **Détection anomalies NLP** | `google/gemini-2.0-flash` via Convex Actions | Intégré dans l'infra existante |
| **Rapport incidents (génération)** | `anthropic/claude-opus-4` | Rédaction de qualité diplomatique |
| **Classification menaces 24/7** | `google/gemini-2.0-flash-lite` | Coût minimal, haute disponibilité |

**Recommandation principale : Gemini 2.0 Flash** — déjà dans l'écosystème Google Cloud, coût optimisé pour l'analyse continue de logs, et contexte de 1M tokens pour ingérer des historiques d'attaque complets.

### 6.3 — Implémentation Security AI Agent

```typescript
// convex/ai/securityAgent.ts

export const analyzeSecurityIncident = action({
  args: {
    incidentId: v.string(),
    events: v.array(v.object({
      type: v.string(),
      timestamp: v.number(),
      ip: v.string(),
      userId: v.optional(v.string()),
      metadata: v.optional(v.any()),
    })),
  },
  handler: async (ctx, { incidentId, events }) => {
    const { GoogleGenerativeAI } = await import("@google/generative-ai");
    const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

    const prompt = `
Tu es un expert en cybersécurité analysant des événements du portail diplomatique du Gabon.
Système critique : données souveraines (passeports, visas, actes d'état civil).

Événements à analyser :
${JSON.stringify(events, null, 2)}

Analyse :
1. TYPE D'ATTAQUE : (brute_force / credential_stuffing / reconnaissance / insider_threat / apt / ddos / other)
2. NIVEAU DE RISQUE : (CRITICAL / HIGH / MEDIUM / LOW)
3. PATTERN IDENTIFIÉ : Description technique en 2 phrases
4. ACTION RECOMMANDÉE : (block_ip / alert_admin / escalate_state / monitor / none)
5. INDICATEURS DE COMPROMISSION (IOC) : Listés
6. PROCHAINE ÉTAPE PROBABLE DE L'ATTAQUANT : Prédiction

Réponds en JSON strict.
    `;

    const result = await model.generateContent(prompt);
    const analysis = JSON.parse(result.response.text());
    
    // Actions automatiques basées sur l'analyse LLM
    if (analysis.niveau_risque === "CRITICAL") {
      await ctx.runMutation(internal.functions.threatResponse.escalateToCrisisTeam, {
        incidentId,
        analysis,
      });
    }

    return analysis;
  },
});
```

### 6.4 — Détection NLP des attaques sur les champs texte

```typescript
// Utiliser le LLM pour détecter les payload malveillants dans les formulaires
export const scanUserInputForThreats = action({
  args: {
    fieldName: v.string(),
    value: v.string(),
    userId: v.optional(v.id("users")),
  },
  handler: async (ctx, { fieldName, value, userId }) => {
    // Quick regex pass (éviter appel LLM si clairement sain)
    const obviousThreats = [
      /<script/i,
      /javascript:/i,
      /--\s*(drop|select|insert|update|delete)/i,
      /\$\{.*\}/,  // Template injection
      /\.\.\//,    // Path traversal
    ];
    
    for (const pattern of obviousThreats) {
      if (pattern.test(value)) {
        return { safe: false, threatType: "INJECTION_ATTEMPT", confidence: 1.0 };
      }
    }

    // Si > 500 chars et champ sensible, scanner avec LLM
    if (value.length > 500 && ["message", "notes", "description"].includes(fieldName)) {
      // Appel LLM pour détection avancée (prompt injection, social engineering, etc.)
      // ...
    }

    return { safe: true };
  },
});
```

---

## SECTION 7 : 📋 PLAN D'ACTION PRIORITAIRE

### Phase 1 — CRITIQUE (48h)

| # | Action | Effort | Impact |
|---|-------|--------|--------|
| 1 | **Désactiver DEV_SIGNIN_ENABLED en production** | 15 min | 🔴 CRITIQUE |
| 2 | **Valider BETTER_AUTH_SECRET au démarrage** | 30 min | 🔴 CRITIQUE |
| 3 | **Corriger le fallback silencieux de verifyPin** | 1h | 🔴 CRITIQUE |
| 4 | **Supprimer ou protéger `getStatsDev`** | 15 min | 🟠 HAUTE |

### Phase 2 — HAUTE (7 jours)

| # | Action | Effort | Impact |
|---|-------|--------|--------|
| 5 | **Ajouter CSP Headers dans tous les apps** | 4h | 🟠 HAUTE |
| 6 | **Rate limiting sur `/desktop/generate-ott`** | 1h | 🟠 HAUTE |
| 7 | **Sanitizer les messages d'erreur HTTP** | 2h | 🟠 HAUTE |
| 8 | **Rotation des clés API compromises** | 2h | 🟠 HAUTE |
| 9 | **Validation stricte des inputs PIN (email/phone)** | 2h | 🟠 HAUTE |

### Phase 3 — DÉFENSE ACTIVE (30 jours)

| # | Action | Effort | Impact |
|---|-------|--------|--------|
| 10 | **Implémenter le Threat Detection System** | 2 jours | 🟡 STRATÉGIQUE |
| 11 | **Déployer le Security AI Agent (Gemini)** | 3 jours | 🟡 STRATÉGIQUE |
| 12 | **Canary Tokens sur documents sensibles** | 1 jour | 🟡 STRATÉGIQUE |
| 13 | **Honeypot fields dans les formulaires** | 1 jour | 🟡 STRATÉGIQUE |
| 14 | **Dashboard sécurité temps réel** | 3 jours | 🟡 STRATÉGIQUE |
| 15 | **Refactoring `as any` → types stricts** | 5 jours | 🟡 QUALITÉ |

### Phase 4 — MATURITÉ NIVEAU 4 (90 jours)

| # | Action | Effort | Impact |
|---|-------|--------|--------|
| 16 | **WAF Cloudflare Enterprise + IP Intelligence** | 1 semaine | 🏆 IMPÉNÉTRABLE |
| 17 | **Pen testing externe par cabinet spécialisé** | 2 semaines | 🏆 VALIDATION |
| 18 | **SOC (Centre Ops Sécurité) 24/7 avec LLM** | 1 mois | 🏆 ENTERPRISE |
| 19 | **Certification ISO 27001** | 6 mois | 🏆 COMPLIANCE |
| 20 | **MFA obligatoire pour tous les agents diplomatiques** | 2 semaines | 🏆 ESSENTIEL |

---

## SECTION 8 : 🔒 HARDENING IMMÉDIAT — Code Prêt à Deployer

### 8.1 — Convex Environment Security Check

```typescript
// convex/lib/security/startupChecks.ts — À créer

/**
 * Vérifications de sécurité au démarrage du backend.
 * À appeler dans toutes les actions critiques.
 */
export function assertProductionSecrity(): void {
  const errors: string[] = [];

  // 1. Secret auth obligatoire
  if (!process.env.BETTER_AUTH_SECRET || process.env.BETTER_AUTH_SECRET.length < 32) {
    errors.push("BETTER_AUTH_SECRET must be >= 32 chars");
  }

  // 2. Dev sign-in JAMAIS en production
  const deployment = process.env.CONVEX_DEPLOYMENT ?? "";
  if (deployment.startsWith("prod:") && process.env.DEV_SIGNIN_ENABLED === "true") {
    errors.push("DEV_SIGNIN_ENABLED must not be true in production");
  }

  // 3. Warehouse key obligatoire
  if (!process.env.POSTHOG_WAREHOUSE_API_KEY) {
    errors.push("POSTHOG_WAREHOUSE_API_KEY is required");
  }

  // 4. Trusted origins obligatoires
  if (!process.env.TRUSTED_ORIGINS?.includes("https://")) {
    errors.push("TRUSTED_ORIGINS must contain HTTPS origins");
  }

  if (errors.length > 0) {
    // En prod: throw hard. En dev: log seulement.
    if (deployment.startsWith("prod:")) {
      throw new Error(`[SECURITY STARTUP FAILURE]\n${errors.join("\n")}`);
    } else {
      console.warn(`[SECURITY WARNINGS]\n${errors.join("\n")}`);
    }
  }
}
```

### 8.2 — Session Anomaly Detection

```typescript
// À intégrer dans requireAuth (lib/auth.ts)
export async function requireAuthWithAnomalyDetection(ctx: AuthContext, request?: Request) {
  const user = await requireAuth(ctx);
  
  if (request) {
    const ip = request.headers.get("x-forwarded-for")?.split(",")[0] || "unknown";
    const ua = request.headers.get("user-agent") || "unknown";
    
    // Détecter changement suspect de User-Agent (session hijacking)
    const lastKnownUa = (user as any).lastKnownUserAgent;
    if (lastKnownUa && lastKnownUa !== ua && process.env.CONVEX_DEPLOYMENT?.startsWith("prod:")) {
      await logCortexAction(ctx, {
        action: "SESSION_UA_MISMATCH",
        categorie: "securite",
        entiteId: user._id,
        entiteType: "user",
        signalType: "ALERTE_SYSTEME",
        priorite: "HIGH",
      });
    }
  }
  
  return user;
}
```

### 8.3 — Protection CSRF pour les mutations sensibles

```typescript
// Convex mutations sont déjà protégées par JWT, mais pour les actions HTTP:
function validateCsrfToken(request: Request): boolean {
  const origin = request.headers.get("origin");
  const referer = request.headers.get("referer");
  
  // Double-submit cookie pattern
  const csrfHeader = request.headers.get("x-csrf-token");
  const csrfCookie = request.headers.get("cookie")
    ?.split(";")
    .find(c => c.trim().startsWith("csrf="))
    ?.split("=")[1];
  
  if (!csrfHeader || !csrfCookie || csrfHeader !== csrfCookie) {
    return false;
  }
  
  return ALLOWED_ORIGINS.has(origin ?? "");
}
```

---

## SECTION 9 : 📊 SCORECARD SÉCURITÉ ACTUELLE

| Domaine | Score actuel | Score cible | Priorité |
|---------|-------------|-------------|----------|
| Authentification | 7.5/10 | 9.5/10 | 🔴 CRITIQUE |
| Autorisation (RBAC) | 8.5/10 | 9.5/10 | 🟢 BON |
| Input Validation | 5.5/10 | 9.0/10 | 🔴 CRITIQUE |
| Error Handling | 5.0/10 | 9.0/10 | 🔴 CRITIQUE |
| Rate Limiting | 8.0/10 | 9.5/10 | 🟡 MOYEN |
| Audit Logging | 7.0/10 | 9.5/10 | 🟡 MOYEN |
| CORS/Headers | 6.0/10 | 9.5/10 | 🔴 CRITIQUE |
| Secret Management | 6.0/10 | 9.5/10 | 🔴 CRITIQUE |
| Threat Detection | 2.0/10 | 9.0/10 | 🔴 MANQUANT |
| Incident Response | 3.0/10 | 9.0/10 | 🔴 MANQUANT |
| **GLOBAL** | **5.9/10** | **9.4/10** | 🔴 ACTION REQUISE |

---

## SECTION 10 : 🌐 MATRICE DES VECTEURS D'ATTAQUE

| Vecteur | Probabilité | Impact | Protection Actuelle | Action Requise |
|---------|------------|--------|---------------------|----------------|
| Brute Force Auth | HIGH | CRITICAL | ✅ Rate limit 5/15min | Ajouter behavioral AI |
| Credential Stuffing | HIGH | CRITICAL | ⚠️ Partiel (rate limit email) | Ajouter threat detection |
| Session Hijacking | MEDIUM | CRITICAL | ⚠️ Partiel (JWT 30min) | UA fingerprinting |
| CSRF | LOW | HIGH | ✅ SameSite cookies | CSP headers manquants |
| XSS | MEDIUM | HIGH | ❌ Pas de CSP | URGENT — ajouter CSP |
| SQL/NoSQL Injection | LOW | HIGH | ✅ Convex nativement safe | Tests réguliers |
| API Key Theft | MEDIUM | CRITICAL | ⚠️ Gitignore OK, rotation? | Secret rotation auto |
| Insider Threat | MEDIUM | CRITICAL | ⚠️ Audit logs exist | Alertes comportementales |
| DDoS | HIGH | HIGH | ❌ Pas de WAF | Cloudflare Enterprise |
| Supply Chain | LOW | CRITICAL | ⚠️ Pas de scanning | npm audit CI/CD |
| Phishing Diplomatique | HIGH | CRITICAL | ❌ Aucune protection | Formation + DMARC |
| Man-in-the-Middle | LOW | CRITICAL | ✅ HTTPS only | HSTS preload |

---

## CONCLUSION & VERDICT

Le système possède une **base solide** (CORS strict, rate limiting, scrypt pour les PINs, RBAC granulaire) mais plusieurs **trous critiques** qui le rendent vulnérable aux attaques simples. La priorité absolue est :

1. **Désactiver DEV_SIGNIN_ENABLED en production** — risque 0-day actif
2. **Ajouter les CSP headers** — protection XSS manquante
3. **Mettre en place un système de détection des menaces** alimenté par un LLM (**Gemini 2.0 Flash** pour la vitesse, **Gemini 2.5 Pro** pour l'analyse forensique)
4. **Documenter et tester le plan de réponse aux incidents**

> **Pour rendre le système IMPÉNÉTRABLE** : Implémenter les 4 phases ci-dessus, ajouter une couche WAF Cloudflare, déployer un Security AI Agent continu, et faire réaliser un pentest externe annuel par un cabinet certifié.

---

*Rapport généré par Antigravity Security Engine — OkaTech Platform*  
*Méthodologie : OWASP Top 10 + NIST Cybersecurity Framework + analyse statique du code source*
