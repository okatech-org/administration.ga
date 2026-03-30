---
name: nextjs-app-router
description: "🚀 Expert Next.js 14+ App Router. S'active automatiquement pour les projets Next.js (digitalium.io, evenement.ga, foot.cd, AGASA Digital). Couvre routing, Server/Client Components, Suspense, Streaming, API Routes, middleware, ISR, Convex preloadQuery, image/font optimization, et patterns avancés."
---

# 🚀 Skill : Next.js 14+ App Router Expert

## Auto-Activation
Ce skill s'active quand :
- Le fichier ouvert est dans un projet contenant `next.config.*`
- La requête mentionne : page, route, layout, server component, API route, middleware, SSR, SSG, streaming, suspense, image, font, metadata, error handling, ISR, revalidate
- Les projets concernés : `digitalium.io`, `evenement.ga`, `foot.cd`, `AGASA Digital/*`

## Projets OkaTech utilisant Next.js

| Projet | Version | Auth | Backend | Patterns clés |
|---|---|---|---|---|
| `digitalium.io` | 14.2 | Custom | Convex | Multi-persona, preloadQuery |
| `evenement.ga` | 14.2 | NextAuth v5 | Convex + Prisma | API routes + Convex |
| `foot.cd` | 14.2 | Clerk | Convex | Clerk middleware, webhooks |
| `AGASA-Admin` | 15-16 | Custom | Convex + CloudSQL | Cloud Run, monorepo |
| `AGASA-Core` | 15-16 | Custom | Convex | Server actions, streaming |
| `AGASA-Pro` | 15-16 | Custom | Convex | Incremental adoption |
| `AGASA-Citoyen` | 15-16 | Custom | Convex | Progressive enhancement |

---

## Règles Strictes : Structure du App Router

### Architecture Standard
```
app/
├── layout.tsx                  # Root layout (Server Component)
├── page.tsx                    # Home page
├── globals.css                 # Global styles
├── error.tsx                   # Global error boundary
├── not-found.tsx               # 404 page
├── loading.tsx                 # Global loading (used with Suspense)
│
├── (auth)/                     # Route Group: Auth flows
│   ├── layout.tsx              # Auth layout (shared UI)
│   ├── login/page.tsx
│   ├── register/page.tsx
│   ├── reset-password/page.tsx
│   └── callback/page.tsx       # OAuth callback
│
├── (dashboard)/                # Route Group: Protected pages
│   ├── layout.tsx              # Dashboard layout
│   ├── page.tsx                # /dashboard
│   ├── error.tsx               # Dashboard-specific error
│   ├── [module]/               # Dynamic segment
│   │   ├── page.tsx
│   │   ├── [id]/page.tsx       # Nested dynamic
│   │   └── error.tsx           # Module-level error
│   ├── @sidebar/               # Parallel route (slot)
│   │   ├── page.tsx
│   │   └── default.tsx
│   └── @modal/                 # Intercepting route
│       ├── (.)edit/[id]/page.tsx
│       └── default.tsx
│
├── api/                        # API Routes (Route Handlers)
│   ├── auth/
│   │   ├── login/route.ts
│   │   ├── logout/route.ts
│   │   └── callback/[provider]/route.ts
│   ├── webhooks/
│   │   ├── clerk/route.ts
│   │   └── convex/route.ts
│   └── [endpoint]/route.ts     # Catch-all
│
├── (sitemap)/                  # SEO & metadata
│   └── sitemap.xml/route.ts
│
└── middleware.ts               # Root-level middleware (NOT in app/)
```

---

## Server Components vs Client Components

### Server Component (Default - NO "use client")
```tsx
// app/(dashboard)/documents/page.tsx
import { Suspense } from "react";
import { DocumentList } from "@/components/DocumentList";
import { DocumentListSkeleton } from "@/components/DocumentListSkeleton";

// Direct DB/API access — runs on server only
async function fetchDocuments() {
  const response = await fetch("https://api.example.com/documents", {
    headers: { Authorization: `Bearer ${process.env.API_TOKEN}` },
    next: { revalidate: 3600 }, // ISR: cache 1 hour
  });
  return response.json();
}

// This component runs on the server, sends HTML to client
export default async function DocumentsPage() {
  const documents = await fetchDocuments();

  return (
    <div>
      <h1>My Documents</h1>

      {/* Streaming with Suspense */}
      <Suspense fallback={<DocumentListSkeleton />}>
        <DocumentList initialDocuments={documents} />
      </Suspense>
    </div>
  );
}

// Metadata generated server-side
export const metadata = {
  title: "Documents",
  description: "Manage your documents",
};
```

