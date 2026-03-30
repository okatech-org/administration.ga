---
name: auth-patterns
description: "🔐 Expert Authentification & Autorisation. S'active automatiquement pour tout travail lié à l'auth (login, JWT, sessions, rôles, permissions). Couvre Clerk, NextAuth, Better Auth, Supabase Auth, JWT custom, et les patterns RBAC avancés avec MFA et OAuth."
---

# 🔐 Skill : Authentication & Authorization Patterns

## Auto-Activation
- Mots-clés : auth, login, inscription, JWT, session, rôle, permission, accès, TaskCode, guard, protect, MFA, 2FA, OAuth, social login, password reset
- Fichiers : `*auth*`, `*guard*`, `*permission*`, `*role*`, `*session*`, `*middleware*`

## Systèmes d'Auth par Projet

| Projet | Système Auth | Fichier clé | Particularités |
|---|---|---|---|
| `consulat.ga` | **Convex Auth Custom** | `convex/lib/auth.ts` → `requireAuth()` | `authQuery`/`authMutation` via `customFunctions.ts` |
| `digitalium.io` | **Firebase Auth + Convex** | `contexts/FirebaseAuthContext.tsx` | Multi-persona (admin, pro, org, inst, subadmin) |
| `foot.cd` | **Clerk** | `@clerk/nextjs` middleware + JWT template | `clerkMiddleware` + `ConvexProviderWithClerk` |
| `evenement.ga` | **NextAuth v5** | `next-auth@5.0.0-beta` + `jose` | Credentials provider + JWT callbacks |
| `idetude.ga` | **Better Auth 1.4.9 + JWT Express** | `server/middleware/` + `better-auth@1.4.9` | 17-role hierarchy (Admin → SuperAdmin → ... → User) |
| `mairie.ga` | **Supabase Auth** | `integrations/supabase/` + RLS policies | `auth.uid()` dans RLS, session refresh + auth listeners |
| `sgg.ga` | **JWT Custom Express + Redis** | `contexts/AuthContext.tsx` + `backend/` | Sessions Redis côté serveur, PTM multi-niveaux |

---

## Pattern RBAC OkaTech — Position-Based (consulat.ga)

Le système le plus avancé est basé sur les **positions** :

```
TaskCode (permission atomique) → Position (poste avec tasks[]) → Membership (user dans une org)
```

### TaskCode — Source de vérité permissions
```ts
// convex/lib/taskCodes.ts
export const TaskCode = {
  requests: {
    view: "requests.view",
    create: "requests.create",
    process: "requests.process",
    validate: "requests.validate",
    assign: "requests.assign",
  },
  documents: {
    view: "documents.view",
    validate: "documents.validate",
    generate: "documents.generate",
  },
  team: {
    view: "team.view",
    manage: "team.manage",
    assign_roles: "team.assign_roles",
  },
  // ... etc
};
```

### Vérification côté Backend (Convex)
```ts
// convex/lib/permissions.ts
import { TaskCode } from "./taskCodes";
import { getTasksForMembership, canDoTask } from "./permissions";
import { authMutation } from "./customFunctions";

export const validateRequest = authMutation({
  args: { requestId: v.id("requests") },
  handler: async (ctx, { requestId }) => {
    // Récupérer la membership de l'utilisateur
    const membership = await ctx.db
      .query("memberships")
      .withIndex("byUser", q => q.eq("userId", ctx.user._id))
      .first();

    if (!membership) throw new ConvexError("No membership found");

    // Vérifier la permission atomique
    const allowed = await canDoTask(
      ctx,
      ctx.user._id,
      membership._id,
      TaskCode.requests.validate
    );

    if (!allowed) {
      throw new ConvexError("FORBIDDEN: cannot validate requests");
    }

    // Logique métier
    return ctx.db.patch(requestId, { status: "validated" });
  }
});
```

### Frontend — Hook useCanDoTask
```tsx
// src/hooks/useCanDoTask.ts
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { TaskCode } from "@/convex/lib/taskCodes";

export function useCanDoTask(taskCode: string) {
  const canDoTask = useQuery(api.auth.canDoTask, { taskCode });
  return canDoTask ?? false;
}

// Utilisation dans les composants
import { TaskCode } from "@/convex/lib/taskCodes";

function RequestActions({ request }) {
  const canValidate = useCanDoTask(TaskCode.requests.validate);
  const canAssign = useCanDoTask(TaskCode.requests.assign);

  return (
    <>
      {canValidate && <Button onClick={handleValidate}>Valider</Button>}
      {canAssign && <AssignSelect request={request} />}
    </>
  );
}
```

