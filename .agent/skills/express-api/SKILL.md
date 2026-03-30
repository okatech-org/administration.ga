---
name: express-api
description: "🔧 Expert Express.js API Backend. S'active automatiquement pour les projets avec un serveur Express (idetude.ga, sgg.ga). Couvre les routes, middleware, authentification JWT, validation Zod, et les patterns API REST."
---

# 🔧 Skill : Express.js API Backend Expert

## Auto-Activation
- Fichier dans `server/` ou `backend/`
- Import de `express`
- Projets : `idetude.ga` (Express v5 + pg + Convex), `sgg.ga` (Express + Redis)

## Architecture Réelle idetude.ga

```
server/
├── api.ts              # Point d'entrée — app.listen + routes
├── accountRoutes.ts    # CRUD comptes utilisateur
├── identityRoutes.ts   # Routes iDID (identité numérique)
├── countryRouter.ts    # Routes pays/établissements
├── countryProvisioner.ts # Provisioning de données pays
├── seed.ts             # Script de seed de la DB
├── lib/                # Utilitaires partagés
│   └── db.ts           # Pool PostgreSQL (pg)
├── middleware/
│   ├── auth.ts         # JWT verification
│   └── validation.ts   # Zod middleware
└── tsconfig.json       # Config TS séparée pour le serveur
```

## Pattern de Route (idetude.ga)
```ts
import { Router, Request, Response, NextFunction } from "express";
import { z } from "zod";
import { authMiddleware } from "./middleware/auth";

const router = Router();

// Validation schema
const createAccountSchema = z.object({
  email: z.string().email(),
  firstName: z.string().min(1),
  lastName: z.string().min(1),
  role: z.enum(["student", "teacher", "director", "parent"]),
});

// POST /api/accounts
router.post("/", authMiddleware, async (req: Request, res: Response, next: NextFunction) => {
  try {
    const data = createAccountSchema.parse(req.body);
    const result = await pool.query(
      `INSERT INTO users (email, first_name, last_name, role) VALUES ($1, $2, $3, $4) RETURNING *`,
      [data.email, data.firstName, data.lastName, data.role]
    );
    res.status(201).json({ success: true, data: result.rows[0] });
  } catch (error) {
    if (error instanceof z.ZodError) {
      return res.status(400).json({ error: "Validation", details: error.flatten() });
    }
    next(error);
  }
});

export default router;
```

## Pattern API Unifiée (sgg.ga)
```ts
// src/services/api.ts — Client HTTP centralisé
const API_BASE = import.meta.env.VITE_API_URL || "/api";

export const api = {
  async get<T>(endpoint: string, params?: Record<string, string>): Promise<T> {
    const url = new URL(`${API_BASE}${endpoint}`);
    if (params) Object.entries(params).forEach(([k, v]) => url.searchParams.set(k, v));
    const res = await fetch(url.toString(), { headers: getAuthHeaders() });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
  async post<T>(endpoint: string, body: unknown): Promise<T> {
    const res = await fetch(`${API_BASE}${endpoint}`, {
      method: "POST",
      headers: { ...getAuthHeaders(), "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) throw new ApiError(res.status, await res.text());
    return res.json();
  },
};
```

## Proxy Vite → Express
```ts
// vite.config.ts (idetude.ga)
export default defineConfig({
  server: {
    proxy: {
      "/api": {
        target: "http://localhost:4000",
        changeOrigin: true,
      },
    },
  },
});
```

## Rôles idetude.ga (17 rôles hiérarchiques)
```
super_admin → regional_director → provincial_inspector → district_inspector 
→ principal → vice_principal → teacher → librarian → counselor → nurse 
→ secretary → accountant → parent → student → visitor → system → api
```

## Anti-Patterns
- ❌ JAMAIS mettre la logique métier dans les routes
- ❌ JAMAIS oublier `try/catch` + `next(error)` dans les handlers
- ❌ JAMAIS renvoyer des stack traces en production
- ❌ JAMAIS oublier `helmet()` + `cors()` en production
- ❌ JAMAIS instancier `Pool` multiple fois (utiliser singleton)
