---
name: Better Auth Integration
description: Better Auth patterns for Convex projects with 17-role RBAC, multi-provider auth, and JWT tokens
activation:
  keywords:
    - better-auth
    - auth
    - role
    - permission
    - RBAC
    - multi-provider
  projects:
    - consulat.ga
    - idetude.ga
    - gabon-diplomatie
---

# Better Auth Integration for OkaTech

## Overview

Better Auth est une solution d'authentification moderne pour Convex. Ce skill couvre l'intégration complète avec support multi-provider, gestion des sessions, et un système de 17 rôles hiérarchiques adapté aux projets gouvernementaux OkaTech.

## Installation de Base

```bash
npm install better-auth @better-auth/convex-adapter
```

## Configuration Convex

### 1. Convex Adapter et Fonctions d'Auth

Dans `convex/auth.ts`:

```typescript
import { convexAdapter } from "@better-auth/convex-adapter";
import { betterAuth } from "better-auth";
import { ConvexHttpClient } from "convex/browser";

export const auth = betterAuth({
  database: convexAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "OkaTech App",

  // Endpoints: optionnel si utilise avec Express proxy
  trustedOrigins: [
    "http://localhost:5173",
    "http://localhost:3000",
    process.env.VITE_PUBLIC_APP_URL || "",
  ],

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  oauth2: {
    // Configuration OAuth par project
  },

  plugins: [
    // Optional: sessions, two factor, etc.
  ],
});

export type Session = typeof auth.$Infer.Session;
```

### 2. Convex Query pour Récupérer la Session

Dans `convex/users.ts`:

```typescript
import { query } from "./_generated/server";
import { auth } from "./auth";

export const getCurrentUser = query(async (ctx) => {
  // Better Auth gère les sessions via cookies/headers
  // Cette query retourne l'utilisateur actuel depuis la session
  const session = await auth.api.getSession({
    headers: ctx.headers,
  });

  if (!session) return null;

  return {
    id: session.user.id,
    email: session.user.email,
    name: session.user.name,
    role: session.user.role,
    metadata: session.user.metadata,
  };
});

export const getUserById = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    return await ctx.db.get(userId);
  },
});
```

## Hiérarchie de 17 Rôles (idetude.ga Pattern)

Structure des rôles dans Convex schema:

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

const ROLES = [
  "super_admin",
  "admin",
  "national_director",
  "regional_director",
  "departmental_director",
  "commune_director",
  "local_director",
  "school_director",
  "teacher",
  "parent",
  "student",
  "partner",
  "finance_director",
  "inspector",
  "moderator",
  "support_agent",
  "api",
] as const;

export default defineSchema({
  users: defineTable({
    email: v.string(),
    name: v.string(),
    emailVerified: v.boolean(),
    role: v.union(...ROLES.map(r => v.literal(r))),
    departmentId: v.optional(v.id("departments")),
    regionId: v.optional(v.id("regions")),
    schoolId: v.optional(v.id("schools")),
    metadata: v.optional(v.object({})),
    createdAt: v.number(),
  })
    .index("by_email", ["email"])
    .index("by_role", ["role"])
    .index("by_school", ["schoolId"])
    .searchField("search_name", ["name"]),

  sessions: defineTable({
    userId: v.id("users"),
    token: v.string(),
    expiresAt: v.number(),
  }).index("by_user", ["userId"]),
});
```

## RBAC avec TaskCode Pattern (consulat.ga)

Importer depuis `lib/customFunctions.ts`:

```typescript
// convex/lib/customFunctions.ts
import {
  query as convexQuery,
  mutation as convexMutation,
  action as convexAction,
} from "../_generated/server";
import { v } from "convex/values";

type RequiredRole = string | string[];

const checkRole = (userRole: string, required: RequiredRole): boolean => {
  if (typeof required === "string") {
    return userRole === required;
  }
  return required.includes(userRole);
};

export const authQuery = (
  requiredRole: RequiredRole,
  handler: (ctx: any, args: any) => Promise<any>
) => {
  return convexQuery(async (ctx, args) => {
    const session = await ctx.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    if (!checkRole(session.user.role, requiredRole)) {
      throw new Error("Forbidden: insufficient role");
    }

    return handler(ctx, args);
  });
};

export const authMutation = (
  requiredRole: RequiredRole,
  handler: (ctx: any, args: any) => Promise<any>
) => {
  return convexMutation(async (ctx, args) => {
    const session = await ctx.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    if (!checkRole(session.user.role, requiredRole)) {
      throw new Error("Forbidden: insufficient role");
    }

    return handler(ctx, args);
  });
};

