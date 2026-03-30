---
name: TanStack React Query
description: TanStack Query patterns for data fetching in Vite + React SPAs with Supabase, Express API, and caching strategies
activation:
  keywords:
    - react-query
    - tanstack-query
    - usequery
    - usemutation
    - data fetching
    - cache
    - invalidation
    - prefetch
  projects:
    - mairie.ga
    - cnom.ga
    - sgg.ga
    - secretariat-general-gouv
---

# TanStack React Query for OkaTech

## Overview

TanStack React Query est une librairie de gestion d'état asynchrone et de cache pour les données serveur. Ce skill couvre les patterns d'intégration avec Vite + React, Supabase, Express APIs, et les stratégies avancées de cache et invalidation utilisées dans les projets OkaTech.

## Installation

```bash
npm install @tanstack/react-query
npm install -D @tanstack/react-query-devtools
```

## Configuration Initiale

### 1. QueryClient Setup

Dans `src/lib/queryClient.ts`:

```typescript
import { QueryClient } from "@tanstack/react-query";

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5, // 5 minutes
      gcTime: 1000 * 60 * 10, // 10 minutes (ancien cacheTime)
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 30000),
    },
    mutations: {
      retry: 1,
    },
  },
});
```

### 2. QueryClientProvider en Root

Dans `src/main.tsx` ou `src/App.tsx`:

```typescript
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <YourApp />
      <ReactQueryDevtools initialIsOpen={false} />
    </QueryClientProvider>
  );
}
```

## useQuery Pattern Basique

### 1. Query Simple

```typescript
import { useQuery } from "@tanstack/react-query";
import { supabase } from "@/lib/supabase";

function DocumentList() {
  const { data, isLoading, error } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*");

      if (error) throw error;
      return data;
    },
  });

  if (isLoading) return <div>Chargement...</div>;
  if (error) return <div>Erreur: {error.message}</div>;

  return (
    <ul>
      {data?.map((doc) => (
        <li key={doc.id}>{doc.title}</li>
      ))}
    </ul>
  );
}
```

### 2. Query avec Paramètres

```typescript
function DocumentDetail({ documentId }: { documentId: string }) {
  const { data: document, isLoading } = useQuery({
    queryKey: ["documents", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
    // Optionnel: paramètres personnalisés
    staleTime: 1000 * 60 * 15, // 15 minutes
    gcTime: 1000 * 60 * 30, // 30 minutes
  });

  if (isLoading) return <div>Chargement...</div>;

  return <div>{document?.title}</div>;
}
```

### 3. Query Conditionnelle

```typescript
function UserDocuments({ userId }: { userId: string | null }) {
  const { data: documents } = useQuery({
    queryKey: ["user", userId, "documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId);
      return data;
    },
    enabled: !!userId, // N'exécuter que si userId existe
  });

  return <div>{documents?.length} documents</div>;
}
```

## useMutation Pattern

### 1. Mutation Simple

```typescript
import { useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";

function CreateDocument() {
  const mutation = useMutation({
    mutationFn: async (newDoc: { title: string; content: string }) => {
      const { data, error } = await supabase
        .from("documents")
        .insert([newDoc])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (newDoc) => {
      // Invalider et refetcher les documents
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });

      // Toast de succès
      showToast(`Document "${newDoc.title}" créé`);
    },
    onError: (error) => {
      showToast(`Erreur: ${error.message}`);
    },
  });

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        mutation.mutate({ title: "New", content: "Content" });
      }}
    >
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Création..." : "Créer"}
      </button>
    </form>
  );
}
```

### 2. Optimistic Updates

```typescript
function UpdateDocument({ documentId, initialTitle }: any) {
  const mutation = useMutation({
    mutationFn: async (newTitle: string) => {
      const { data, error } = await supabase
        .from("documents")
        .update({ title: newTitle })
        .eq("id", documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    // Mettre à jour le cache avant la requête
    onMutate: async (newTitle) => {
      // Annuler les queries en vol
      await queryClient.cancelQueries({
        queryKey: ["documents", documentId],
      });

      // Snapshot l'état antérieur
      const previousDocument = queryClient.getQueryData([
        "documents",
        documentId,
      ]);

      // Mettre à jour le cache de manière optimiste
      queryClient.setQueryData(
        ["documents", documentId],
        (old: any) => ({ ...old, title: newTitle })
      );

      return { previousDocument };
    },
    // Revenir en arrière en cas d'erreur
    onError: (err, variables, context: any) => {
      queryClient.setQueryData(
        ["documents", documentId],
        context.previousDocument
      );
    },
    // Refetcher après succès
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents", documentId],
      });
    },
  });

  return (
    <input
      defaultValue={initialTitle}
      onChange={(e) => {
        mutation.mutate(e.target.value);
      }}
    />
  );
}
```

