---
name: convex-backend
description: Expert Convex Backend covering schemas, queries, mutations, actions, validation, file storage, migrations, performance, and real-time subscriptions
activation: Files in convex/ or imports from convex; keywords schema, query, mutation, action, table, index, storage, seed, workflow, migration, performance
projects: consulat.ga, digitalium.io, evenement.ga, foot.cd, idetude.ga, secretariat-general-gouv, AGASA-Pro, AGASA-Admin, AGASA-Core, AGASA-Citoyen, AGASA-Inspect
---

# Expert Convex Backend Skill

This skill covers comprehensive Convex patterns including official best practices and community patterns.

---

## Quick Reference: OkaTech Architecture

**For consulat.ga (reference project):**
```
convex/
├── _generated/           # Auto-generated — NEVER MODIFY
├── schema.ts             # Imports from schemas/*.ts
├── schemas/              # One file per table
│   ├── index.ts          # Barrel exports
│   ├── users.ts
│   ├── requests.ts
│   └── ...
├── lib/                  # Shared logic
│   ├── auth.ts           # requireAuth, requireSuperadmin
│   ├── customFunctions.ts  # ⚠️ CRITICAL — authQuery, authMutation, authAction
│   ├── constants.ts      # Enums (RequestStatus, etc.)
│   ├── errors.ts         # ErrorCode + error factories
│   ├── permissions.ts    # Task/position verification
│   ├── taskCodes.ts      # TaskCode enum — permission source of truth
│   ├── neocortex.ts      # Centralized audit trail (logCortexAction)
│   ├── aggregates.ts     # Denormalized counters
│   ├── requestWorkflow.ts # State machine (12 statuses)
│   ├── validators.ts     # Reusable Convex validators
│   └── utils.ts
├── triggers/             # Aggregate triggers
├── migrations/           # One-shot migration scripts
└── http.ts               # HTTP Actions (webhooks)
```

**Critical import rule (consulat.ga, idetude.ga):**
```ts
// ✅ ALWAYS use these in consulat.ga
import { authQuery, authMutation, authAction } from "./lib/customFunctions";

// ❌ NEVER import directly from _generated/server in consulat.ga
// import { query, mutation } from "./_generated/server";

// ✅ Other projects use standard imports
import { query, mutation, action } from "convex/server";
```

---

## 1. DATABASE SCHEMA & DATA MODELING

### Schema Definition Pattern

```ts
// convex/schemas/users.ts
import { defineTable } from "convex/server";
import { v } from "convex/values";

export const usersTable = defineTable({
  // Required fields
  email: v.string(),
  name: v.string(),

  // Optional fields
  avatar: v.optional(v.string()),
  role: v.optional(v.string()),

  // References (use v.id())
  orgId: v.optional(v.id("orgs")),

  // Arrays
  permissions: v.optional(v.array(v.string())),

  // Nested objects (for denormalized data)
  profile: v.optional(v.object({
    bio: v.string(),
    location: v.string(),
  })),

  // Enums (use v.union + v.literal)
  status: v.union(
    v.literal("active"),
    v.literal("inactive"),
    v.literal("suspended")
  ),
})
  .index("by_email", ["email"])
  .index("by_orgId", ["orgId"])
  .index("by_status", ["status"])
  .index("by_org_status", ["orgId", "status"]);

// convex/schemas/index.ts — Barrel export
export { usersTable } from "./users";
export { requestsTable } from "./requests";
export { documentsTable } from "./documents";

// convex/schema.ts — Final composition
import { defineSchema } from "convex/server";
import { usersTable, requestsTable, documentsTable } from "./schemas";

export default defineSchema({
  users: usersTable,
  requests: requestsTable,
  documents: documentsTable,
});
```

### System Fields (Auto-Managed)
- `_id`: `Id<"tableName">` — automatically set, do NOT define
- `_creationTime`: `number` (ms epoch) — automatically set, do NOT define

### Validators Reference (v)
```ts
v.id("tableName")           // Document reference
v.string()                  // String
v.number()                  // Float64
v.int32() / v.int64()       // Integers
v.boolean()                 // Boolean
v.null()                    // Null literal
v.literal("exact")          // Exact string literal
v.union(v1, v2, v3)         // Union type
v.array(v.string())         // Typed array
v.object({...})             // Typed object
v.optional(v.string())      // Optional field (undefined | type)
v.bytes()                   // ArrayBuffer/Uint8Array
v.any()                     // ⚠️ AVOID — loses type safety

// Validator manipulation
v.string().pick("field1", "field2")     // Pick fields from union
v.object({...}).omit("secretField")     // Omit field from object
v.object({...}).extend({newField: v.string()}) // Add field
v.object({...}).partial()                // All fields optional
```