export const authAction = (
  requiredRole: RequiredRole,
  handler: (ctx: any, args: any) => Promise<any>
) => {
  return convexAction(async (ctx, args) => {
    const session = await ctx.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    if (!checkRole(session.user.role, requiredRole)) {
      throw new Error("Forbidden: insufficient role");
    }

    return handler(ctx, args);
  });
};
```

Utilisation:

```typescript
// convex/documents.ts
import { authQuery, authMutation } from "./lib/customFunctions";
import { v } from "convex/values";

export const listDocuments = authQuery(
  ["admin", "national_director", "regional_director"],
  async (ctx, args) => {
    return await ctx.db
      .query("documents")
      .collect();
  }
);

export const createDocument = authMutation(
  "admin",
  async (ctx, { title, content }) => {
    const userId = (await ctx.auth.getSession())!.user.id;

    return await ctx.db.insert("documents", {
      title,
      content,
      createdBy: userId,
      createdAt: Date.now(),
    });
  }
);
```

## Multi-Provider Setup

### Email/Password + OAuth

```typescript
// convex/auth.ts (extended)
export const auth = betterAuth({
  database: convexAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,
  appName: "OkaTech",
  baseURL: process.env.BETTER_AUTH_URL || "http://localhost:5173",

  emailAndPassword: {
    enabled: true,
    requireEmailVerification: true,
  },

  socialProviders: {
    google: {
      clientId: process.env.GOOGLE_CLIENT_ID || "",
      clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
    },
    github: {
      clientId: process.env.GITHUB_CLIENT_ID || "",
      clientSecret: process.env.GITHUB_CLIENT_SECRET || "",
    },
  },

  magicLink: {
    enabled: true,
  },

  phoneNumber: {
    enabled: true,
    // Optionnel: configurer SMS provider
  },
});
```

### Magic Links (Sans Mot de Passe)

```typescript
// convex/auth.ts
import { magicLinkProvider } from "@better-auth/providers";

export const auth = betterAuth({
  database: convexAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,

  plugins: [
    magicLinkProvider({
      sendMagicLinkEmail: async (url, email) => {
        // Utiliser Convex sendEmail action
        await ctx.runAction(internal.email.sendMagicLink, {
          email,
          url,
        });
      },
    }),
  ],
});
```

## Session Management et JWT

### Tokens et Expiration

```typescript
// convex/auth.ts
export const auth = betterAuth({
  database: convexAdapter(),
  secret: process.env.BETTER_AUTH_SECRET,

  session: {
    expiresIn: 60 * 60 * 24 * 7, // 7 jours
    updateAge: 60 * 60 * 24, // Renouveler après 24h
    cookieAttributes: {
      secure: process.env.NODE_ENV === "production",
      httpOnly: true,
      sameSite: "lax",
    },
  },

  jwt: {
    expiresIn: 60 * 60 * 24 * 30, // 30 jours
  },
});
```

### Récupérer la Session côté Client (React)

```typescript
// src/hooks/useSession.ts
import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";
import type { Session } from "@better-auth/types";

export const useSession = () => {
  const { data: session, isLoading } = useQuery({
    queryKey: ["session"],
    queryFn: async () => {
      const response = await fetch("/api/auth/session");
      if (!response.ok) return null;
      return response.json() as Promise<Session | null>;
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  });

  return {
    session,
    isLoading,
    isAuthenticated: !!session,
    user: session?.user,
    role: session?.user.role,
  };
};
```

## Express API Middleware (idetude.ga Pattern)

Pour les projets avec Express backend (ex: idetude.ga):

```typescript
// server/middleware/auth.ts
import { Router, Request, Response, NextFunction } from "express";
import jwt from "jsonwebtoken";

interface AuthRequest extends Request {
  user?: {
    id: string;
    email: string;
    role: string;
  };
}

export const authMiddleware = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.headers.authorization?.split(" ")[1];

  if (!token) {
    return res.status(401).json({ error: "Missing token" });
  }

  try {
    const decoded = jwt.verify(token, process.env.BETTER_AUTH_SECRET!) as any;
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid token" });
  }
};

export const requireRole = (requiredRoles: string | string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const roles = typeof requiredRoles === "string" ? [requiredRoles] : requiredRoles;

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ error: "Forbidden" });
    }

    next();
  };
};

// Utilisation:
// router.get("/api/admin/users", authMiddleware, requireRole("admin"), getUsers);
```

## Protected Routes (React Router)

```typescript
// src/components/ProtectedRoute.tsx
import { useSession } from "@/hooks/useSession";
import { Navigate } from "react-router-dom";
import type { ReactNode } from "react";

interface ProtectedRouteProps {
  children: ReactNode;
  requiredRole?: string | string[];
}

