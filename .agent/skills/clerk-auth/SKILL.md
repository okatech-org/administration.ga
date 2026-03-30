---
name: Clerk Authentication
description: Clerk setup for Next.js + Convex with App Router, JWT templates, webhooks, and OrganizationSwitcher
activation:
  keywords:
    - clerk
    - auth
    - signin
    - signup
    - authentication
    - nextauth
    - jwt
  projects:
    - foot.cd
    - consulat.ga
---

# Clerk Authentication for OkaTech

## Overview

Clerk est une plateforme d'authentification moderne pour Next.js. Ce skill couvre l'intégration complète avec App Router, JWT templates nommés "convex", webhooks de synchronisation utilisateur, et patterns d'organisation multi-tenant.

## Installation

```bash
npm install @clerk/nextjs @clerk/react
```

## Configuration de Base

### 1. Variables d'Environnement

```bash
# .env.local
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=pk_test_...
CLERK_SECRET_KEY=sk_test_...
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Webhook
CLERK_WEBHOOK_SECRET=whsec_...
```

### 2. Middleware Setup

Dans `middleware.ts`:

```typescript
import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/sign-in(.*)",
  "/sign-up(.*)",
  "/",
  "/about",
  "/contact",
]);

export default clerkMiddleware((auth, request) => {
  // Protéger les routes non-publiques
  if (!isPublicRoute(request)) {
    auth().protect();
  }
});

export const config = {
  matcher: ["/((?!.+\\.[\\w]+$|_next).*)", "/", "/(api|trpc)(.*)"],
};
```

### 3. ClerkProvider en Root Layout

Dans `app/layout.tsx`:

```typescript
import { ClerkProvider } from "@clerk/nextjs";
import { ReactNode } from "react";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <html lang="fr">
        <body>{children}</body>
      </html>
    </ClerkProvider>
  );
}
```

## ConvexProviderWithClerk Configuration

Pour intégrer Convex avec Clerk:

### 1. Setup du Provider

Dans `app/layout.tsx` ou `app/providers.tsx`:

```typescript
"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { ClerkProvider } from "@clerk/nextjs";
import { useAuth } from "@clerk/nextjs";
import { ReactNode } from "react";

const convex = new ConvexReactClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

function ConvexProviderWithClerk({ children }: { children: ReactNode }) {
  return (
    <ClerkProvider>
      <ConvexProvider client={convex}>
        {children}
      </ConvexProvider>
    </ClerkProvider>
  );
}

export default ConvexProviderWithClerk;
```

### 2. Utilisation dans Root Layout

```typescript
import ConvexProviderWithClerk from "@/app/providers";

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html>
      <body>
        <ConvexProviderWithClerk>
          {children}
        </ConvexProviderWithClerk>
      </body>
    </html>
  );
}
```

## JWT Template "convex" Obligatoire

CRITIQUE: Clerk nécessite un JWT template nommé exactement "convex" pour Convex.

### Configuration dans Clerk Dashboard

1. Aller à Clerk Dashboard > JWT Templates
2. Créer un nouveau template nommé "convex"
3. Custom claims:
```json
{
  "sub": "{{user.id}}",
  "email": "{{user.primary_email_address}}",
  "name": "{{user.first_name}} {{user.last_name}}",
  "role": "{{user.public_metadata.role}}",
  "org_id": "{{user.organization.id}}",
  "org_role": "{{user.organization_memberships.0.role}}"
}
```

### Récupérer le JWT dans React

```typescript
// src/hooks/useConvexToken.ts
import { useAuth } from "@clerk/nextjs";
import { useEffect, useState } from "react";

export function useConvexToken() {
  const { getToken } = useAuth();
  const [token, setToken] = useState<string | null>(null);

  useEffect(() => {
    const fetchToken = async () => {
      const convexToken = await getToken({ template: "convex" });
      setToken(convexToken);
    };

    fetchToken();
  }, [getToken]);

  return token;
}
```

## Webhook pour User Sync

Synchroniser les utilisateurs Clerk avec Convex.

### 1. Route API pour Webhooks