### Client Component ("use client" at top)
```tsx
// app/(dashboard)/documents/DocumentFilter.tsx
"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

// Interactive component - runs in browser
export function DocumentFilter({ documents }) {
  const [searchTerm, setSearchTerm] = useState("");
  const [filtered, setFiltered] = useState(documents);

  function handleSearch(value: string) {
    setSearchTerm(value);
    setFiltered(
      documents.filter((doc) =>
        doc.title.toLowerCase().includes(value.toLowerCase())
      )
    );
  }

  return (
    <div>
      <Input
        placeholder="Search documents..."
        value={searchTerm}
        onChange={(e) => handleSearch(e.target.value)}
      />
      <ul>
        {filtered.map((doc) => (
          <li key={doc.id}>{doc.title}</li>
        ))}
      </ul>
    </div>
  );
}
```

### Mixing Server & Client Components
```tsx
// ✅ CORRECT: Server component fetches, client component interacts
// app/(dashboard)/documents/page.tsx (Server)
import { DocumentFilter } from "./DocumentFilter"; // Client

export default async function Page() {
  const documents = await fetchDocuments(); // Server-side fetch

  return (
    <div>
      <h1>Documents</h1>
      <DocumentFilter documents={documents} /> {/* Pass data as props */}
    </div>
  );
}

// ❌ WRONG: Cannot import server component into client component
// DocumentFilter.tsx (Client - "use client")
// import { fetchDocuments } from "@/lib/api"; // ❌ This won't work!
```

---

## Streaming & Suspense Boundaries

### Basic Suspense Pattern
```tsx
// app/page.tsx
import { Suspense } from "react";

function Fallback() {
  return <div className="animate-pulse">Loading...</div>;
}

async function SlowComponent() {
  await new Promise((resolve) => setTimeout(resolve, 5000)); // Slow query
  return <div>Finally loaded!</div>;
}

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>

      {/* Stream this section separately */}
      <Suspense fallback={<Fallback />}>
        <SlowComponent />
      </Suspense>
    </div>
  );
}
```

### Multiple Suspense Boundaries (Progressive Enhancement)
```tsx
// app/(dashboard)/page.tsx
import { Suspense } from "react";
import { RecentActivity } from "@/components/RecentActivity";
import { Analytics } from "@/components/Analytics";
import { Skeleton } from "@/components/ui/skeleton";

export default function DashboardPage() {
  return (
    <div className="grid gap-4">
      {/* Quick load */}
      <h1>Dashboard</h1>

      {/* Stream analytics after page interactive */}
      <Suspense fallback={<Skeleton className="h-64" />}>
        <Analytics />
      </Suspense>

      {/* Stream activity feed */}
      <Suspense fallback={<Skeleton className="h-96" />}>
        <RecentActivity />
      </Suspense>
    </div>
  );
}
```

### Streaming with Server-Sent Events (SSE)
```tsx
// app/api/stream/route.ts
export async function GET() {
  const stream = new ReadableStream({
    async start(controller) {
      // Stream data in chunks
      for (let i = 0; i < 10; i++) {
        controller.enqueue(`data: ${JSON.stringify({ count: i })}\n\n`);
        await new Promise((resolve) => setTimeout(resolve, 1000));
      }
      controller.close();
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
```

---

## Route Groups (Parenthesized Folders)

Route groups allow organizing routes without affecting URL structure.