### Indexing Best Practices

```ts
defineTable({
  orgId: v.id("orgs"),
  userId: v.id("users"),
  status: v.string(),
  createdAt: v.number(),
})
  // Single-field indexes for filtering
  .index("by_org", ["orgId"])
  .index("by_user", ["userId"])
  .index("by_status", ["status"])

  // Multi-field indexes for common queries
  .index("by_org_status", ["orgId", "status"])
  .index("by_user_created", ["userId", "createdAt"])

  // For sorting + filtering combos
  .index("by_org_created", ["orgId", "createdAt"]);
```

**Index Strategy:**
- Always index fields used in `.withIndex("indexName", q => q.eq(...))`
- Use composite indexes for `where orgId = X AND status = Y` queries
- Order matters: equality filters first, then sort fields
- Avoid indexing high-cardinality fields that don't filter (like email)

---

## 2. QUERIES, MUTATIONS & ACTIONS

### Query Pattern (Read-Only)

```ts
import { query } from "convex/server";
import { v } from "convex/values";

export const list = query({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(v.string()),
    limit: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Queries cannot call mutations or access storage
    let q = ctx.db.query("requests")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }

    const results = await q
      .order("desc")
      .take(args.limit ?? 100);

    return results;
  },
});

export const getById = query({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    return await ctx.db.get(args.id);
  },
});
```

### Mutation Pattern (Write)

```ts
import { mutation } from "convex/server";
import { v } from "convex/values";

export const create = mutation({
  args: {
    orgId: v.id("orgs"),
    title: v.string(),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const id = await ctx.db.insert("requests", {
      orgId: args.orgId,
      title: args.title,
      content: args.content || "",
      status: "pending",
      createdAt: Date.now(),
    });

    return { _id: id, ...args };
  },
});

export const patch = mutation({
  args: {
    id: v.id("requests"),
    title: v.optional(v.string()),
    content: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    const existing = await ctx.db.get(args.id);
    if (!existing) throw new Error("Not found");

    const updates: Partial<typeof existing> = {};
    if (args.title !== undefined) updates.title = args.title;
    if (args.content !== undefined) updates.content = args.content;

    await ctx.db.patch(args.id, updates);
    return { ...existing, ...updates };
  },
});

export const remove = mutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    await ctx.db.delete(args.id);
  },
});
```

### Action Pattern (Server-Only Logic)

```ts
import { action } from "convex/server";
import { v } from "convex/values";

export const sendEmail = action({
  args: {
    userId: v.id("users"),
    email: v.string(),
    subject: v.string(),
  },
  handler: async (ctx, args) => {
    // Actions can:
    // - Call fetch/external APIs
    // - Access environment variables
    // - Call runQuery/runMutation via ctx

    const user = await ctx.runQuery(api.users.getById, { id: args.userId });

    const response = await fetch("https://api.sendgrid.com/...", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${process.env.SENDGRID_API_KEY}`,
      },
      body: JSON.stringify({
        to: args.email,
        subject: args.subject,
      }),
    });

    if (!response.ok) throw new Error("Email send failed");

    // Log the action in your audit trail
    await ctx.runMutation(api.auditLog.log, {
      action: "email_sent",
      userId: args.userId,
    });

    return { success: true };
  },
});
```

### HTTP Actions (Webhooks)

```ts
import { httpAction } from "convex/server";
import { v } from "convex/values";

export const handleWebhook = httpAction(async (ctx, request) => {
  // Verify webhook signature
  const signature = request.headers.get("x-signature");
  if (!verifySignature(signature, request.body)) {
    return new Response("Unauthorized", { status: 401 });
  }

  const body = await request.json();

  // Process webhook
  await ctx.runMutation(api.events.record, {
    type: body.type,
    data: body.data,
  });

  return new Response(JSON.stringify({ ok: true }), { status: 200 });
});
```

### Internal Functions (Never Called from Client)

```ts
// Mark functions that should never be called from the client
import { internalQuery, internalMutation } from "convex/server";

export const incrementCounter = internalMutation({
  args: { counterId: v.id("counters"), delta: v.number() },
  handler: async (ctx, args) => {
    const counter = await ctx.db.get(args.counterId);
    await ctx.db.patch(args.counterId, {
      value: (counter?.value ?? 0) + args.delta,
    });
  },
});

