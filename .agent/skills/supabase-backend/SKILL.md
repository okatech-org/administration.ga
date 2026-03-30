---
name: supabase-backend
description: "🟢 Expert Supabase Backend. S'active automatiquement pour les projets utilisant Supabase (mairie.ga). Couvre Postgres, RLS, auth, Edge Functions, performance, security et patterns temps réel."
---

# 🟢 Skill : Supabase Backend Expert

## Auto-Activation
Ce skill s'active quand :
- Le fichier ouvert importe depuis `@supabase/supabase-js` ou est dans `supabase/`
- La requête mentionne : supabase, RLS, edge function, policy, storage bucket, postgres, query performance, indexes
- Projets concernés : `mairie.ga`

## Architecture Supabase dans mairie.ga

### Client Supabase
```ts
import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

export const supabase = createClient(supabaseUrl, supabaseKey);
```

---

## CRITICAL: Query Performance & Indexing

### Index Fundamentals
**Unindexed queries = full table scans**. Always index columns in WHERE, JOIN, and ORDER BY clauses.

#### Index Types & Use Cases
```sql
-- B-tree (default): equality, range, sorting
CREATE INDEX idx_documents_status ON documents(status);
CREATE INDEX idx_documents_author_created ON documents(author_id, created_at DESC);

-- Composite index: WHERE author_id = ? AND status = ?
CREATE INDEX idx_documents_author_status ON documents(author_id, status) INCLUDE (title, content);

-- Partial index: only published documents (smaller, faster)
CREATE INDEX idx_documents_published ON documents(created_at)
  WHERE status = 'published';

-- GIN: arrays, JSONB, full-text search (use only when needed)
CREATE INDEX idx_documents_tags ON documents USING GIN(tags);
CREATE INDEX idx_documents_metadata ON documents USING GIN(metadata);

-- GiST: geometric types, ranges
CREATE INDEX idx_geometry_location ON locations USING GIST(coordinates);

-- BRIN: time-series data (huge tables with sequential insert order)
CREATE INDEX idx_logs_timestamp ON logs USING BRIN(created_at);

-- Hash: equality only (VERY rare, avoid unless benchmarking proves benefits)
CREATE INDEX idx_documents_id_hash ON documents USING HASH(id);
```

#### Covering Indexes (Postgres 11+)
```sql
-- INCLUDE columns avoid fetching full row for index-only scans
CREATE INDEX idx_documents_status_cover ON documents(status)
  INCLUDE (title, created_at, author_id);

-- Query can run entirely from index (no table lookup)
SELECT title, created_at FROM documents WHERE status = 'published';
```

#### Index Validation & Monitoring
```sql
-- Check which indexes are unused
SELECT schemaname, tablename, indexname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY pg_relation_size(indexrelid) DESC;

-- Find missing indexes (columns in WHERE/JOIN)
SELECT * FROM pg_stat_user_tables
  WHERE seq_scan > 100 AND seq_scan > (idx_scan + idx_blks_read);

-- Analyze query plan
EXPLAIN ANALYZE
SELECT * FROM documents
  WHERE author_id = 'uuid-here'
  AND status = 'published'
  ORDER BY created_at DESC
  LIMIT 20;
```

---

## CRITICAL: Connection Management

### PgBouncer Connection Pooling
**Each Postgres connection = 1-3 MB RAM**. Never saturate the connection pool.

```sql
-- Check pool settings in Supabase Dashboard → Database → Connection Pool
-- Mode selection:
--   Transaction mode (default): safer, lower memory, best for 99% of apps
--   Session mode: for prepared statements, temp tables, advisory locks
```

#### TypeScript Connection Best Practices
```ts
// Use transaction mode (connection reused per query)
const supabase = createClient(url, key, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
});

// Never hold connections across async operations
export async function getDocuments(authorId: string) {
  // ✅ GOOD: Connection released after query
  const { data, error } = await supabase
    .from("documents")
    .select("*")
    .eq("author_id", authorId);

  return data;
}

// ❌ BAD: Connection held during processing
async function processDocumentsBAD(authorId: string) {
  const query = supabase.from("documents").select("*").eq("author_id", authorId);

  // If this takes 5 seconds, connection is idle!
  await someExpensiveOperation();

  const { data } = await query;
  return data;
}

// ✅ GOOD: Fetch first, then process
async function processDocumentsGOOD(authorId: string) {
  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("author_id", authorId);

  // Now connection is released
  await someExpensiveOperation();

  return documents;
}
```