```
app/
├── (marketing)/           # /
│   ├── page.tsx
│   ├── layout.tsx         # Marketing layout
│   ├── features/page.tsx  # /features
│   └── pricing/page.tsx   # /pricing
│
├── (dashboard)/           # /dashboard
│   ├── layout.tsx         # Auth layout
│   └── page.tsx           # /dashboard
│
└── (auth)/                # /(auth) - hidden in URL
    ├── login/page.tsx     # /login
    ├── register/page.tsx  # /register
    └── layout.tsx         # Auth flow layout
```

### Implementing Route Groups
```tsx
// app/(marketing)/layout.tsx
export default function MarketingLayout({ children }) {
  return (
    <div>
      <header>Marketing Header</header>
      {children}
      <footer>Marketing Footer</footer>
    </div>
  );
}

// app/(dashboard)/layout.tsx
import { requireAuth } from "@/lib/auth";

export default async function DashboardLayout({ children }) {
  await requireAuth(); // Protect all /dashboard routes

  return (
    <div className="flex">
      <aside>Dashboard Sidebar</aside>
      <main>{children}</main>
    </div>
  );
}

// URLs:
// /           → (marketing) layout
// /features   → (marketing) layout
// /dashboard  → (dashboard) layout
// /login      → (auth) layout
```

---

## Parallel Routes & Intercepting Routes

### Parallel Routes (Slots)
```
app/(dashboard)/
├── layout.tsx
├── page.tsx                    # /dashboard
├── @sidebar/                   # Parallel slot
│   ├── default.tsx
│   ├── page.tsx
│   └── error.tsx
└── @modal/                     # Another parallel slot
    ├── default.tsx
    └── (.)edit/[id]/page.tsx   # Intercepting route
```

### Implementing Parallel Routes
```tsx
// app/(dashboard)/layout.tsx
export default function DashboardLayout({
  children,
  sidebar,
  modal,
}: {
  children: React.ReactNode;
  sidebar: React.ReactNode;
  modal: React.ReactNode;
}) {
  return (
    <div className="flex gap-4">
      <aside className="w-64">{sidebar}</aside>
      <main className="flex-1">{children}</main>
      {modal}
    </div>
  );
}

// app/(dashboard)/@sidebar/default.tsx
export default function SidebarDefault() {
  return <div>Select an item</div>;
}

// app/(dashboard)/@modal/(.)edit/[id]/page.tsx
// This intercepts /dashboard/edit/[id] and shows it as a modal
export default function EditModal({ params }: { params: { id: string } }) {
  return (
    <dialog open>
      <h2>Edit {params.id}</h2>
      {/* Modal content */}
    </dialog>
  );
}
```

---

## Image Optimization with next/image

```tsx
// ✅ Always use next/image for optimization
import Image from "next/image";

export function ProductImage({ src, alt }) {
  return (
    <Image
      src={src}
      alt={alt}
      width={500}
      height={300}
      quality={85}               // 85% quality (default)
      placeholder="blur"         // Blur while loading
      blurDataURL="/blur.jpg"    // Placeholder image
      priority={false}           // Don't lazy load if critical
      sizes="(max-width: 768px) 100vw, 50vw" // Responsive
      className="rounded-lg"
    />
  );
}

// For external images (Unsplash, CDN):
export function ExternalImage() {
  return (
    <Image
      src="https://images.unsplash.com/photo-..."
      alt="Description"
      width={800}
      height={600}
      unoptimized={true} // Only if you can't optimize the source
    />
  );
}
```

---

## Font Optimization with next/font

```tsx
// app/layout.tsx
import { Inter, Playfair_Display } from "next/font/google";

const inter = Inter({
  subsets: ["latin"],
  display: "swap", // FOUT strategy
  preload: true,
});

const playfair = Playfair_Display({
  subsets: ["latin"],
  weight: ["400", "700"],
  variable: "--font-playfair", // CSS variable
});

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.className} ${playfair.variable}`}>
      <body>{children}</body>
    </html>
  );
}

// styles/globals.css
@import url("@/fonts/custom-font.woff2");

:root {
  --font-serif: var(--font-playfair);
}

body {
  font-family: var(--font-sans); /* Inter from next/font */
}

.serif {
  font-family: var(--font-serif);
}
```

---

## Metadata API (generateMetadata)

### Static Metadata
```tsx
// app/(marketing)/page.tsx
import { Metadata } from "next";