// Only called from other server functions
export const getSystemConfig = internalQuery({
  args: {},
  handler: async (ctx) => {
    const config = await ctx.db.query("config").first();
    return config;
  },
});
```

### OkaTech Pattern: Custom Functions (consulat.ga, idetude.ga)

```ts
// convex/lib/customFunctions.ts
import { customQuery, customMutation, customAction, customCtx } from "convex-helpers/server/customFunctions";
import { rawMutation, query } from "convex/server";
import { requireAuth } from "./auth";
import triggers from "./triggerSetup";

// Standard mutation (no auth required)
export const mutation = customMutation(rawMutation, customCtx(triggers.wrapDB));

// Query with mandatory auth — ctx.user available
export const authQuery = customQuery(query, customCtx(async (ctx) => {
  const user = await requireAuth(ctx);
  return { user };
}));

// Mutation with mandatory auth — ctx.user available
export const authMutation = customMutation(rawMutation, customCtx(async (ctx) => {
  const user = await requireAuth(ctx);
  return { ...triggers.wrapDB(ctx), user };
}));

// Action with auth
export const authAction = customAction(action, customCtx(async (ctx) => {
  const user = await requireAuth(ctx);
  return { user };
}));
```

**Usage in consulat.ga:**
```ts
import { authQuery, authMutation } from "./lib/customFunctions";

export const list = authQuery({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    // ctx.user is guaranteed here
    return await ctx.db.query("requests")
      .withIndex("by_org", q => q.eq("orgId", args.orgId))
      .collect();
  },
});

export const updateStatus = authMutation({
  args: { id: v.id("requests"), status: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    await ctx.db.patch(args.id, { status: args.status });

    // Audit trail via Neocortex
    await logCortexAction(ctx, {
      action: "request.status_changed",
      entiteId: args.id,
      userId: ctx.user._id,
      avant: { status: request.status },
      apres: { status: args.status },
    });
  },
});
```

---

## 3. VALIDATION & ERROR HANDLING

### Argument Validation Pattern

```ts
import { z } from "zod";
import { v } from "convex/values";

// Convex validators (at function boundary)
export const createRequest = mutation({
  args: {
    title: v.string(),
    priority: v.union(v.literal("low"), v.literal("high")),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Convex validates args before handler runs
    // Additional validation inside handler

    if (args.title.length > 500) {
      throw new Error("Title too long");
    }

    return { created: true };
  },
});

// Zod for complex validation (inside handlers)
const UpdateUserSchema = z.object({
  email: z.string().email(),
  age: z.number().min(0).max(150),
  preferences: z.object({
    newsletter: z.boolean(),
    language: z.enum(["en", "fr", "es"]),
  }).optional(),
});

export const updateUser = mutation({
  args: { id: v.id("users"), data: v.any() },
  handler: async (ctx, args) => {
    const validated = UpdateUserSchema.parse(args.data);
    // Now safely use validated data
    await ctx.db.patch(args.id, validated);
  },
});
```

### Validator Manipulation

```ts
import { v } from "convex/values";

// Extend validator
const baseUserValidator = v.object({
  name: v.string(),
  email: v.string(),
});

const createUserValidator = baseUserValidator.extend({
  password: v.string(),
});

// Pick/omit from object validators
const updateUserValidator = baseUserValidator.omit("email");

// Partial (all fields optional)
const patchUserValidator = baseUserValidator.partial();
```

### Error Handling Pattern

```ts
// convex/lib/errors.ts
export class ApiError extends Error {
  constructor(
    public code: string,
    message: string,
    public status: number = 400
  ) {
    super(message);
  }
}

export const errors = {
  notFound: (resource: string) =>
    new ApiError("NOT_FOUND", `${resource} not found`, 404),

  unauthorized: () =>
    new ApiError("UNAUTHORIZED", "You are not authorized", 401),

  forbidden: () =>
    new ApiError("FORBIDDEN", "You do not have permission", 403),

  validation: (message: string) =>
    new ApiError("VALIDATION_ERROR", message, 400),
};