---

## Better Auth Pattern (idetude.ga)

### Setup et Provider Config
```ts
// server/auth.ts
import { betterAuth } from "@convex-dev/better-auth";

export const auth = betterAuth({
  database: {
    db: new ConvexDB(convexClient),
    type: "convex",
  },

  plugins: [
    // Rôles personnalisés (17-role hierarchy)
    roles({
      rolesFn: async (session) => {
        // Récupérer les rôles depuis Convex
        const userRole = await convexClient.query(api.users.getRole, {
          userId: session.user.id,
        });
        return userRole;
      },
    }),

    // MFA
    twoFactor({
      issuer: "idetude.ga",
    }),
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
    },
  },
});
```

### 17-Role Hierarchy (idetude.ga)
```ts
// server/lib/roles.ts
export enum UserRole {
  SUPER_ADMIN = "super_admin",      // niveau 0: accès total
  ADMIN = "admin",                  // niveau 1: gestion système
  MODERATOR = "moderator",          // niveau 2: modération contenu
  INSTRUCTOR = "instructor",        // niveau 3: création cours
  MENTOR = "mentor",                // niveau 4: accompagnement étudiant
  STUDENT = "student",              // niveau 5: apprenant
  GUEST = "guest",                  // niveau 6: accès limité
  // ... 10 autres rôles contextuels
}

export const roleHierarchy: Record<UserRole, number> = {
  [UserRole.SUPER_ADMIN]: 0,
  [UserRole.ADMIN]: 1,
  [UserRole.MODERATOR]: 2,
  [UserRole.INSTRUCTOR]: 3,
  [UserRole.MENTOR]: 4,
  [UserRole.STUDENT]: 5,
  [UserRole.GUEST]: 6,
};

// Vérifier si un rôle peut agir sur un autre
export function canActOn(actorRole: UserRole, targetRole: UserRole): boolean {
  return roleHierarchy[actorRole] < roleHierarchy[targetRole];
}
```

### Session Management
```ts
// server/middleware/sessionManager.ts
import { auth } from "../auth";

export async function getSessionFromRequest(req: Request) {
  const session = await auth.api.getSession({
    headers: req.headers,
  });

  // Valider la session + rafraîchir si nécessaire
  if (session && session.user) {
    // Vérifier l'expiration
    const expiresAt = new Date(session.expiresAt);
    if (new Date() > expiresAt) {
      // Rafraîchir la session
      const refreshed = await auth.api.refreshSession({
        sessionId: session.id,
      });
      return refreshed;
    }
  }

  return session;
}
```

---

## Clerk Pattern (foot.cd)

### Setup et ConvexProviderWithClerk
```tsx
// app/layout.tsx
import { ClerkProvider } from "@clerk/nextjs";
import { ConvexProviderWithClerk } from "convex/react-clerk";
import { ConvexReactClient } from "convex/react";

const convex = new ConvexReactClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export default function RootLayout({ children }) {
  return (
    <ClerkProvider>
      <ConvexProviderWithClerk client={convex}>
        {children}
      </ConvexProviderWithClerk>
    </ClerkProvider>
  );
}
```

### Middleware et clerkMiddleware
```ts
// middleware.ts
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isProtected = createRouteMatcher([
  "/dashboard(.*)",
  "/admin(.*)",
  "/api/protected(.*)",
]);

export default clerkMiddleware((auth, req) => {
  if (isProtected(req)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### JWT Template "convex"
Configurer dans Clerk Dashboard:
1. aller à **JWT Templates**
2. créer un nouveau template nommé `convex`
3. ajouter les claims personnalisées:

```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.first_name}} {{user.last_name}}",
  "picture": "{{user.profile_image_url}}",
  "roles": ["user"],
  "iat": "{{token.iat}}"
}
```

### Webhook User Sync
```ts
// app/api/webhooks/clerk/route.ts
import { Webhook } from "svix";
import { api } from "@/convex/_generated/api";
import { ConvexHttpClient } from "convex/browser";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const payload = await req.json();
  const evt = payload.data;
  const eventType = payload.type;

  if (eventType === "user.created") {
    // Synchroniser l'utilisateur Clerk → Convex
    await convex.mutation(api.users.syncFromClerk, {
      clerkId: evt.id,
      email: evt.email_addresses[0].email_address,
      name: `${evt.first_name} ${evt.last_name}`,
    });
  }

  if (eventType === "user.updated") {
    await convex.mutation(api.users.updateFromClerk, {
      clerkId: evt.id,
      email: evt.email_addresses[0].email_address,
    });
  }

  if (eventType === "user.deleted") {
    await convex.mutation(api.users.deleteFromClerk, {
      clerkId: evt.id,
    });
  }

  return Response.json({ status: "ok" });
}
```

---

## Supabase Auth Pattern (mairie.ga)

### RLS-Based Auth et Session Management
```sql
-- supabase/migrations/enable_rls.sql
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_read_own_documents" ON documents
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_create_documents" ON documents
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "users_can_update_own_documents" ON documents
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "users_can_delete_own_documents" ON documents
  FOR DELETE
  USING (auth.uid() = user_id);