### 3. Mutation avec Optimisation et Erreur

```typescript
interface UpdateDocumentData {
  title: string;
  content: string;
}

function EditDocumentForm({ documentId }: { documentId: string }) {
  const { data: document } = useQuery({
    queryKey: ["documents", documentId],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();
      return data;
    },
  });

  const mutation = useMutation<UpdateDocumentData, Error, UpdateDocumentData>({
    mutationFn: async (updates) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", documentId)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onMutate: async (newData) => {
      await queryClient.cancelQueries({
        queryKey: ["documents", documentId],
      });

      const previous = queryClient.getQueryData([
        "documents",
        documentId,
      ]);

      queryClient.setQueryData(
        ["documents", documentId],
        (old: any) => ({ ...old, ...newData })
      );

      return { previous };
    },
    onError: (_, __, context: any) => {
      queryClient.setQueryData(
        ["documents", documentId],
        context.previous
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
  });

  if (!document) return <div>Chargement...</div>;

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        mutation.mutate({
          title: formData.get("title") as string,
          content: formData.get("content") as string,
        });
      }}
    >
      <input name="title" defaultValue={document.title} />
      <textarea name="content" defaultValue={document.content} />
      <button disabled={mutation.isPending}>
        {mutation.isPending ? "Sauvegarde..." : "Sauvegarder"}
      </button>
      {mutation.isError && (
        <div className="error">{mutation.error?.message}</div>
      )}
    </form>
  );
}
```

## useInfiniteQuery pour Pagination

### Pagination Avec Offset

```typescript
import { useInfiniteQuery } from "@tanstack/react-query";

function DocumentsList() {
  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
  } = useInfiniteQuery({
    queryKey: ["documents"],
    queryFn: async ({ pageParam = 0 }) => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .range(pageParam, pageParam + 9);

      if (error) throw error;
      return data;
    },
    getNextPageParam: (lastPage, allPages) => {
      return lastPage.length === 10 ? allPages.length * 10 : undefined;
    },
    initialPageParam: 0,
  });

  if (isLoading) return <div>Chargement...</div>;

  return (
    <>
      <ul>
        {data?.pages.flat().map((doc) => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        {isFetchingNextPage ? "Chargement..." : "Plus"}
      </button>
    </>
  );
}
```

### Pagination Avec Curseur

```typescript
function DocumentsListCursor() {
  const { data, fetchNextPage, hasNextPage, isFetchingNextPage } =
    useInfiniteQuery({
      queryKey: ["documents"],
      queryFn: async ({ pageParam = null }) => {
        let query = supabase
          .from("documents")
          .select("*")
          .limit(10);

        if (pageParam) {
          query = query.gt("id", pageParam);
        }

        const { data, error } = await query;
        if (error) throw error;
        return data;
      },
      getNextPageParam: (lastPage) => {
        if (lastPage.length === 0) return undefined;
        return lastPage[lastPage.length - 1].id;
      },
      initialPageParam: null,
    });

  return (
    <>
      <ul>
        {data?.pages.flat().map((doc) => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
      <button
        onClick={() => fetchNextPage()}
        disabled={!hasNextPage || isFetchingNextPage}
      >
        Charger plus
      </button>
    </>
  );
}
```

## Query Invalidation Stratégies

### 1. Invalider Un Scope Spécifique

```typescript
// Invalider une query précise
queryClient.invalidateQueries({
  queryKey: ["documents", documentId],
});

// Invalider toutes les documents queries
queryClient.invalidateQueries({
  queryKey: ["documents"],
});

// Invalider tout
queryClient.invalidateQueries();
```

### 2. Invalider Après Mutation

```typescript
const mutation = useMutation({
  mutationFn: deleteDocument,
  onSuccess: (_, { documentId }) => {
    // Invalider juste ce document
    queryClient.invalidateQueries({
      queryKey: ["documents", documentId],
    });

    // Ou invalider la liste complète
    queryClient.invalidateQueries({
      queryKey: ["documents"],
    });
  },
});
```

## Prefetching Patterns

### 1. Prefetch au Hover/Focus

```typescript
import { usePrefetchQuery } from "@tanstack/react-query";

function DocumentLink({ documentId }: { documentId: string }) {
  const prefetchQuery = usePrefetchQuery();

  return (
    <a
      href={`/documents/${documentId}`}
      onMouseEnter={() => {
        prefetchQuery({
          queryKey: ["documents", documentId],
          queryFn: async () => {
            const { data } = await supabase
              .from("documents")
              .select("*")
              .eq("id", documentId)
              .single();
            return data;
          },
        });
      }}
    >
      Document
    </a>
  );
}
```

### 2. Prefetch sur Route Change