// In mutations
export const deleteRequest = mutation({
  args: { id: v.id("requests"), userId: v.id("users") },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);
    if (!request) throw errors.notFound("Request");

    const user = await ctx.db.get(args.userId);
    if (!user || !user.permissions.includes("delete_requests")) {
      throw errors.forbidden();
    }

    await ctx.db.delete(args.id);
  },
});
```

---

## 4. PAGINATION & FILTERING

### Cursor-Based Pagination

```ts
export const listPaginated = query({
  args: {
    orgId: v.id("orgs"),
    limit: v.number(),
    cursor: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("requests")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId));

    // Cursor-based: skip to cursor, then take
    const results = await q
      .order("desc")
      .take(args.limit + 1);  // Fetch one extra to detect hasMore

    const hasMore = results.length > args.limit;
    const items = results.slice(0, args.limit);

    // Cursor is the _id of the last item
    const nextCursor = hasMore ? items[items.length - 1]._id : null;

    return { items, nextCursor, hasMore };
  },
});
```

### Filtering with Multiple Conditions

```ts
export const list = query({
  args: {
    orgId: v.id("orgs"),
    status: v.optional(v.string()),
    priority: v.optional(v.string()),
    search: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    let q = ctx.db.query("requests")
      .withIndex("by_org_status", (q) => q.eq("orgId", args.orgId));

    if (args.status) {
      q = q.filter((q) => q.eq(q.field("status"), args.status));
    }

    if (args.priority) {
      q = q.filter((q) => q.eq(q.field("priority"), args.priority));
    }

    // Text search (inefficient for large datasets — see Full-Text Search below)
    if (args.search) {
      q = q.filter((q) =>
        q.or(
          q.regex(q.field("title"), args.search),
          q.regex(q.field("description"), args.search)
        )
      );
    }

    return await q.collect();
  },
});
```

---

## 5. FILE STORAGE

### Upload URL Pattern

```ts
export const generateUploadUrl = mutation({
  args: {},
  handler: async (ctx) => {
    return await ctx.storage.generateUploadUrl();
  },
});
```

**Client-side React:**
```tsx
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

function FileUpload() {
  const generateUploadUrl = useMutation(api.files.generateUploadUrl);
  const attachFile = useMutation(api.files.attachFile);

  const handleUpload = async (file: File) => {
    const uploadUrl = await generateUploadUrl();

    const response = await fetch(uploadUrl, {
      method: "POST",
      headers: { "Content-Type": file.type },
      body: file,
    });

    const { storageId } = await response.json();

    await attachFile({
      docId: myDocId,
      fileName: file.name,
      storageId,
    });
  };

  return <input type="file" onChange={(e) => handleUpload(e.target.files[0])} />;
}
```

### File URL & Serving

```ts
export const getUrl = query({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    return await ctx.storage.getUrl(args.storageId);
  },
});