#### Prepared Statements (Edge Functions)
```ts
// supabase/functions/process-data/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  const { createClient } = await import("https://esm.sh/@supabase/supabase-js@2");

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Reuse single connection for batch operations
  const authorId = "uuid-here";
  const statuses = ["draft", "review"];

  const { data: documents } = await supabase
    .from("documents")
    .select("*")
    .eq("author_id", authorId)
    .in("status", statuses);

  return new Response(JSON.stringify({ count: documents?.length || 0 }), {
    headers: { "Content-Type": "application/json" },
  });
});
```

---

## CRITICAL: Security & RLS (Row Level Security)

### Enable & Enforce RLS
```sql
-- ALWAYS enable RLS on multi-tenant tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;

-- Disable insecure public policies
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

### Efficient RLS Policies

#### ✅ GOOD: Index columns used in RLS
```sql
-- Index the column used in RLS WHERE clause
CREATE INDEX idx_documents_author_id ON documents(author_id);

-- Simple policy: fast, indexed lookup
CREATE POLICY "Users see own documents" ON documents
  FOR SELECT USING (author_id = auth.uid());

-- Index the subquery column too!
CREATE INDEX idx_user_roles_user_id ON user_roles(user_id);

-- Admin check: still indexed
CREATE POLICY "Admins see all" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

#### ❌ BAD: Function calls per row
```sql
-- Avoid: function called for every row!
CREATE POLICY "bad_policy" ON documents
  FOR SELECT USING (
    get_user_role(auth.uid()) = 'admin'
  );

-- ✅ Better: subquery cached
CREATE POLICY "good_policy" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_id = auth.uid()
        AND role = 'admin'
    )
  );
```

#### Security Definer Functions (Complex Checks)
```sql
-- Create function with SECURITY DEFINER to execute as function owner
CREATE OR REPLACE FUNCTION can_edit_document(doc_id UUID)
RETURNS BOOLEAN
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM documents
    WHERE id = doc_id
      AND author_id = auth.uid()
  );
END;
$$ LANGUAGE plpgsql;

-- Use in policies
CREATE POLICY "Users can edit own documents" ON documents
  FOR UPDATE USING (can_edit_document(id));
```

#### Prevent RLS Bypass
```sql
-- ✅ Prevent UPDATE from bypassing SELECT policy
CREATE POLICY "Users update own documents" ON documents
  FOR UPDATE
  USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());

-- ✅ Prevent UPDATE changing owner
CREATE POLICY "Preserve ownership" ON documents
  FOR UPDATE USING (author_id = auth.uid())
  WITH CHECK (author_id = auth.uid());
```

---

## Data Access Patterns

### Eliminate N+1 Queries with Batch Loading
```ts
// ❌ BAD: N+1 problem - 21 queries for 20 users
async function getUsersAndRoleBAD() {
  const { data: users } = await supabase.from("users").select("*");

  // This query runs for EACH user!
  for (const user of users || []) {
    const { data: roles } = await supabase
      .from("user_roles")
      .select("*")
      .eq("user_id", user.id);

    user.roles = roles;
  }

  return users;
}

// ✅ GOOD: Single batch query - 2 queries total
async function getUsersAndRoleGOOD() {
  const { data: users } = await supabase.from("users").select("*");

  if (!users?.length) return users;

  // Collect IDs
  const userIds = users.map(u => u.id);

  // One query for all roles
  const { data: allRoles } = await supabase
    .from("user_roles")
    .select("*")
    .in("user_id", userIds);

  // Map roles back to users
  const rolesByUserId = new Map();
  allRoles?.forEach(role => {
    if (!rolesByUserId.has(role.user_id)) {
      rolesByUserId.set(role.user_id, []);
    }
    rolesByUserId.get(role.user_id)!.push(role);
  });

  users.forEach(user => {
    user.roles = rolesByUserId.get(user.id) || [];
  });

  return users;
}
```

### Cursor-Based Pagination (O(1) vs O(n))
```ts
// ❌ BAD: OFFSET is O(n) - skips n rows every time
async function getDocumentsOFFSET(page: number) {
  const pageSize = 20;
  const { data } = await supabase
    .from("documents")
    .select("*")
    .order("id", { ascending: true })
    .range(page * pageSize, page * pageSize + pageSize - 1);

  return data;
}

// ✅ GOOD: Cursor-based pagination O(1)
interface PaginationCursor {
  lastId: string;
  hasMore: boolean;
}

async function getDocumentsCursor(cursor?: PaginationCursor) {
  const pageSize = 20;

  let query = supabase
    .from("documents")
    .select("*")
    .order("id", { ascending: true });

  // Start after last ID
  if (cursor?.lastId) {
    query = query.gt("id", cursor.lastId);
  }

  const { data } = await query.limit(pageSize + 1);

  if (!data) return { items: [], cursor: undefined };

  const hasMore = data.length > pageSize;
  const items = data.slice(0, pageSize);

  return {
    items,
    cursor: hasMore ? { lastId: items[items.length - 1].id, hasMore: true } : undefined,
  };
}
```