Dans `app/api/webhooks/clerk/route.ts`:

```typescript
import { Webhook } from "svix";
import { headers } from "next/headers";
import { ConvexHttpClient } from "convex/browser";
import { api } from "@/convex/_generated/api";

const convex = new ConvexHttpClient(
  process.env.NEXT_PUBLIC_CONVEX_URL!
);

export async function POST(req: Request) {
  const headerPayload = headers();
  const svixId = headerPayload.get("svix-id");
  const svixTimestamp = headerPayload.get("svix-timestamp");
  const svixSignature = headerPayload.get("svix-signature");

  if (!svixId || !svixTimestamp || !svixSignature) {
    return new Response("Missing svix headers", { status: 400 });
  }

  const body = await req.text();

  const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);

  let evt: any;
  try {
    evt = wh.verify(body, {
      "svix-id": svixId,
      "svix-timestamp": svixTimestamp,
      "svix-signature": svixSignature,
    });
  } catch (error) {
    return new Response("Webhook verification failed", { status: 401 });
  }

  const eventType = evt.type;

  if (eventType === "user.created" || eventType === "user.updated") {
    const {
      id,
      email_addresses,
      first_name,
      last_name,
      public_metadata,
    } = evt.data;

    const email = email_addresses[0]?.email_address;

    try {
      await convex.mutation(api.users.syncClerkUser, {
        clerkId: id,
        email: email,
        name: `${first_name || ""} ${last_name || ""}`.trim(),
        role: public_metadata?.role || "user",
      });
    } catch (error) {
      console.error("Convex sync error:", error);
      return new Response("Convex sync failed", { status: 500 });
    }
  }

  if (eventType === "user.deleted") {
    const { id } = evt.data;

    try {
      await convex.mutation(api.users.deleteClerkUser, {
        clerkId: id,
      });
    } catch (error) {
      console.error("Convex delete error:", error);
      return new Response("Convex delete failed", { status: 500 });
    }
  }

  return new Response("Webhook processed", { status: 200 });
}
```

### 2. Mutations Convex pour Sync

Dans `convex/users.ts`:

```typescript
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const syncClerkUser = mutation({
  args: {
    clerkId: v.string(),
    email: v.string(),
    name: v.string(),
    role: v.string(),
  },
  handler: async (ctx, { clerkId, email, name, role }) => {
    // Chercher l'utilisateur existant
    const existing = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), clerkId))
      .first();

    if (existing) {
      // Mettre à jour
      return await ctx.db.patch(existing._id, {
        email,
        name,
        role,
        updatedAt: Date.now(),
      });
    }

    // Créer nouveau
    return await ctx.db.insert("users", {
      clerkId,
      email,
      name,
      role,
      createdAt: Date.now(),
      updatedAt: Date.now(),
    });
  },
});

export const deleteClerkUser = mutation({
  args: { clerkId: v.string() },
  handler: async (ctx, { clerkId }) => {
    const user = await ctx.db
      .query("users")
      .filter((q) => q.eq(q.field("clerkId"), clerkId))
      .first();

    if (user) {
      await ctx.db.delete(user._id);
    }
  },
});

export const getCurrentUser = query(async (ctx) => {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) return null;

  return await ctx.db
    .query("users")
    .filter((q) => q.eq(q.field("clerkId"), identity.subject))
    .first();
});
```

### 3. Schema Convex

Dans `convex/schema.ts`:

```typescript
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  users: defineTable({
    clerkId: v.string(), // ID unique de Clerk
    email: v.string(),
    name: v.string(),
    role: v.string(), // "admin", "user", etc.
    createdAt: v.number(),
    updatedAt: v.number(),
  })
    .index("by_clerk_id", ["clerkId"])
    .index("by_email", ["email"])
    .searchField("search_name", ["name"]),

  // Organisations (si multi-org)
  organizations: defineTable({
    clerkOrgId: v.string(),
    name: v.string(),
    slug: v.string(),
    createdAt: v.number(),
  }).index("by_clerk_org_id", ["clerkOrgId"]),
});
```

## SignIn et SignUp Components

### 1. Page de Connexion