export const deleteFile = mutation({
  args: { storageId: v.id("_storage") },
  handler: async (ctx, args) => {
    await ctx.storage.delete(args.storageId);
  },
});
```

### File Metadata Storage

```ts
const documentsTable = defineTable({
  orgId: v.id("orgs"),
  title: v.string(),
  attachments: v.array(v.object({
    storageId: v.id("_storage"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    uploadedAt: v.number(),
  })),
}).index("by_org", ["orgId"]);

export const attachFile = mutation({
  args: {
    docId: v.id("documents"),
    fileName: v.string(),
    fileSize: v.number(),
    mimeType: v.string(),
    storageId: v.id("_storage"),
  },
  handler: async (ctx, args) => {
    const doc = await ctx.db.get(args.docId);
    const attachments = doc?.attachments ?? [];

    attachments.push({
      storageId: args.storageId,
      fileName: args.fileName,
      fileSize: args.fileSize,
      mimeType: args.mimeType,
      uploadedAt: Date.now(),
    });

    await ctx.db.patch(args.docId, { attachments });
  },
});
```

---

## 6. REAL-TIME SUBSCRIPTIONS

### Subscription Pattern

```ts
export const watchRequests = query({
  args: { orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    return await ctx.db.query("requests")
      .withIndex("by_org", (q) => q.eq("orgId", args.orgId))
      .collect();
  },
});
```

**Client-side (real-time updates):**
```tsx
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

function RequestList({ orgId }: { orgId: Id<"orgs"> }) {
  const requests = useQuery(api.requests.watchRequests, { orgId });

  if (requests === undefined) {
    return <div>Loading...</div>;
  }

  return (
    <div>
      {requests.map((req) => (
        <div key={req._id}>{req.title}</div>
      ))}
    </div>
  );
}
```

Convex automatically re-runs the query whenever the returned documents change.

---

## 7. AUTHENTICATION & AUTHORIZATION

### requireAuth Pattern

```ts
// convex/lib/auth.ts
import { QueryCtx, MutationCtx } from "./_generated/server";

export async function requireAuth(ctx: QueryCtx | MutationCtx) {
  const identity = await ctx.auth.getUserIdentity();
  if (!identity) throw new Error("Not authenticated");

  const user = await ctx.db.query("users")
    .withIndex("by_email", (q) => q.eq("email", identity.email))
    .first();

  if (!user) throw new Error("User not found");

  return user;
}

export async function requireSuperadmin(ctx: QueryCtx | MutationCtx) {
  const user = await requireAuth(ctx);
  if (user.role !== "superadmin") {
    throw new Error("Superadmin required");
  }
  return user;
}

export async function requireRole(ctx: QueryCtx | MutationCtx, role: string) {
  const user = await requireAuth(ctx);
  if (user.role !== role) {
    throw new Error(`Role ${role} required`);
  }
  return user;
}
```

### Permission Checking Pattern (consulat.ga)

```ts
// convex/lib/permissions.ts
import { requireAuth } from "./auth";
import { taskCodes } from "./taskCodes";

export async function hasTaskPermission(
  ctx: QueryCtx | MutationCtx,
  taskCode: string
) {
  const user = await requireAuth(ctx);
  return user.permissions?.includes(taskCode) ?? false;
}

export async function requireTaskPermission(
  ctx: QueryCtx | MutationCtx,
  taskCode: string
) {
  const has = await hasTaskPermission(ctx, taskCode);
  if (!has) {
    throw new Error(`Missing permission: ${taskCode}`);
  }
}

// In mutations
export const deleteRequest = authMutation({
  args: { id: v.id("requests") },
  handler: async (ctx, args) => {
    await requireTaskPermission(ctx, taskCodes.DELETE_REQUESTS);
    await ctx.db.delete(args.id);
  },
});
```

### Never Trust Client-Provided User IDs

```ts
// ❌ WRONG
export const updateUser = mutation({
  args: { userId: v.id("users"), name: v.string() },
  handler: async (ctx, args) => {
    // Client sent userId — could be anyone's ID!
    await ctx.db.patch(args.userId, { name: args.name });
  },
});

// ✅ CORRECT
export const updateUser = mutation({
  args: { name: v.string() },
  handler: async (ctx, args) => {
    const identity = await ctx.auth.getUserIdentity();
    const user = await ctx.db.query("users")
      .withIndex("by_email", (q) => q.eq("email", identity.email))
      .first();

    await ctx.db.patch(user._id, { name: args.name });
  },
});
```

---

## 8. OkaTech Patterns

### Neocortex Audit Trail (consulat.ga)

```ts
// convex/lib/neocortex.ts
export async function logCortexAction(
  ctx: MutationCtx,
  {
    action,
    categorie,
    entiteType,
    entiteId,
    userId,
    avant,
    apres,
  }: {
    action: string;
    categorie: string;
    entiteType: string;
    entiteId: Id<any>;
    userId: Id<"users">;
    avant?: Record<string, any>;
    apres?: Record<string, any>;
  }
) {
  await ctx.db.insert("neocortex_logs", {
    action,
    categorie,
    entiteType,
    entiteId,
    userId,
    avant: JSON.stringify(avant),
    apres: JSON.stringify(apres),
    timestamp: Date.now(),
  });
}

// In mutations, always log important changes
export const updateRequest = authMutation({
  args: { id: v.id("requests"), status: v.string() },
  handler: async (ctx, args) => {
    const before = await ctx.db.get(args.id);

    await ctx.db.patch(args.id, { status: args.status });

    await logCortexAction(ctx, {
      action: "request.status_changed",
      categorie: "requests",
      entiteType: "requests",
      entiteId: args.id,
      userId: ctx.user._id,
      avant: { status: before.status },
      apres: { status: args.status },
    });
  },
});
```

### Aggregate Pattern (Denormalized Counters)

```ts
// convex/lib/aggregates.ts
import triggers from "./triggerSetup";

export const requestsByOrg = {
  idempotentTrigger: () => ({
    table: "requests",
    handler: async (ctx: MutationCtx, doc: Doc<"requests">) => {
      const counters = await ctx.db.query("request_counters")
        .withIndex("by_org", (q) => q.eq("orgId", doc.orgId))
        .first();

      if (!counters) {
        await ctx.db.insert("request_counters", {
          orgId: doc.orgId,
          total: 1,
          pending: doc.status === "pending" ? 1 : 0,
        });
      } else {
        await ctx.db.patch(counters._id, {
          total: counters.total + 1,
          pending: doc.status === "pending" ? counters.pending + 1 : counters.pending,
        });
      }
    },
  }),
};

// convex/triggers/index.ts
import triggers from "../lib/triggerSetup";
import { requestsByOrg } from "../lib/aggregates";

triggers.register("requests", requestsByOrg.idempotentTrigger());
export default triggers;
```

### Request Workflow State Machine (consulat.ga)

```ts
// convex/lib/requestWorkflow.ts
export const REQUEST_STATUSES = {
  PENDING: "pending",
  IN_PROGRESS: "in_progress",
  REVIEW: "review",
  APPROVED: "approved",
  REJECTED: "rejected",
  COMPLETED: "completed",
} as const;

export const VALID_TRANSITIONS: Record<string, string[]> = {
  [REQUEST_STATUSES.PENDING]: [REQUEST_STATUSES.IN_PROGRESS, REQUEST_STATUSES.REJECTED],
  [REQUEST_STATUSES.IN_PROGRESS]: [REQUEST_STATUSES.REVIEW, REQUEST_STATUSES.REJECTED],
  [REQUEST_STATUSES.REVIEW]: [REQUEST_STATUSES.APPROVED, REQUEST_STATUSES.REJECTED],
  [REQUEST_STATUSES.APPROVED]: [REQUEST_STATUSES.COMPLETED],
  [REQUEST_STATUSES.REJECTED]: [],
  [REQUEST_STATUSES.COMPLETED]: [],
};

export function canTransition(from: string, to: string): boolean {
  return VALID_TRANSITIONS[from]?.includes(to) ?? false;
}

// In mutation
export const updateRequestStatus = authMutation({
  args: { id: v.id("requests"), newStatus: v.string() },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.id);

    if (!canTransition(request.status, args.newStatus)) {
      throw new Error(`Cannot transition from ${request.status} to ${args.newStatus}`);
    }

    await ctx.db.patch(args.id, { status: args.newStatus });
  },
});
```

---

## 9. MIGRATIONS

### Schema Migrations Pattern (widen-migrate-narrow)

```ts
// convex/migrations/addUserPreferences.ts
import { MigrationContext } from "@convex-dev/migrations";

