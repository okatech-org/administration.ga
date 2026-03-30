---
name: typescript-patterns
description: "📘 Expert TypeScript. S'active automatiquement pour tous les projets (tous utilisent TypeScript). Couvre les types avancés, les generics, les patterns de typage strict, et les conventions TypeScript OkaTech."
---

# 📘 Skill : TypeScript Patterns Expert

## Auto-Activation
Ce skill s'active quand :
- N'importe quel fichier `.ts` ou `.tsx` est créé ou modifié
- La requête mentionne : type, interface, generic, enum, typage
- S'applique à TOUS les projets OkaTech (tous utilisent TypeScript strict)

## Conventions TypeScript OkaTech

### Nommage
```ts
// ✅ Interfaces : PascalCase avec suffixe descriptif
interface UserProfile { ... }
interface CreateDocumentInput { ... }
interface DocumentListResponse { ... }

// ✅ Types : PascalCase
type DocumentStatus = "draft" | "published" | "archived";
type Role = "admin" | "user" | "viewer";

// ✅ Enums : PascalCase + valeurs UPPERCASE ou camelCase
enum HttpStatus {
  OK = 200,
  NOT_FOUND = 404,
  INTERNAL_ERROR = 500,
}

// ✅ Constantes : UPPER_SNAKE_CASE
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const API_BASE_URL = "/api/v1";
```

### Patterns de Types Avancés
```ts
// Utility types utiles
type PartialBy<T, K extends keyof T> = Omit<T, K> & Partial<Pick<T, K>>;
type RequiredBy<T, K extends keyof T> = Omit<T, K> & Required<Pick<T, K>>;

// Discriminated unions pour les états
type AsyncState<T> =
  | { status: "idle" }
  | { status: "loading" }
  | { status: "error"; error: Error }
  | { status: "success"; data: T };

// Type-safe event handlers
type EventHandler<T = void> = T extends void
  ? () => void
  : (payload: T) => void;

// Exhaustive check (impossible state)
function assertNever(value: never): never {
  throw new Error(`Unexpected value: ${value}`);
}

// Utilisation avec switch exhaustif
function getStatusLabel(status: DocumentStatus): string {
  switch (status) {
    case "draft": return "Brouillon";
    case "published": return "Publié";
    case "archived": return "Archivé";
    default: return assertNever(status);
  }
}
```

### Pattern de Service Typé
```ts
// Types d'entrée/sortie explicites
interface DocumentService {
  list(filters: DocumentFilters): Promise<PaginatedResponse<Document>>;
  getById(id: string): Promise<Document | null>;
  create(input: CreateDocumentInput): Promise<Document>;
  update(id: string, input: UpdateDocumentInput): Promise<Document>;
  delete(id: string): Promise<void>;
}

interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}
```

### Zod + TypeScript (Validation Runtime)
```ts
import { z } from "zod";

// Schema = source de vérité pour le type
const documentSchema = z.object({
  title: z.string().min(1, "Le titre est requis"),
  content: z.string().optional(),
  status: z.enum(["draft", "published", "archived"]),
  tags: z.array(z.string()).default([]),
});

// Inférer le type depuis le schema
type Document = z.infer<typeof documentSchema>;

// Validation
function validateDocument(data: unknown): Document {
  return documentSchema.parse(data);  // Throw si invalide
}
```

## Configuration TSConfig Standard
```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "ESNext",
    "moduleResolution": "bundler",
    "strict": true,
    "noUncheckedIndexedAccess": true,
    "skipLibCheck": true,
    "jsx": "react-jsx",
    "paths": {
      "@/*": ["./src/*"]
    }
  }
}
```

## Anti-Patterns
- ❌ Ne JAMAIS utiliser `any` sans raison documentée — utiliser `unknown` à la place
- ❌ Ne JAMAIS ignorer les erreurs TypeScript avec `// @ts-ignore` — corriger le type
- ❌ Ne JAMAIS dupliquer les types — les garder dans un seul endroit (DRY)
- ❌ Ne JAMAIS exporter `default` — préférer les named exports
- ❌ Ne JAMAIS utiliser `as` pour forcer un type — corriger la chaîne de types en amont