```

### Supabase Auth Provider (React)
```tsx
// src/integrations/supabase/SupabaseAuthProvider.tsx
"use client";

import { useEffect, useState } from "react";
import { Session } from "@supabase/supabase-js";
import { supabase } from "./client";
import { AuthContext } from "@/contexts/AuthContext";

export function SupabaseAuthProvider({ children }) {
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // Récupérer la session actuelle
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      setLoading(false);
    });

    // Écouter les changements d'authentification
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);

      // Rafraîchir la session si elle est proche de l'expiration
      if (session && session.expires_at) {
        const expiresIn = session.expires_at * 1000 - Date.now();
        if (expiresIn < 60000) { // moins d'une minute
          supabase.auth.refreshSession();
        }
      }
    });

    return () => subscription?.unsubscribe();
  }, []);

  return (
    <AuthContext.Provider value={{ session, loading }}>
      {children}
    </AuthContext.Provider>
  );
}
```

### Session Refresh Pattern
```tsx
// src/hooks/useSupabaseSession.ts
import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function useSupabaseSession() {
  useEffect(() => {
    // Rafraîchir automatiquement 5 minutes avant l'expiration
    const interval = setInterval(async () => {
      const { data: { session } } = await supabase.auth.getSession();

      if (session?.expires_at) {
        const expiresIn = session.expires_at * 1000 - Date.now();
        if (expiresIn < 5 * 60 * 1000) {
          await supabase.auth.refreshSession();
        }
      }
    }, 1000 * 60); // Vérifier chaque minute

    return () => clearInterval(interval);
  }, []);
}
```

### Auth State Listeners
```tsx
// src/components/AuthStateListener.tsx
"use client";

import { useEffect } from "react";
import { supabase } from "@/integrations/supabase/client";

export function AuthStateListener() {
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (event, session) => {
        console.log("Auth event:", event);

        if (event === "SIGNED_IN") {
          // Utilisateur s'est connecté
          console.log("User signed in:", session?.user.email);
        }

        if (event === "SIGNED_OUT") {
          // Utilisateur s'est déconnecté
          console.log("User signed out");
        }

        if (event === "TOKEN_REFRESHED") {
          // Token rafraîchi
          console.log("Token refreshed");
        }
      }
    );

    return () => subscription?.unsubscribe();
  }, []);

  return null;
}
```

---

## Auth Flow Diagrams

### Pattern Convex Auth (consulat.ga)
```
┌─────────────────────────────────────────────────────────┐
│ CLIENT (React)                                          │
│                                                         │
│  useAuth() → checks identity from Convex session       │
└────────────────┬────────────────────────────────────────┘
                 │
                 ↓
┌─────────────────────────────────────────────────────────┐
│ CONVEX Backend                                          │
│                                                         │
│  authQuery/authMutation                                │
│  ├─ ctx.user injected automatically                    │
│  ├─ Check membership(s)                                │
│  ├─ Verify TaskCode permissions                        │
│  └─ Execute business logic if allowed                  │
└─────────────────────────────────────────────────────────┘
```

### Pattern Clerk + Convex (foot.cd)
```
┌──────────────────────────────────────┐
│ USER                                 │
│ logs in with Google/Email/Phone      │
└──────────────┬───────────────────────┘
               │
               ↓
        ┌──────────────┐
        │ CLERK        │
        │ - OIDC flow  │
        │ - Session    │
        └──────┬───────┘
               │
               ↓ (webhook)
        ┌──────────────┐
        │ API Route    │
        │ /webhooks/   │
        │ clerk        │
        └──────┬───────┘
               │
               ↓ (user.created)
        ┌──────────────────────┐
        │ CONVEX Mutation      │
        │ - upsert user        │
        │ - set metadata       │
        └──────────────────────┘