export async function up({ db }: MigrationContext) {
  // Phase 1: WIDEN — Add new optional field (backward compatible)
  // This is a schema change — modify convex/schemas/users.ts and deploy

  // Phase 2: MIGRATE — Update existing documents
  const users = await db.query("users").collect();
  for (const user of users) {
    if (!user.preferences) {
      await db.patch(user._id, {
        preferences: { newsletter: false, language: "en" },
      });
    }
  }

  console.log(`Migrated ${users.length} users`);
}

export async function down({ db }: MigrationContext) {
  // Rollback: remove preferences from all users
  const users = await db.query("users").collect();
  for (const user of users) {
    if (user.preferences) {
      await db.patch(user._id, { preferences: undefined });
    }
  }
}
```

### Migration with Batching & Pagination

```ts
export async function up({ db }: MigrationContext) {
  const BATCH_SIZE = 1000;
  let processed = 0;
  let cursor: string | undefined;

  while (true) {
    let batch = await db.query("documents").take(BATCH_SIZE);
    if (batch.length === 0) break;

    for (const doc of batch) {
      await db.patch(doc._id, {
        status: doc.status?.toUpperCase() ?? "UNKNOWN",
      });
      processed++;
    }

    if (batch.length < BATCH_SIZE) break;
  }

  console.log(`Migrated ${processed} documents`);
}
```

### Dry Run Before Deploy

```bash
# Test migration (reads without writing)
npx convex dev --dry-run-migrations

# Deploy with migration
npx convex deploy
```

---

## 10. PERFORMANCE & OPTIMIZATION

### Performance Audit with Convex Insights

```bash
# View performance dashboard
npx convex insights

# Get detailed metrics
npx convex insights --details
```

**Key metrics to monitor:**
- Subscription cost (number of documents in watched queries)
- Function budget (reads/writes per second)
- Hot paths (frequently called functions)
- OCC conflicts (optimistic concurrency control)

### Common Performance Patterns

**Pagination to avoid large queries:**
```ts
// ❌ WRONG — loads entire table
const allDocs = await ctx.db.query("documents").collect();

// ✅ CORRECT — paginate
const docs = await ctx.db.query("documents")
  .order("desc")
  .take(100);
```

**Index for filter + sort combos:**
```ts
// ❌ SLOW — no index
q = ctx.db.query("requests")
  .filter((q) => q.eq(q.field("orgId"), orgId))
  .filter((q) => q.eq(q.field("status"), "pending"));

// ✅ FAST — uses composite index
q = ctx.db.query("requests")
  .withIndex("by_org_status", (q) =>
    q.eq("orgId", orgId).eq("status", "pending")
  );
```

**Denormalize hot queries:**
```ts
// Instead of computing on every query
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ❌ SLOW for large datasets
    const requests = await ctx.db.query("requests")
      .filter((q) => q.eq(q.field("userId"), args.userId))
      .collect();
    return { total: requests.length };
  },
});