### Batch Inserts & Upserts
```ts
// ✅ Single round-trip instead of multiple inserts
async function createManyDocuments(docs: Array<{ title: string; content: string }>) {
  const { data, error } = await supabase
    .from("documents")
    .insert(docs)
    .select();

  return { data, error };
}

// ✅ Bulk upsert (create or update)
async function syncDocuments(docs: Array<{ id: string; title: string; content: string }>) {
  const { data, error } = await supabase
    .from("documents")
    .upsert(docs, { onConflict: "id" })
    .select();

  return { data, error };
}
```

---

## Schema Design Best Practices

### Sequential IDs vs UUIDs
```sql
-- ✅ IDENTITY for sequential IDs (preferred, smallest storage)
CREATE TABLE documents (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY PRIMARY KEY,
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ✅ UUIDv7 for distributed systems (sortable, timestamp-based)
CREATE EXTENSION IF NOT EXISTS pgcrypto;
CREATE EXTENSION IF NOT EXISTS uuid-ossp;

CREATE TABLE documents (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  -- OR: id UUID PRIMARY KEY DEFAULT uuid_generate_v7() (Postgres 16+)
  title TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW()
);

-- ❌ AVOID: Random UUIDs (v4) - bad for index performance
-- They fragment B-tree indexes as they're random-order
```

### Proper Constraints & Types
```sql
CREATE TABLE documents (
  -- UUID primary key
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

  -- Foreign key with index (auto-indexed in Postgres)
  author_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,

  -- NOT NULL constraints
  title TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'draft',

  -- Proper enums instead of TEXT
  priority priority_enum NOT NULL DEFAULT 'medium',

  -- Numeric types (not string for numbers)
  word_count INTEGER DEFAULT 0,
  version_number BIGINT DEFAULT 1,

  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMP DEFAULT NOW() NOT NULL,
  published_at TIMESTAMP,

  -- Check constraints
  CHECK (word_count >= 0),
  CHECK (status IN ('draft', 'review', 'published', 'archived'))
);

-- Foreign key automatically creates index on author_id
-- But add index for reverse lookups (documents by author)
CREATE INDEX idx_documents_author_id ON documents(author_id);

-- Compound index for common queries
CREATE INDEX idx_documents_author_status ON documents(author_id, status);
```

### Identifier Conventions
```sql
-- ✅ Use lowercase identifiers (Postgres default)
CREATE TABLE documents (
  id UUID PRIMARY KEY,
  author_id UUID NOT NULL,
  created_at TIMESTAMP
);

-- ❌ AVOID: Mixed case forces quoting everywhere
CREATE TABLE "Documents" (
  "ID" UUID PRIMARY KEY
);
```

### Partitioning for Large Tables
```sql
-- Partition by time range (logs, events, analytics)
CREATE TABLE logs (
  id BIGINT GENERATED BY DEFAULT AS IDENTITY,
  event_type TEXT,
  created_at TIMESTAMP,
  PRIMARY KEY (id, created_at)
) PARTITION BY RANGE (created_at);

-- Create partitions
CREATE TABLE logs_2026_01 PARTITION OF logs
  FOR VALUES FROM ('2026-01-01') TO ('2026-02-01');

CREATE TABLE logs_2026_02 PARTITION OF logs
  FOR VALUES FROM ('2026-02-01') TO ('2026-03-01');

-- Add index on partition column
CREATE INDEX idx_logs_created_at ON logs(created_at);
```

---

## Patterns de Requêtes

### SELECT avec filtres (Indexed)
```ts
// ✅ GOOD: Indexed columns, limit results
const { data, error } = await supabase
  .from("documents")
  .select("id, title, author_id, created_at")  // only needed columns
  .eq("author_id", userId)                       // indexed
  .eq("status", "published")                     // indexed or partial index
  .order("created_at", { ascending: false })     // indexed DESC
  .limit(20);                                     // always limit!

// ✅ Relationship queries with select
const { data, error } = await supabase
  .from("documents")
  .select(`
    id, title, created_at,
    author:author_id(id, name, email)
  `)
  .eq("status", "published")
  .limit(20);
```