```

### Pattern Supabase Auth (mairie.ga)
```
┌─────────────────────────────────────┐
│ CLIENT (React)                      │
│                                     │
│ supabase.auth.signUp()              │
│ │                                   │
│ ↓ JWT token stored in localStorage  │
└────────────┬────────────────────────┘
             │
             ↓
   ┌─────────────────┐
   │ SUPABASE Cloud  │
   │ - Auth service  │
   │ - RLS policies  │
   └────────┬────────┘
            │
            ↓ (with JWT)
   ┌──────────────────┐
   │ Postgres DB      │
   │ RLS filters      │
   │ with auth.uid()  │
   └──────────────────┘
```

---

## Token Refresh Patterns

### Convex + Clerk Token Refresh
```tsx
// app/api/auth/refresh-token/route.ts
import { auth } from "@clerk/nextjs/server";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!);

export async function POST(req: Request) {
  const { userId } = await auth();

  if (!userId) {
    return Response.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    // Convex will handle token refresh automatically via ConvexProviderWithClerk
    const result = await convex.query(api.auth.getCurrentUser);
    return Response.json({ user: result });
  } catch (error) {
    return Response.json({ error: "Token refresh failed" }, { status: 401 });
  }
}
```

### Better Auth + Convex Token Lifecycle
```ts
// server/lib/tokenManager.ts
export async function refreshTokenIfNeeded(session: Session) {
  if (!session.expiresAt) return session;

  const now = new Date();
  const expiresAt = new Date(session.expiresAt);
  const timeUntilExpiry = expiresAt.getTime() - now.getTime();

  // Refresh if less than 5 minutes remaining
  if (timeUntilExpiry < 5 * 60 * 1000) {
    return await auth.api.refreshSession({
      sessionId: session.id,
    });
  }

  return session;
}
```

### Supabase Session Refresh with Auto-Retry
```ts
// src/lib/supabase-client.ts
import { createClient } from "@supabase/supabase-js";

export const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  {
    auth: {
      detectSessionInUrl: true,
      persistSession: true,
      autoRefreshToken: true,
      flowType: "pkce",
    },
    db: {
      schema: "public",
    },
    realtime: {
      params: {
        eventsPerSecond: 10,
      },
    },
  }
);

// Auto-refresh on every API call
supabase.auth.onAuthStateChange(async (event) => {
  if (event === "INITIAL_SESSION") {
    // Session loaded from storage
  } else if (event === "SIGNED_IN") {
    // User just signed in
  }
});
```

---

## Multi-Factor Authentication (MFA)

### Better Auth + TOTP Setup
```ts
// server/auth.ts (better-auth config)
import { twoFactor } from "@convex-dev/better-auth/plugins";

export const auth = betterAuth({
  plugins: [
    twoFactor({
      issuer: "MyApp",
      window: 1, // 30 sec window
    }),
  ],
});
```

### Frontend MFA Flow
```tsx
// src/components/MFASetup.tsx
"use client";

import { useAuth } from "@/hooks/useAuth";
import QRCode from "qrcode.react";
import { useState } from "react";

export function MFASetup() {
  const { user, enableMFA } = useAuth();
  const [secret, setSecret] = useState<string>();
  const [verificationCode, setVerificationCode] = useState("");

  async function handleEnableMFA() {
    const result = await enableMFA();
    setSecret(result.secret);
  }

  async function handleVerifyMFA() {
    await enableMFA({ verificationCode });
    // Success - MFA enabled
  }

  return (
    <div>
      <button onClick={handleEnableMFA}>Enable MFA</button>
      {secret && (
        <>
          <QRCode value={secret} />
          <input
            type="text"
            placeholder="Enter 6-digit code"
            value={verificationCode}
            onChange={(e) => setVerificationCode(e.target.value)}
          />
          <button onClick={handleVerifyMFA}>Verify & Enable</button>
        </>
      )}
    </div>
  );
}
```

### Login with MFA Challenge
```tsx
// src/components/LoginWithMFA.tsx
"use client";

import { useState } from "react";

export function LoginWithMFA() {
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState("");

  async function handleLogin(email: string, password: string) {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (response.status === 403) {
      // MFA required
      setMfaRequired(true);
    }
  }

  async function handleMFAVerify() {
    const response = await fetch("/api/auth/verify-mfa", {
      method: "POST",
      body: JSON.stringify({ code: mfaCode }),
    });

    if (response.ok) {
      // Success - redirect to dashboard
    }
  }

  return (
    <>
      {!mfaRequired ? (
        <form onSubmit={(e) => {
          e.preventDefault();
          // submit login
        }}>
          {/* email & password inputs */}
        </form>
      ) : (
        <input
          type="text"
          placeholder="Enter 6-digit MFA code"
          value={mfaCode}
          onChange={(e) => setMfaCode(e.target.value)}
        />
      )}
    </>
  );
}
```

---

## Password Reset Flow

### Better Auth Password Reset
```ts
// server/routes/auth.ts
import { auth } from "../auth";