// Use denormalized counter
export const getUserStats = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // ✅ FAST — O(1) lookup
    const stats = await ctx.db.query("user_stats")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .first();
    return stats || { total: 0 };
  },
});
```

**Avoid OCC conflicts:**
```ts
// ❌ WRONG — multiple reads then writes causes OCC conflicts
export const incrementCounter = mutation({
  args: { counterId: v.id("counters") },
  handler: async (ctx, args) => {
    const counter = await ctx.db.get(args.counterId);  // Read
    await ctx.db.patch(args.counterId, {               // Write
      value: (counter?.value ?? 0) + 1,
    });
  },
});

// ✅ CORRECT — structure to avoid conflicts
// Use per-user counters instead of global
// Or batch increments in a single document
```

---

## 11. SCHEDULED FUNCTIONS (CRONS)

```ts
import { cronJob } from "convex/server";

export const sendDailyDigest = cronJob({
  schedule: "0 9 * * *",  // 9 AM every day (UTC)
  handler: async (ctx) => {
    const users = await ctx.db.query("users").collect();

    for (const user of users) {
      if (user.emailDigest) {
        await ctx.runAction(api.email.sendDigest, {
          userId: user._id,
        });
      }
    }
  },
});

// Schedule with dynamic timing
export const retryFailedJobs = cronJob({
  schedule: "*/5 * * * *",  // Every 5 minutes
  handler: async (ctx) => {
    const failed = await ctx.db.query("jobs")
      .withIndex("by_status", (q) => q.eq("status", "failed"))
      .collect();

    for (const job of failed) {
      await ctx.runMutation(api.jobs.retry, { jobId: job._id });
    }
  },
});
```

---

## 12. FULL-TEXT & VECTOR SEARCH

### Full-Text Search

```ts
// For small datasets, use regex filters
export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const regex = new RegExp(args.query, "i");
    const results = await ctx.db.query("documents")
      .filter((q) => q.regex(q.field("title"), regex))
      .collect();
    return results;
  },
});

// For large datasets, maintain search index
const searchIndexTable = defineTable({
  docId: v.id("documents"),
  tokens: v.array(v.string()),  // Tokenized content
}).index("by_token", ["tokens"]);

export const indexDocument = mutation({
  args: { docId: v.id("documents"), content: v.string() },
  handler: async (ctx, args) => {
    const tokens = tokenize(args.content);
    await ctx.db.insert("search_index", {
      docId: args.docId,
      tokens,
    });
  },
});

export const search = query({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const tokens = tokenize(args.query);
    const results = await ctx.db.query("search_index")
      .withIndex("by_token", (q) => q.eq("tokens", tokens[0]))
      .collect();
    return results.map(r => r.docId);
  },
});
```

### Vector Search (for ML/semantic search)

```ts
// Use OpenAI or Hugging Face embeddings
export const embedAndStore = action({
  args: { docId: v.id("documents"), text: v.string() },
  handler: async (ctx, args) => {
    const embedding = await getEmbedding(args.text);  // Call OpenAI

    await ctx.runMutation(api.vectorIndex.store, {
      docId: args.docId,
      embedding,
    });
  },
});

export const semanticSearch = action({
  args: { query: v.string() },
  handler: async (ctx, args) => {
    const queryEmbedding = await getEmbedding(args.query);

    // Use Pinecone/Supabase Vector for similarity search
    const results = await pinecone.query({
      vector: queryEmbedding,
      topK: 10,
    });

    return results;
  },
});
```

---

## 13. ADVANCED PATTERNS

### Transactions & Consistency

Convex mutations are atomic — all writes succeed or all fail. For multi-table updates:

```ts
export const transferRequest = mutation({
  args: {
    requestId: v.id("requests"),
    fromUserId: v.id("users"),
    toUserId: v.id("users"),
  },
  handler: async (ctx, args) => {
    const request = await ctx.db.get(args.requestId);
    if (request.assignedTo !== args.fromUserId) {
      throw new Error("Not assigned to fromUser");
    }

    // Both updates happen atomically
    await ctx.db.patch(args.requestId, { assignedTo: args.toUserId });
    await ctx.db.patch(args.fromUserId, { activeRequests: (request.activeRequests ?? 0) - 1 });
    await ctx.db.patch(args.toUserId, { activeRequests: (request.activeRequests ?? 0) + 1 });
  },
});
```

### Composite Keys (Simulate)

```ts
// Convex doesn't have composite primary keys
// Simulate with compound field
const tableWithCompositeKey = defineTable({
  userId: v.id("users"),
  orgId: v.id("orgs"),
  // Composite key simulation
  compositeKey: v.string(),  // `${userId}:${orgId}`
})
  .index("by_composite", ["compositeKey"]);