export function ProtectedRoute({
  children,
  requiredRole
}: ProtectedRouteProps) {
  const { isAuthenticated, role, isLoading } = useSession();

  if (isLoading) {
    return <div>Chargement...</div>;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (requiredRole) {
    const roles = typeof requiredRole === "string" ? [requiredRole] : requiredRole;
    if (!roles.includes(role || "")) {
      return <Navigate to="/unauthorized" replace />;
    }
  }

  return <>{children}</>;
}

// Utilisation dans router:
// {
//   path: "/admin",
//   element: (
//     <ProtectedRoute requiredRole={["admin", "super_admin"]}>
//       <AdminDashboard />
//     </ProtectedRoute>
//   ),
// }
```

## User Profile Management

```typescript
// convex/users.ts
import { authMutation } from "./lib/customFunctions";
import { v } from "convex/values";

export const updateProfile = authMutation(
  "*", // Tous les rôles authentifiés
  async (ctx, { name, metadata }) => {
    const session = await ctx.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    return await ctx.db.patch(session.user.id, {
      name,
      metadata: {
        ...session.user.metadata,
        ...metadata,
      },
      updatedAt: Date.now(),
    });
  }
);

export const getUserMetadata = authQuery(
  "*",
  async (ctx, args) => {
    const session = await ctx.auth.getSession();
    if (!session) throw new Error("Unauthorized");

    const user = await ctx.db.get(session.user.id);
    return user?.metadata || {};
  }
);
```

## Anti-Patterns à Éviter

### 1. Ne Jamais Stocker les Mots de Passe en Clair
```typescript
// MAUVAIS
export const createUser = mutation({
  args: { email: v.string(), password: v.string() },
  handler: async (ctx, { email, password }) => {
    // NE PAS FAIRE: garder le mot de passe en clair
    return await ctx.db.insert("users", { email, password });
  },
});

// BON: Laisser Better Auth gérer le hachage
```

### 2. Ne Pas Faire Confiance à l'Auth Client-Side Uniquement
```typescript
// MAUVAIS
export const deleteUser = query({
  args: { userId: v.id("users") },
  handler: async (ctx, { userId }) => {
    // NE PAS FAIRE: pas de vérification de rôle
    return await ctx.db.delete(userId);
  },
});

// BON: Toujours vérifier server-side
export const deleteUser = authMutation(
  "admin",
  async (ctx, { userId }) => {
    // Vérification obligatoire du rôle
    return await ctx.db.delete(userId);
  }
);
```

### 3. Toujours Vérifier Server-Side
```typescript
// MAUVAIS
// Client envoie role: "admin" en body
const createPost = mutation({
  args: { content: v.string(), role: v.string() },
  handler: async (ctx, { content, role }) => {
    if (role === "admin") {
      // NE PAS FAIRE: accepter le rôle du client
      return await ctx.db.insert("posts", { content });
    }
  },
});

// BON: Récupérer le rôle depuis la session serveur
export const createPost = authMutation(
  ["admin", "national_director"],
  async (ctx, { content }) => {
    // Le rôle vient de la session, pas du client
    const session = await ctx.auth.getSession();
    return await ctx.db.insert("posts", {
      content,
      authorId: session!.user.id,
    });
  }
);
```

## Variables d'Environnement

```bash
# .env.local
BETTER_AUTH_SECRET=your_secret_key_min_32_chars
BETTER_AUTH_URL=http://localhost:5173

# OAuth (si utilisé)
GOOGLE_CLIENT_ID=
GOOGLE_CLIENT_SECRET=

GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# Email (pour magic links)
EMAIL_FROM=noreply@okatech.app
SMTP_HOST=
SMTP_PORT=
SMTP_USER=
SMTP_PASSWORD=
```

## Checklist d'Implémentation

- [ ] Installer `better-auth` et `@better-auth/convex-adapter`
- [ ] Créer `convex/auth.ts` avec configuration complète
- [ ] Configurer les rôles dans `convex/schema.ts`
- [ ] Implémenter `authQuery`, `authMutation`, `authAction` dans `lib/customFunctions.ts`
- [ ] Créer le hook `useSession()` pour React
- [ ] Protéger les routes avec `ProtectedRoute`
- [ ] Configurer les providers (email, OAuth, magic links)
- [ ] Mettre en place les webhooks pour synchronisation
- [ ] Tester chaque rôle avec les permissions
- [ ] Configurer les variables d'environnement

## Ressources

- Better Auth Docs: https://www.better-auth.com/
- Convex Adapter: https://www.better-auth.com/docs/integrations/convex
- OkaTech consulat.ga: patterns TaskCode RBAC
- OkaTech idetude.ga: 17-role hierarchy