export async function resetPassword(req: Request) {
  const { email } = await req.json();

  await auth.api.sendPasswordResetEmail({
    email,
    redirectURL: `${process.env.APP_URL}/auth/reset-password`,
  });

  return Response.json({ success: true });
}

export async function verifyResetToken(token: string) {
  const valid = await auth.api.verifyPasswordResetToken({ token });
  return valid;
}

export async function confirmPasswordReset(token: string, newPassword: string) {
  await auth.api.resetPassword({
    token,
    newPassword,
  });
}
```

### Supabase Password Reset
```ts
// src/lib/auth-supabase.ts
export async function requestPasswordReset(email: string) {
  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo: `${window.location.origin}/auth/reset-password`,
  });

  if (error) throw error;
}

export async function updatePassword(newPassword: string) {
  const { error } = await supabase.auth.updateUser({
    password: newPassword,
  });

  if (error) throw error;
}
```

### Frontend Reset UI
```tsx
// src/components/PasswordReset.tsx
"use client";

import { useState } from "react";
import { requestPasswordReset, updatePassword } from "@/lib/auth-supabase";

export function PasswordReset() {
  const [step, setStep] = useState<"request" | "confirm">("request");
  const [email, setEmail] = useState("");
  const [newPassword, setNewPassword] = useState("");

  async function handleRequest() {
    await requestPasswordReset(email);
    setStep("confirm");
  }

  async function handleConfirm() {
    await updatePassword(newPassword);
    // Redirect to login
  }

  return step === "request" ? (
    <form onSubmit={(e) => { e.preventDefault(); handleRequest(); }}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Your email"
      />
      <button type="submit">Send Reset Link</button>
    </form>
  ) : (
    <form onSubmit={(e) => { e.preventDefault(); handleConfirm(); }}>
      <input
        type="password"
        value={newPassword}
        onChange={(e) => setNewPassword(e.target.value)}
        placeholder="New password"
      />
      <button type="submit">Reset Password</button>
    </form>
  );
}
```

---

## Social Login Patterns

### Google OAuth (Better Auth)
```ts
// server/auth.ts
export const auth = betterAuth({
  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID!,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET!,
      redirectURL: `${process.env.APP_URL}/auth/callback/google`,
    },
  },
});
```

### GitHub OAuth (Supabase)
```tsx
// src/components/LoginWithGitHub.tsx
"use client";

import { supabase } from "@/integrations/supabase/client";

export function LoginWithGitHub() {
  async function handleLogin() {
    const { error } = await supabase.auth.signInWithOAuth({
      provider: "github",
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        scopes: "user:email",
      },
    });

    if (error) throw error;
  }

  return <button onClick={handleLogin}>Login with GitHub</button>;
}
```

### Google OAuth (Clerk)
```tsx
// Configured in Clerk Dashboard:
// Settings → OAuth → Google
// After setup, users can click "Continue with Google" on sign-in page

// Frontend (automatic with ClerkProvider):
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return <SignIn />;
}
```

### OAuth Callback Handler
```ts
// app/api/auth/callback/route.ts
import { auth } from "@/server/auth";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");

  try {
    // Exchange code for session
    const session = await auth.api.callback({
      code: code!,
      state: state!,
    });

    // Redirect to dashboard
    return Response.redirect(new URL("/dashboard", request.url));
  } catch (error) {
    return Response.redirect(new URL("/auth/error", request.url));
  }
}
```

---

## Cross-References to Dedicated Skills

Voir aussi:
- **better-auth** : Deep dive sur Better Auth, configuration avancée, plugins
- **clerk-auth** : Clerk-specific patterns, webhooks, JWT templates
- **supabase-backend** : RLS, Postgres policies, realtime subscriptions

---

## Anti-Patterns
- ❌ JAMAIS stocker des mots de passe en clair
- ❌ JAMAIS exposer les secrets JWT côté client
- ❌ JAMAIS faire confiance au rôle envoyé par le client — TOUJOURS vérifier côté serveur
- ❌ JAMAIS utiliser le système auth d'un projet dans un autre
- ❌ JAMAIS bypasser `canDoTask` — même pour les superadmins (la fonction gère déjà le cas)
- ❌ JAMAIS stocker les tokens de rafraîchissement dans localStorage sans encryption
- ❌ JAMAIS ignorer les expirations de session
- ❌ JAMAIS mettre MFA optionnel pour les comptes privilégiés