### INSERT with Validation
```ts
// ✅ Single insert with return
const { data, error } = await supabase
  .from("documents")
  .insert({
    title: "Mon document",
    content: "...",
    author_id: userId,
  })
  .select()
  .single();

// ✅ Batch insert
const { data, error } = await supabase
  .from("documents")
  .insert([
    { title: "Doc 1", author_id: userId },
    { title: "Doc 2", author_id: userId },
  ])
  .select();

if (error) {
  console.error("Insert failed:", error);
  // Handle validation errors, FK violations, etc.
}
```

### UPDATE with Safety Checks
```ts
// ✅ Update single row, return result
const { data, error } = await supabase
  .from("documents")
  .update({ status: "archived", updated_at: new Date() })
  .eq("id", documentId)
  .eq("author_id", userId)  // Ensure user owns document
  .select()
  .single();

// ✅ Batch update
const { data, error } = await supabase
  .from("documents")
  .update({ status: "archived" })
  .in("id", documentIds)
  .select();
```

### DELETE with Cascade
```ts
// ✅ Delete single
const { error } = await supabase
  .from("documents")
  .delete()
  .eq("id", documentId)
  .eq("author_id", userId);  // Safety check

// Note: Cascade deletes handled by DB constraints
// ALTER TABLE comments ADD FOREIGN KEY (document_id) REFERENCES documents(id) ON DELETE CASCADE;
```

---

## Row Level Security (RLS)

### Activate RLS
```sql
-- Enable on all multi-tenant tables
ALTER TABLE documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- Prevent policy bypass
ALTER TABLE documents FORCE ROW LEVEL SECURITY;
```

### Sample Policies (Mairie.ga Pattern)

#### Owner can read/write own documents
```sql
CREATE POLICY "Users see own documents" ON documents
  FOR SELECT USING (auth.uid() = author_id);

CREATE POLICY "Users insert own documents" ON documents
  FOR INSERT WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users update own documents" ON documents
  FOR UPDATE
  USING (auth.uid() = author_id)
  WITH CHECK (auth.uid() = author_id);

CREATE POLICY "Users delete own documents" ON documents
  FOR DELETE USING (auth.uid() = author_id);
```

#### Admins can do everything
```sql
CREATE POLICY "Admins see all documents" ON documents
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  );

CREATE POLICY "Admins manage all documents" ON documents
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  )
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM user_roles
      WHERE user_roles.user_id = auth.uid()
        AND user_roles.role IN ('super_admin', 'admin')
    )
  );
```

#### Shared documents (multi-access)
```sql
-- Shared table linking users to documents
CREATE TABLE document_shares (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  document_id UUID NOT NULL REFERENCES documents(id) ON DELETE CASCADE,
  shared_with_user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  access_level TEXT DEFAULT 'view',  -- 'view', 'edit'
  created_at TIMESTAMP DEFAULT NOW()
);

CREATE INDEX idx_document_shares_user_doc ON document_shares(shared_with_user_id, document_id);

-- Policy: shared users can view
CREATE POLICY "Users see shared documents" ON documents
  FOR SELECT USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_id = documents.id
        AND shared_with_user_id = auth.uid()
    )
  );

-- Policy: shared users can edit (if access_level = 'edit')
CREATE POLICY "Users edit shared documents" ON documents
  FOR UPDATE USING (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_id = documents.id
        AND shared_with_user_id = auth.uid()
        AND access_level = 'edit'
    )
  )
  WITH CHECK (
    auth.uid() = author_id OR
    EXISTS (
      SELECT 1 FROM document_shares
      WHERE document_id = documents.id
        AND shared_with_user_id = auth.uid()
        AND access_level = 'edit'
    )
  );
```

---

## Edge Functions

### Basic Function Structure
```ts
// supabase/functions/process-document/index.ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  // Handle CORS preflight
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: { "Access-Control-Allow-Origin": "*" } });
  }

  try {
    const { data } = await req.json();

    // Process...

    return new Response(
      JSON.stringify({ success: true, data }),
      { headers: { "Content-Type": "application/json" } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: String(error) }),
      { status: 500, headers: { "Content-Type": "application/json" } }
    );
  }
});
```

### Authenticated Function (Service Role)
```ts
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

serve(async (req) => {
  // Create service role client (admin access)
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  // Extract user from auth header
  const authHeader = req.headers.get("Authorization")?.split(" ")[1];
  if (!authHeader) {
    return new Response(
      JSON.stringify({ error: "Unauthorized" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Verify user
  const { data: { user }, error: userError } = await supabase.auth.getUser(authHeader);
  if (userError || !user) {
    return new Response(
      JSON.stringify({ error: "Invalid token" }),
      { status: 401, headers: { "Content-Type": "application/json" } }
    );
  }

  // Fetch user data (as service role)
  const { data: userData } = await supabase
    .from("users")
    .select("*")
    .eq("id", user.id)
    .single();

  return new Response(
    JSON.stringify({ user: userData }),
    { headers: { "Content-Type": "application/json" } }
  );
});
```