export const getByComposite = query({
  args: { userId: v.id("users"), orgId: v.id("orgs") },
  handler: async (ctx, args) => {
    const compositeKey = `${args.userId}:${args.orgId}`;
    return await ctx.db.query("table")
      .withIndex("by_composite", (q) => q.eq("compositeKey", compositeKey))
      .first();
  },
});
```

### Batch Operations

```ts
export const batchDelete = mutation({
  args: { ids: v.array(v.id("documents")) },
  handler: async (ctx, args) => {
    for (const id of args.ids) {
      await ctx.db.delete(id);
    }
  },
});

export const batchUpdate = mutation({
  args: {
    updates: v.array(v.object({
      id: v.id("documents"),
      status: v.string(),
    })),
  },
  handler: async (ctx, args) => {
    for (const { id, status } of args.updates) {
      await ctx.db.patch(id, { status });
    }
  },
});
```

---

## 14. CLIENT INTEGRATION (React)

### Hooks Pattern

```tsx
import { useQuery, useMutation, useAction } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Id } from "@/convex/_generated/dataModel";

function RequestManager({ orgId }: { orgId: Id<"orgs"> }) {
  // Query (real-time)
  const requests = useQuery(api.requests.list, { orgId });

  // Mutation (write)
  const updateStatus = useMutation(api.requests.updateStatus);

  // Action (server-only)
  const sendNotification = useAction(api.notifications.send);

  // Handle loading state
  if (requests === undefined) return <Skeleton />;

  // Handle mutation
  const handleStatusChange = async (requestId: Id<"requests">, newStatus: string) => {
    try {
      await updateStatus({ requestId, newStatus });
      // UI updates automatically via real-time subscription
    } catch (error) {
      console.error("Failed to update status", error);
    }
  };

  return (
    <div>
      {requests.map((req) => (
        <RequestCard
          key={req._id}
          request={req}
          onStatusChange={(status) => handleStatusChange(req._id, status)}
        />
      ))}
    </div>
  );
}
```

### Optimistic Updates

```tsx
function RequestCard({ request, onStatusChange }: Props) {
  const [optimisticStatus, setOptimisticStatus] = useState(request.status);
  const updateStatus = useMutation(api.requests.updateStatus);

  const handleStatusChange = async (newStatus: string) => {
    // Optimistically update UI
    setOptimisticStatus(newStatus);

    try {
      await updateStatus({
        requestId: request._id,
        newStatus,
      });
      // Real update succeeded — UI syncs via subscription
    } catch (error) {
      // Rollback on error
      setOptimisticStatus(request.status);
      toast.error("Failed to update status");
    }
  };

  return <div>{optimisticStatus}</div>;
}
```

---

## Critical Anti-Patterns

```
❌ Never define _id or _creationTime in schema
❌ Never import query/mutation from _generated/server in consulat.ga
❌ Never call ctx.db in actions — use ctx.runQuery/ctx.runMutation
❌ Never use fetch() in queries/mutations — move to actions
❌ Never use process.env in queries/mutations — only in actions
❌ Never forget indexes for frequent queries
❌ Never trust client-provided userIds — verify with auth
❌ Never omit audit logging (logCortexAction) for important mutations
❌ Never use v.any() without documenting why
❌ Never mutate function arguments — create new objects
❌ Never call db operations in loops without batching
❌ Never create circular references between documents
```

---

## Useful Commands

```bash
# Start development environment
npx convex dev

# Deploy to production
npx convex deploy

# View Convex dashboard
npx convex dashboard

# Run migrations (dry-run first)
npx convex dev --dry-run-migrations
npx convex deploy

# View performance metrics
npx convex insights
npx convex insights --details

# Push schema changes
npx convex push

# Generate TypeScript client types
npx convex generate-client
```

---

## Project-Specific Notes

**consulat.ga (reference):**
- Use `customFunctions.ts` (authQuery, authMutation, authAction)
- Implement Neocortex audit trail for all metadata mutations
- Use RequestWorkflow state machine for request lifecycle
- Trigger-based aggregate counters

**digitalium.io, evenement.ga, foot.cd:**
- Use standard query/mutation from "convex/server"
- Implement per-project auth patterns
- Monitor subscription costs in insights dashboard

**idetude.ga:**
- Similar to consulat.ga — uses customFunctions
- Better Auth integration (17 roles)
- Schema migrations for multi-tenant data

---

## Related Skills

When keyword combinations appear, activate these skills together:
- `convex-backend` + `auth-patterns`: Authentication and RBAC
- `convex-backend` + `convex-migration-helper`: Complex migrations
- `convex-backend` + `convex-performance-audit`: Performance issues
- `convex-backend` + `react-vite-spa` or `nextjs-app-router`: UI integration