```typescript
// Avant de naviguer vers une page detail
function DocumentsList() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const handleNavigate = (docId: string) => {
    // Prefetch avant de naviguer
    queryClient.prefetchQuery({
      queryKey: ["documents", docId],
      queryFn: async () => {
        const { data } = await supabase
          .from("documents")
          .select("*")
          .eq("id", docId)
          .single();
        return data;
      },
    });

    navigate(`/documents/${docId}`);
  };

  return <button onClick={() => handleNavigate("123")}>Voir</button>;
}
```

## Integration avec Express API

### Créer un Wrapper API Client

Dans `src/lib/api.ts`:

```typescript
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:3001";

interface ApiOptions extends RequestInit {
  token?: string;
}

export async function apiCall<T>(
  endpoint: string,
  options?: ApiOptions
): Promise<T> {
  const { token, ...fetchOptions } = options || {};

  const headers = new Headers(fetchOptions.headers);
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...fetchOptions,
    headers,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.message || response.statusText);
  }

  return response.json();
}
```

### Hook useQuery avec Express

```typescript
function UsersList() {
  const { data: users, isLoading } = useQuery({
    queryKey: ["users"],
    queryFn: async () => {
      return await apiCall<any[]>("/api/users");
    },
  });

  if (isLoading) return <div>Chargement...</div>;

  return (
    <ul>
      {users?.map((user) => (
        <li key={user.id}>{user.name}</li>
      ))}
    </ul>
  );
}
```

### Hook useMutation avec Express

```typescript
function CreateUser() {
  const mutation = useMutation({
    mutationFn: async (userData: { name: string; email: string }) => {
      return await apiCall("/api/users", {
        method: "POST",
        body: JSON.stringify(userData),
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
  });

  return (
    <form onSubmit={(e) => {
      e.preventDefault();
      mutation.mutate({
        name: "John",
        email: "john@example.com",
      });
    }}>
      <button disabled={mutation.isPending}>Créer</button>
    </form>
  );
}
```

## Parallel Queries avec useQueries

```typescript
import { useQueries } from "@tanstack/react-query";

function Dashboard({ userIds }: { userIds: string[] }) {
  const users = useQueries({
    queries: userIds.map((id) => ({
      queryKey: ["users", id],
      queryFn: async () => {
        const { data } = await supabase
          .from("users")
          .select("*")
          .eq("id", id)
          .single();
        return data;
      },
    })),
  });

  const isLoading = users.some((user) => user.isLoading);

  if (isLoading) return <div>Chargement...</div>;

  return (
    <div>
      {users.map((user) => (
        <div key={user.data?.id}>{user.data?.name}</div>
      ))}
    </div>
  );
}
```

## Dependent Queries

```typescript
function UserDocuments({ userId }: { userId: string | null }) {
  // Query 1: Récupérer l'utilisateur
  const { data: user, isLoading: userLoading } = useQuery({
    queryKey: ["users", userId],
    queryFn: async () => {
      const { data } = await supabase
        .from("users")
        .select("*")
        .eq("id", userId)
        .single();
      return data;
    },
    enabled: !!userId,
  });

  // Query 2: Dépend de la query 1
  const { data: documents, isLoading: docsLoading } = useQuery({
    queryKey: ["users", userId, "documents"],
    queryFn: async () => {
      const { data } = await supabase
        .from("documents")
        .select("*")
        .eq("user_id", userId);
      return data;
    },
    enabled: !!user, // N'exécute que si user est chargé
  });

  if (userLoading) return <div>Chargement utilisateur...</div>;
  if (docsLoading) return <div>Chargement documents...</div>;

  return (
    <div>
      <h1>{user?.name}</h1>
      <ul>
        {documents?.map((doc) => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

## Custom Hooks Réutilisables

### useDocuments Hook

```typescript
// src/hooks/useDocuments.ts
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import { supabase } from "@/lib/supabase";

export function useDocuments() {
  return useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .order("created_at", { ascending: false });

      if (error) throw error;
      return data;
    },
  });
}

export function useDocument(documentId: string) {
  return useQuery({
    queryKey: ["documents", documentId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*")
        .eq("id", documentId)
        .single();

      if (error) throw error;
      return data;
    },
    enabled: !!documentId,
  });
}