---

## Mode Hybride (Démo/Production)

### Service with Mock Fallback
```ts
// lib/documentService.ts
export const MOCK_DOCUMENTS = [
  { id: "1", title: "Document Demo 1", content: "...", author_id: "demo" },
  { id: "2", title: "Document Demo 2", content: "...", author_id: "demo" },
];

export async function getDocuments(authorId: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .select("*")
      .eq("author_id", authorId)
      .order("created_at", { ascending: false });

    if (error) throw error;
    return data || [];
  } catch (err) {
    console.warn("Falling back to mock data:", err);
    return MOCK_DOCUMENTS;
  }
}

export async function createDocument(title: string, content: string, authorId: string) {
  try {
    const { data, error } = await supabase
      .from("documents")
      .insert({ title, content, author_id: authorId })
      .select()
      .single();

    if (error) throw error;
    return { success: true, data };
  } catch (err) {
    console.warn("Insert failed, using mock:", err);

    // Return mock document
    return {
      success: true,
      data: {
        id: crypto.randomUUID(),
        title,
        content,
        author_id: authorId,
        created_at: new Date(),
      },
    };
  }
}
```

---

## Monitoring & Performance

### EXPLAIN ANALYZE (Query Plans)
```sql
-- Check if query uses indexes
EXPLAIN ANALYZE
SELECT * FROM documents
  WHERE author_id = 'uuid-123'
    AND status = 'published'
  ORDER BY created_at DESC
  LIMIT 20;

-- Output shows:
-- - Seq Scan vs Index Scan
-- - Rows estimated vs actual
-- - Execution time
-- - If full table scan, add an index!
```

### pg_stat_statements (Slow Queries)
```sql
-- Top 10 slowest queries
SELECT query, calls, mean_exec_time, max_exec_time
  FROM pg_stat_statements
  ORDER BY mean_exec_time DESC
  LIMIT 10;

-- Most frequent queries
SELECT query, calls, mean_exec_time
  FROM pg_stat_statements
  ORDER BY calls DESC
  LIMIT 10;
```

### VACUUM & ANALYZE
```sql
-- Clean up dead rows (run periodically)
VACUUM documents;

-- Update statistics (run after large changes)
ANALYZE documents;

-- Combined: VACUUM + ANALYZE
VACUUM ANALYZE documents;

-- In Supabase: runs automatically, but can trigger manually via SQL Editor
```

### Table & Index Sizes
```sql
-- Find largest tables
SELECT
  schemaname,
  tablename,
  pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) AS size
FROM pg_tables
WHERE schemaname = 'public'
ORDER BY pg_total_relation_size(schemaname||'.'||tablename) DESC;

-- Find unused indexes
SELECT indexrelname, idx_scan, idx_tup_read, idx_tup_fetch
  FROM pg_stat_user_indexes
  WHERE idx_scan = 0
  ORDER BY pg_relation_size(indexrelid) DESC;
```

---

## Anti-Patterns

### Security & Trust
- ❌ **NEVER** use `service_role` key on client (only `anon`)
- ❌ **NEVER** skip RLS on multi-tenant tables
- ❌ **NEVER** trust client-side validation without server checks
- ❌ **NEVER** expose secrets in source code

### Performance
- ❌ **NEVER** write queries without WHERE/JOIN indexes
- ❌ **NEVER** use N+1 queries when batch loading is available
- ❌ **NEVER** use OFFSET for pagination on large tables (use cursors)
- ❌ **NEVER** fetch 1000+ rows to client and filter in JavaScript
- ❌ **NEVER** call functions repeatedly in RLS policies (use subqueries)
- ❌ **NEVER** skip LIMIT on SELECT queries (DoS risk)

### Data Integrity
- ❌ **NEVER** use TEXT for numeric IDs (use BIGINT, UUID)
- ❌ **NEVER** use random UUIDs (v4) as primary keys (use IDENTITY, UUIDv7)
- ❌ **NEVER** rely on application code for constraints (use CHECK, FK)
- ❌ **NEVER** omit ON DELETE CASCADE for relationships (orphaned rows)

### Connection Management
- ❌ **NEVER** hold connections during async operations
- ❌ **NEVER** create client per request (reuse single client)
- ❌ **NEVER** ignore connection pool limits