export const metadata: Metadata = {
  title: "Home",
  description: "Welcome to our app",
  openGraph: {
    title: "Home",
    description: "Welcome to our app",
    url: "https://example.com",
    images: [{ url: "/og.png", width: 1200, height: 630 }],
  },
  twitter: {
    card: "summary_large_image",
    title: "Home",
    description: "Welcome to our app",
    images: ["/og.png"],
  },
};

export default function Page() {
  return <h1>Home</h1>;
}
```

### Dynamic Metadata
```tsx
// app/products/[id]/page.tsx
import { Metadata } from "next";

type Props = {
  params: { id: string };
};

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await fetch(`/api/products/${params.id}`).then((r) =>
    r.json()
  );

  return {
    title: product.name,
    description: product.description,
    openGraph: {
      title: product.name,
      description: product.description,
      images: [{ url: product.image, width: 800, height: 600 }],
    },
  };
}

export default function ProductPage({ params }: Props) {
  return <h1>{params.id}</h1>;
}
```

---

## Error Handling (error.tsx, not-found.tsx, loading.tsx)

### Error Boundaries
```tsx
// app/(dashboard)/error.tsx
"use client";

import { useEffect } from "react";

export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // Log error to service (Sentry, etc.)
    console.error(error);
  }, [error]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h2 className="text-2xl font-bold">Something went wrong!</h2>
      <p className="text-gray-600 mt-2">{error.message}</p>
      <button
        onClick={() => reset()}
        className="mt-4 px-4 py-2 bg-blue-600 text-white rounded"
      >
        Try again
      </button>
    </div>
  );
}

// app/(dashboard)/page.tsx
async function RiskyOperation() {
  throw new Error("Simulated error");
}

export default async function Page() {
  return <RiskyOperation />;
}
```

### Not Found Pages
```tsx
// app/not-found.tsx
import Link from "next/link";

export default function NotFound() {
  return (
    <div className="flex flex-col items-center justify-center min-h-screen">
      <h1 className="text-4xl font-bold">404</h1>
      <p className="text-gray-600 mt-2">Page not found</p>
      <Link href="/" className="mt-4 text-blue-600">
        Go back home
      </Link>
    </div>
  );
}
```

### Loading Skeletons
```tsx
// app/(dashboard)/loading.tsx
import { Skeleton } from "@/components/ui/skeleton";

export default function Loading() {
  return (
    <div className="space-y-4">
      <Skeleton className="h-12 w-full" />
      <Skeleton className="h-96 w-full" />
      <div className="grid grid-cols-3 gap-4">
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
        <Skeleton className="h-48" />
      </div>
    </div>
  );
}
```

---

## Middleware Patterns

### Authentication Middleware
```ts
// middleware.ts
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