Dans `app/sign-in/[[...sign-in]]/page.tsx`:

```typescript
import { SignIn } from "@clerk/nextjs";

export default function SignInPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignIn
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        redirectUrl="/"
      />
    </div>
  );
}
```

### 2. Page d'Inscription

Dans `app/sign-up/[[...sign-up]]/page.tsx`:

```typescript
import { SignUp } from "@clerk/nextjs";

export default function SignUpPage() {
  return (
    <div className="flex items-center justify-center min-h-screen">
      <SignUp
        appearance={{
          elements: {
            rootBox: "mx-auto",
            card: "shadow-lg",
          },
        }}
        redirectUrl="/onboarding"
      />
    </div>
  );
}
```

## Hooks useUser et useAuth

### Récupérer l'Utilisateur Actuel

```typescript
"use client";

import { useUser } from "@clerk/nextjs";

export function UserProfile() {
  const { user, isLoaded } = useUser();

  if (!isLoaded) return <div>Chargement...</div>;

  return (
    <div>
      <p>Email: {user?.emailAddresses[0]?.emailAddress}</p>
      <p>Nom: {user?.firstName} {user?.lastName}</p>
    </div>
  );
}
```

### Récupérer l'Auth et les Sessions

```typescript
"use client";

import { useAuth } from "@clerk/nextjs";

export function AuthInfo() {
  const { userId, sessionId, isSignedIn } = useAuth();

  return (
    <div>
      <p>Connecté: {isSignedIn ? "Oui" : "Non"}</p>
      <p>User ID: {userId}</p>
      <p>Session ID: {sessionId}</p>
    </div>
  );
}
```

## UserButton Customization

```typescript
"use client";

import { UserButton } from "@clerk/nextjs";

export function Header() {
  return (
    <header className="flex justify-between items-center p-4">
      <h1>OkaTech</h1>
      <UserButton
        appearance={{
          elements: {
            avatarBox: "h-10 w-10",
          },
        }}
        afterSignOutUrl="/"
        userProfileMode="modal"
        userProfileProps={{
          appearance: {
            elements: {
              rootBox: "p-6",
            },
          },
        }}
      />
    </header>
  );
}
```

## OrganizationSwitcher (Multi-Org)

Pour les projets multi-organisation:

```typescript
"use client";

import { OrganizationSwitcher, useOrganization } from "@clerk/nextjs";

export function OrgSwitcher() {
  const { organization } = useOrganization();

  return (
    <div>
      <OrganizationSwitcher
        appearance={{
          elements: {
            rootBox: "w-64",
            organizationPreviewButton: "hover:bg-gray-100",
          },
        }}
        organizationProfileMode="modal"
      />
      {organization && <p>Org actuelle: {organization.name}</p>}
    </div>
  );
}
```

## Protecting API Routes

### Route Handler Protégée

Dans `app/api/admin/users/route.ts`:

```typescript
import { auth } from "@clerk/nextjs/server";
import { NextResponse } from "next/server";

export async function GET() {
  const { userId } = auth();

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Vérifier le rôle depuis Convex
  const response = await fetch(
    `${process.env.NEXT_PUBLIC_CONVEX_URL}/api/users/checkRole`,
    {
      method: "POST",
      body: JSON.stringify({
        clerkId: userId,
        requiredRole: "admin",
      }),
    }
  );

  if (!response.ok) {
    return NextResponse.json(
      { error: "Forbidden" },
      { status: 403 }
    );
  }

  // Logique admin ici
  return NextResponse.json({ message: "Admin endpoint" });
}
```

### Utiliser getAuth() Côté Serveur

```typescript
import { getAuth } from "@clerk/nextjs/server";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { userId } = getAuth(req);

  if (!userId) {
    return NextResponse.json(
      { error: "Unauthorized" },
      { status: 401 }
    );
  }

  // Traiter la requête authentifiée
  const data = await req.json();
  return NextResponse.json({ success: true });
}
```

## Public Metadata pour Rôles

Stocker les rôles dans les metadata publiques de Clerk:

```typescript
// Dans une action serveur ou admin
import { clerkClient } from "@clerk/nextjs/server";

export async function assignRole(userId: string, role: string) {
  await clerkClient.users.updateUser(userId, {
    publicMetadata: {
      role: role, // "admin", "moderator", "user", etc.
    },
  });
}
```

Récupérer dans les custom claims du JWT:

```json
{
  "role": "{{user.public_metadata.role}}"
}
```

## Webhook Secret Configuration

1. Dans Clerk Dashboard, aller à Webhooks
2. Copier le webhook endpoint secret (commence par `whsec_`)
3. Ajouter à `.env.local`:
```bash
CLERK_WEBHOOK_SECRET=whsec_...
```
4. Vérifier que la signature est correcte dans la route webhook

## Anti-Patterns à Éviter

### 1. Oublier le JWT Template Nommé "convex"
```typescript
// MAUVAIS
const token = await getToken(); // Sans template, ne contient pas les custom claims

// BON
const token = await getToken({ template: "convex" }); // Avec les custom claims
```

### 2. Ne Pas Vérifier les Signatures Webhook
```typescript
// MAUVAIS
const evt = JSON.parse(body); // Accepter sans vérification

// BON
const wh = new Webhook(process.env.CLERK_WEBHOOK_SECRET!);
const evt = wh.verify(body, { ...svixHeaders }); // Vérifier la signature
```

### 3. Oublier d'Invoquer le Webhook dans Clerk Dashboard
```typescript
// MAUVAIS
// Créer la route webhook mais ne pas la configurer dans Clerk Dashboard

// BON
// 1. Créer app/api/webhooks/clerk/route.ts
// 2. Aller à Clerk Dashboard > Webhooks
// 3. Ajouter https://yourdomain.com/api/webhooks/clerk
// 4. Copier le secret dans CLERK_WEBHOOK_SECRET
```

### 4. Ne Pas Protéger les Routes Admin
```typescript
// MAUVAIS
export async function DELETE(req: NextRequest) {
  // Pas de vérification du rôle admin
  const data = await req.json();
  await deleteUser(data.id);
}

// BON
export async function DELETE(req: NextRequest) {
  const { userId } = getAuth(req);

  // Vérifier admin
  const user = await convex.query(api.users.checkAdmin, { clerkId: userId });
  if (!user?.isAdmin) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }

  await deleteUser(data.id);
}
```

## Environment Variables Checklist

```bash
# Obligatoires
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=

# Routes
NEXT_PUBLIC_CLERK_SIGN_IN_URL=/sign-in
NEXT_PUBLIC_CLERK_SIGN_UP_URL=/sign-up
NEXT_PUBLIC_CLERK_AFTER_SIGN_IN_URL=/
NEXT_PUBLIC_CLERK_AFTER_SIGN_UP_URL=/onboarding

# Webhook
CLERK_WEBHOOK_SECRET=

# Convex
NEXT_PUBLIC_CONVEX_URL=
```

## Checklist d'Implémentation

- [ ] Installer `@clerk/nextjs` et `@clerk/react`
- [ ] Configurer middleware.ts avec clerkMiddleware
- [ ] Ajouter ClerkProvider au layout racine
- [ ] Créer JWT template nommé "convex" dans Clerk Dashboard
- [ ] Implémenter route webhook `/api/webhooks/clerk`
- [ ] Synchroniser utilisateurs Convex via webhook
- [ ] Créer pages `/sign-in` et `/sign-up`
- [ ] Configurer le UserButton dans le header
- [ ] Protéger les API routes avec getAuth()
- [ ] Tester les webhooks avec Clerk CLI
- [ ] Configurer les variables d'environnement

## Tester les Webhooks Localement

```bash
# Installer Clerk CLI
npm install -g @clerk/clerk-cli

# Tunnel les webhooks vers localhost
clerk run --dev
```

## Ressources

- Clerk Docs: https://clerk.com/docs
- Clerk + Next.js: https://clerk.com/docs/quickstarts/nextjs
- Clerk + Convex: https://clerk.com/docs/integrations/databases/convex
- Convex + Clerk: https://docs.convex.dev/auth/clerk