export function useCreateDocument() {
  return useMutation({
    mutationFn: async (doc: { title: string; content: string }) => {
      const { data, error } = await supabase
        .from("documents")
        .insert([doc])
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
  });
}

export function useUpdateDocument() {
  return useMutation({
    mutationFn: async ({
      id,
      ...updates
    }: { id: string } & Partial<any>) => {
      const { data, error } = await supabase
        .from("documents")
        .update(updates)
        .eq("id", id)
        .select()
        .single();

      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({
        queryKey: ["documents", data.id],
      });
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
  });
}

export function useDeleteDocument() {
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase
        .from("documents")
        .delete()
        .eq("id", id);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["documents"],
      });
    },
  });
}
```

### Utilisation des Custom Hooks

```typescript
function MyComponent() {
  const { data: documents } = useDocuments();
  const createDoc = useCreateDocument();
  const updateDoc = useUpdateDocument();
  const deleteDoc = useDeleteDocument();

  return (
    <div>
      {/* ... */}
    </div>
  );
}
```

## Error Handling et Retry

### Retry Stratégie

```typescript
import { useQuery } from "@tanstack/react-query";

function DocumentsList() {
  const { data, error, isError } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("documents")
        .select("*");

      if (error) throw error;
      return data;
    },
    retry: 3, // Réessayer 3 fois
    retryDelay: (attemptIndex) =>
      Math.min(1000 * 2 ** attemptIndex, 30000), // Exponential backoff
  });

  if (isError) {
    return <div>Erreur: {error?.message}</div>;
  }

  return <div>{data?.length} documents</div>;
}
```

### Error Boundary avec React Query

```typescript
import { useQueryErrorResetBoundary } from "@tanstack/react-query";
import { ErrorBoundary } from "react-error-boundary";

function App() {
  const { reset } = useQueryErrorResetBoundary();

  return (
    <ErrorBoundary
      onReset={reset}
      fallback={({ resetErrorBoundary }) => (
        <div>
          <p>Il y a eu une erreur</p>
          <button onClick={resetErrorBoundary}>Réessayer</button>
        </div>
      )}
    >
      <YourComponent />
    </ErrorBoundary>
  );
}
```

## DevTools Integration

```typescript
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

function App() {
  return (
    <>
      <YourApp />
      <ReactQueryDevtools
        initialIsOpen={false}
        buttonPosition="bottom-right"
      />
    </>
  );
}
```

## Anti-Patterns à Éviter

### 1. Ne Pas Utiliser useEffect pour Fetcher

```typescript
// MAUVAIS
function DocumentList() {
  const [data, setData] = useState([]);

  useEffect(() => {
    fetch("/api/documents")
      .then((r) => r.json())
      .then(setData);
  }, []);

  return <div>{data.length}</div>;
}

// BON
function DocumentList() {
  const { data } = useQuery({
    queryKey: ["documents"],
    queryFn: async () => {
      const res = await fetch("/api/documents");
      return res.json();
    },
  });

  return <div>{data?.length}</div>;
}
```

### 2. Toujours Utiliser un Array pour queryKey

```typescript
// MAUVAIS
useQuery({
  queryKey: "documents", // String, pas bon pour les params
  queryFn: () => {},
});

// BON
useQuery({
  queryKey: ["documents"], // Array, permet les variations
  queryFn: () => {},
});

useQuery({
  queryKey: ["documents", id], // Variation spécifique
  queryFn: () => {},
});
```

### 3. Ne Pas Oublier d'Invalider Après Mutations

```typescript
// MAUVAIS
const mutation = useMutation({
  mutationFn: createDocument,
  // Pas d'invalidation
});

// BON
const mutation = useMutation({
  mutationFn: createDocument,
  onSuccess: () => {
    queryClient.invalidateQueries({
      queryKey: ["documents"],
    });
  },
});
```

### 4. Toujours Vérifier enabled pour Queries Conditionnelles

```typescript
// MAUVAIS
useQuery({
  queryKey: ["user", userId],
  queryFn: () => getUserById(userId), // Erreur si userId est null
});

// BON
useQuery({
  queryKey: ["user", userId],
  queryFn: () => getUserById(userId),
  enabled: !!userId, // N'exécute que si userId existe
});
```

## Checklist d'Implémentation

- [ ] Installer `@tanstack/react-query` et devtools
- [ ] Créer `QueryClient` avec configuration par défaut
- [ ] Ajouter `QueryClientProvider` au layout racine
- [ ] Créer des custom hooks pour chaque entité (useDocuments, useUsers)
- [ ] Configurer Supabase ou Express API client
- [ ] Implémenter mutations avec optimistic updates
- [ ] Mettre en place une stratégie d'invalidation
- [ ] Configurer error handling et retry
- [ ] Tester avec React Query DevTools
- [ ] Optimiser les queryKey structures
- [ ] Ajouter prefetching pour UX améliorée

## Ressources

- TanStack Query Docs: https://tanstack.com/query/latest
- React Query Guide: https://tkdodo.eu/blog/
- Supabase + React Query: https://supabase.com/docs/guides/getting-started/tutorials/with-react
- Patterns avancés: https://tanstack.com/query/latest/docs/react/guides/important-defaults