export function middleware(request: NextRequest) {
  const authToken = request.cookies.get("auth-token");

  // Protect dashboard routes
  if (request.nextUrl.pathname.startsWith("/dashboard")) {
    if (!authToken) {
      return NextResponse.redirect(new URL("/login", request.url));
    }
  }

  // Redirect authenticated users away from login
  if (request.nextUrl.pathname.startsWith("/login")) {
    if (authToken) {
      return NextResponse.redirect(new URL("/dashboard", request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/dashboard/:path*", "/login"],
};
```

### i18n Middleware
```ts
// middleware.ts
import { match as matchLocale } from "@formatjs/intl-localematcher";
import Negotiator from "negotiator";

const locales = ["en", "fr", "es"];
const defaultLocale = "en";

function getLocale(request: NextRequest): string {
  const negotiatorHeaders: Record<string, string> = {};
  request.headers.forEach((value, key) => (negotiatorHeaders[key] = value));

  const languages = new Negotiator({ headers: negotiatorHeaders }).languages(
    locales
  );

  try {
    return matchLocale(languages, locales, defaultLocale);
  } catch {
    return defaultLocale;
  }
}

export function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Check if locale already in pathname
  const pathnameHasLocale = locales.some(
    (locale) => pathname.startsWith(`/${locale}/`) || pathname === `/${locale}`
  );

  if (pathnameHasLocale) return;

  const locale = getLocale(request);
  return NextResponse.redirect(new URL(`/${locale}${pathname}`, request.url));
}

export const config = {
  matcher: ["/((?!api|_next/static|_next/image|favicon.ico).*)"],
};
```

---

## ISR (Incremental Static Regeneration)

### ISR with revalidate
```tsx
// app/blog/[slug]/page.tsx
export const revalidate = 3600; // Revalidate every hour

async function getBlogPost(slug: string) {
  const response = await fetch(`https://api.example.com/posts/${slug}`, {
    next: { revalidate: 3600 }, // Also set in fetch
  });
  return response.json();
}

export async function generateStaticParams() {
  // Generate these pages at build time
  const posts = await fetch("https://api.example.com/posts").then((r) =>
    r.json()
  );

  return posts.map((post) => ({
    slug: post.slug,
  }));
}

export default async function BlogPost({
  params,
}: {
  params: { slug: string };
}) {
  const post = await getBlogPost(params.slug);

  return (
    <article>
      <h1>{post.title}</h1>
      <p>{post.content}</p>
    </article>
  );
}
```

### On-Demand Revalidation
```tsx
// app/api/revalidate/route.ts
import { revalidatePath, revalidateTag } from "next/cache";
import { NextRequest, NextResponse } from "next/server";

export async function POST(request: NextRequest) {
  const secret = request.nextUrl.searchParams.get("secret");

  if (secret !== process.env.REVALIDATION_SECRET) {
    return NextResponse.json({ message: "Invalid secret" }, { status: 401 });
  }

  try {
    // Revalidate by path
    await revalidatePath("/blog");

    // Revalidate by tag (used in fetch)
    await revalidateTag("blog-posts");

    return NextResponse.json({ revalidated: true, now: Date.now() });
  } catch (error) {
    return NextResponse.json(
      { message: "Error revalidating" },
      { status: 500 }
    );
  }
}

// Use tags in fetch:
async function getBlogPosts() {
  return fetch("https://api.example.com/posts", {
    next: { tags: ["blog-posts"] },
  });
}
```

---

## Convex + Server Components (preloadQuery)

### Preload in Server Component
```tsx
// app/(dashboard)/documents/page.tsx
import { preloadQuery } from "convex/nextjs";
import { api } from "@/convex/_generated/api";

export default async function DocumentsPage() {
  // Preload on server, hydrate on client
  const preloadedDocuments = await preloadQuery(api.documents.list);

  return (
    <div>
      <h1>Documents</h1>
      <DocumentList preloadedDocuments={preloadedDocuments} />
    </div>
  );
}

// app/(dashboard)/documents/DocumentList.tsx
"use client";

import { Preloaded, usePreloadedQuery } from "convex/react";
import { api } from "@/convex/_generated/api";

export function DocumentList({
  preloadedDocuments,
}: {
  preloadedDocuments: Preloaded<typeof api.documents.list>;
}) {
  // Hydrate with preloaded data (no waterfall)
  const documents = usePreloadedQuery(preloadedDocuments);

  return (
    <ul>
      {documents.map((doc) => (
        <li key={doc._id}>{doc.title}</li>
      ))}
    </ul>
  );
}
```

### useConvex for Server-Side Mutations
```tsx
// app/(dashboard)/documents/DocumentUpload.tsx
"use client";

import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function DocumentUpload() {
  const uploadDocument = useMutation(api.documents.upload);

  async function handleUpload(file: File) {
    try {
      const result = await uploadDocument({
        name: file.name,
        content: await file.text(),
      });
      console.log("Uploaded:", result);
    } catch (error) {
      console.error("Upload failed:", error);
    }
  }

  return (
    <input
      type="file"
      onChange={(e) => handleUpload(e.target.files![0])}
    />
  );
}
```

---

## API Route Caching Strategies

### GET with Cache Headers
```ts
// app/api/products/route.ts
import { NextResponse } from "next/server";

export async function GET(request: Request) {
  const data = await fetch("https://api.example.com/products", {
    next: { revalidate: 3600 }, // Cache for 1 hour
  }).then((r) => r.json());

  return NextResponse.json(data, {
    headers: {
      "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
    },
  });
}
```

### POST (No Cache)
```ts
// app/api/create/route.ts
export async function POST(request: Request) {
  const body = await request.json();

  // Mutation — don't cache
  const result = await mutateDatabase(body);

  return NextResponse.json(result, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
```

---

## Dynamic Imports with next/dynamic

### Lazy Load Components
```tsx
// app/page.tsx
import dynamic from "next/dynamic";
import { Suspense } from "react";

// Load component only when needed
const HeavyChart = dynamic(
  () => import("@/components/HeavyChart"),
  {
    loading: () => <p>Loading chart...</p>,
    ssr: false, // Don't render on server
  }
);

export default function Page() {
  return (
    <div>
      <h1>Dashboard</h1>
      <Suspense fallback={<p>Loading...</p>}>
        <HeavyChart />
      </Suspense>
    </div>
  );
}
```

---

## Server Actions

### Simple Server Action
```tsx
// app/actions.ts
"use server";

import { db } from "@/lib/db";

export async function createDocument(formData: FormData) {
  const name = formData.get("name") as string;

  try {
    const doc = await db.documents.create({ name });
    return { success: true, document: doc };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

// app/(dashboard)/documents/NewDocumentForm.tsx
"use client";

import { createDocument } from "@/app/actions";
import { useFormStatus } from "react-dom";

export function NewDocumentForm() {
  const { pending } = useFormStatus();

  return (
    <form action={createDocument}>
      <input type="text" name="name" placeholder="Document name" />
      <button type="submit" disabled={pending}>
        {pending ? "Creating..." : "Create"}
      </button>
    </form>
  );
}
```

### Server Action with Validation
```tsx
// app/actions.ts
"use server";

import { z } from "zod";

const createDocumentSchema = z.object({
  name: z.string().min(1),
  content: z.string().optional(),
});

export async function createDocument(formData: FormData) {
  const rawData = {
    name: formData.get("name"),
    content: formData.get("content"),
  };

  const validation = createDocumentSchema.safeParse(rawData);

  if (!validation.success) {
    return { error: validation.error.flatten() };
  }

  const { name, content } = validation.data;
  // Create document...
}
```

---

## AGASA Project Patterns (Next.js 14-16 + Convex + Cloud Run)

### Multi-Project Deployment Setup
```tsx
// apps/admin/app/layout.tsx
import { ConvexClientProvider } from "@/components/ConvexProvider";

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        <ConvexClientProvider>
          {children}
        </ConvexClientProvider>
      </body>
    </html>
  );
}

// apps/core/app/layout.tsx
// Same pattern for each app in the monorepo
```

### Cloud Run Deployment
```dockerfile
# Dockerfile
FROM node:20-alpine

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY . .

RUN npm run build

EXPOSE 3000

CMD ["npm", "start"]
```

### Environment-Specific Config
```ts
// next.config.js
/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_CONVEX_URL: process.env.NEXT_PUBLIC_CONVEX_URL,
    NEXT_PUBLIC_APP_ENV: process.env.NEXT_PUBLIC_APP_ENV,
  },
  images: {
    remotePatterns: [
      { hostname: "*.googleapis.com" },
      { hostname: "*.cloudstorage.app" },
    ],
  },
};

module.exports = nextConfig;
```

---

## Anti-Patterns à ÉVITER
- ❌ Ne JAMAIS utiliser `getServerSideProps` ou `getStaticProps` (Pages Router)
- ❌ Ne JAMAIS mettre `"use client"` sur un layout racine sans raison
- ❌ Ne JAMAIS fetch des données dans un Client Component si un Server Component peut le faire
- ❌ Ne JAMAIS utiliser `useRouter` de `next/router` — utiliser `next/navigation`
- ❌ Ne JAMAIS importer des composants serveur dans des composants client
- ❌ Ne JAMAIS faire confiance aux données côté client pour les contrôles d'accès
- ❌ Ne JAMAIS oublier les `Suspense` boundaries autour des données lentes
- ❌ Ne JAMAIS utiliser `layout.tsx` pour les redirects d'auth (utiliser `middleware.ts`)
