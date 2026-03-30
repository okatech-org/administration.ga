---
name: convex-components
description: Expert en composants Convex ecosystem — Rate Limiter, Workflow, Stripe, Aggregate, Migrations, et plus
activation: Mots-cles — component, rate limit, workflow, stripe, migration, aggregate, presence, email, cache, retry, counter
projects: consulat.ga, digitalium.io, gabon-diplomatie, idetude.ga
---

# Skill: Convex Components Ecosystem

Expert guide pour l'utilisation des composants open-source Convex pour résoudre des problèmes courants en backend moderne. Couvre intégration, patterns avancés, et antipatterns.

---

## 1. Rate Limiter (@convex-dev/ratelimiter)

Contrôle du taux d'appels pour prévenir les abus et la surcharge.

### Installation

```bash
npm install @convex-dev/ratelimiter
```

### Configuration dans convex.config.ts

```typescript
// convex/lib/rateLimit.ts
import { rateLimiter } from "@convex-dev/ratelimiter";

// Pour tokens bucket avec 10 requêtes par minute par utilisateur
export const createUserLimiter = (userId: string) => {
  return rateLimiter(ctx, {
    key: `user-${userId}`,
    rate: 10,
    period: 60 * 1000, // 1 minute
    algorithm: "token-bucket"
  });
};

// Pour fixed window avec 100 requêtes par heure par IP
export const createIpLimiter = (ip: string) => {
  return rateLimiter(ctx, {
    key: `ip-${ip}`,
    rate: 100,
    period: 60 * 60 * 1000, // 1 heure
    algorithm: "fixed-window"
  });
};
```

### Patterns clés

#### Token Bucket (recommandé pour APIs fluides)

```typescript
// convex/functions/api/search.ts
import { authMutation } from "@/lib/customFunctions";
import { createUserLimiter } from "@/lib/rateLimit";

export const search = authMutation({
  args: { query: v.string() },
  handler: async (ctx, { query }) => {
    const userId = ctx.userId;
    const limiter = createUserLimiter(userId);

    // Consomme 1 token (par défaut)
    const allowed = await limiter.take(ctx, 1);

    if (!allowed) {
      throw new Error("Rate limit exceeded. Try again in 10 seconds.");
    }

    // Exécuter la requête coûteuse
    return await ctx.db
      .query("documents")
      .filter(q => q.eq(q.field("content"), query))
      .collect();
  }
});
```

#### Fixed Window (simple, pour quotas stricts)

```typescript
export const downloadReport = authMutation({
  args: {},
  handler: async (ctx) => {
    const ip = ctx.headers?.["x-forwarded-for"] || "unknown";
    const limiter = createIpLimiter(ip);

    const allowed = await limiter.take(ctx, 1);
    if (!allowed) {
      throw new Error("Daily download limit reached");
    }

    // Générer le rapport
    return generateReport();
  }
});
```

#### Consommation variable de tokens

```typescript
export const batchProcess = authMutation({
  args: { items: v.array(v.string()) },
  handler: async (ctx, { items }) => {
    const limiter = createUserLimiter(ctx.userId);

    // Traiter 10 items = 10 tokens
    const allowed = await limiter.take(ctx, items.length);
    if (!allowed) {
      throw new Error(`Need ${items.length} tokens, only have ${limiter.remaining}`);
    }

    return processItems(items);
  }
});
```

#### Sharding pour haute concurrence

```typescript
// convex/lib/shardedLimiter.ts
export const createShardedLimiter = (userId: string, shards = 10) => {
  const shard = hashCode(userId) % shards;
  return `user-${userId}-shard-${shard}`;
};

export const takeLimitedRequest = async (ctx, userId, tokensNeeded = 1) => {
  const key = createShardedLimiter(userId);
  return rateLimiter(ctx, {
    key,
    rate: 10,
    period: 60 * 1000,
    algorithm: "token-bucket"
  }).take(ctx, tokensNeeded);
};
```

### Pièges courants

- Ne pas sauvegarder l'état du limiter entre requêtes (Convex gère ça)
- Utiliser `fixed-window` pour APIs haute latence (preferer `token-bucket`)
- Oublier de vérifier le statut avant d'exécuter du travail coûteux

---

## 2. Workflow (@convex-dev/workflow)

Orchestration de workflows durables avec retries automatiques, delays, et attentes d'événements.

### Installation

```bash
npm install @convex-dev/workflow
```

### Configuration dans convex.config.ts

```typescript
// convex.config.ts
import { defineConfig } from "convex/config";

export default defineConfig({
  functions: async (runner) => {
    // Enregistrer les workflows
    runner.registerWorkflow("processingWorkflow");
    runner.registerWorkflow("approvalWorkflow");
  }
});
```

### Patterns clés

#### Workflow simple avec retries

```typescript
// convex/workflows/processingWorkflow.ts
import { workflow, step } from "@convex-dev/workflow";

export const processingWorkflow = workflow(
  async (ctx, documentId) => {
    // Étape 1 : Valider le document
    const document = await step(ctx, "validate", async () => {
      return await ctx.db.get(documentId);
    });

    if (!document) {
      throw new Error("Document not found");
    }

    // Étape 2 : Traiter avec retry automatique
    const result = await step(
      ctx,
      "process",
      async () => {
        return await expensiveProcessing(document);
      },
      {
        maxRetries: 3,
        backoff: { type: "exponential", baseDelayMs: 1000 }
      }
    );

    // Étape 3 : Sauvegarder le résultat
    await step(ctx, "save", async () => {
      return await ctx.db.patch(documentId, {
        processed: true,
        result
      });
    });

    return result;
  }
);

// Dans une mutation ou action
export const startProcessing = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    return await processingWorkflow.start(ctx, documentId);
  }
});
```

#### Workflow avec délai et attentes d'événements

```typescript
// convex/workflows/approvalWorkflow.ts
import { workflow, step } from "@convex-dev/workflow";

export const approvalWorkflow = workflow(
  async (ctx, requestId, managerId) => {
    // Envoyer la demande au manager
    await step(ctx, "notifyManager", async () => {
      await sendNotification(managerId, "Approval needed for request " + requestId);
    });

    // Attendre 24h pour une réponse
    const approval = await step(ctx, "waitForApproval", async () => {
      const event = await ctx.waitForEvent("approval", requestId, {
        timeoutMs: 24 * 60 * 60 * 1000 // 24 heures
      });
      return event?.data;
    });

    if (!approval) {
      // Timeout — marquer comme rejeté par défaut
      await step(ctx, "markRejected", async () => {
        return await ctx.db.patch(requestId, { status: "rejected" });
      });
      return { status: "rejected", reason: "timeout" };
    }

    // Approuvé
    await step(ctx, "markApproved", async () => {
      return await ctx.db.patch(requestId, {
        status: "approved",
        approvedBy: managerId,
        approvedAt: new Date()
      });
    });

    return { status: "approved" };
  }
);

// Déclencher un événement (depuis une action ou mutation)
export const approveRequest = authMutation({
  args: { requestId: v.id("requests"), approved: v.boolean() },
  handler: async (ctx, { requestId, approved }) => {
    const userId = ctx.userId;

    // Émettre l'événement que le workflow écoute
    await approvalWorkflow.emitEvent(ctx, "approval", requestId, {
      managerId: userId,
      decision: approved
    });

    return { success: true };
  }
});
```

#### Exécution parallèle dans les workflows

```typescript
// convex/workflows/parallelWorkflow.ts
export const parallelWorkflow = workflow(
  async (ctx, userId) => {
    // Étape 1 : Récupérer les données en parallèle
    const [userData, statistics, documents] = await Promise.all([
      step(ctx, "fetchUser", async () => {
        return await ctx.db.get(userId);
      }),
      step(ctx, "fetchStats", async () => {
        return await ctx.db.query("stats").filter(q =>
          q.eq(q.field("userId"), userId)
        ).first();
      }),
      step(ctx, "fetchDocuments", async () => {
        return await ctx.db.query("documents").filter(q =>
          q.eq(q.field("userId"), userId)
        ).collect();
      })
    ]);

    // Étape 2 : Agréger les résultats
    const aggregated = {
      user: userData,
      totalDocuments: documents.length,
      stats: statistics
    };

    return aggregated;
  }
);
```

#### Requête de workflow avec retry

```typescript
// convex/functions/api/queryWorkflow.ts
export const getWorkflowStatus = query({
  args: { workflowId: v.string() },
  handler: async (ctx, { workflowId }) => {
    // Récupérer l'état du workflow depuis Convex
    const status = await ctx.db
      .query("_workflows")
      .filter(q => q.eq(q.field("id"), workflowId))
      .first();

    return status;
  }
});
```

### Règles de déterminisme

Les workflows Convex exigent le **déterminisme** pour les retries :

- Ne pas utiliser `Math.random()`, `Date.now()`, ou `crypto.randomUUID()`
- Utiliser `step()` pour TOUS les appels I/O
- Ne pas faire de side effects en dehors de `step()`
- Les valeurs aléatoires doivent venir en arguments au workflow

```typescript
// MAUVAIS — non déterministe
export const badWorkflow = workflow(
  async (ctx, userId) => {
    const randomId = Math.random(); // ❌ Changera à chaque retry
    await step(ctx, "process", async () => {
      // ...
    });
  }
);

// BON — déterministe
export const goodWorkflow = workflow(
  async (ctx, userId, randomSeed) => {
    const randomId = randomSeed; // ✓ Même à chaque retry
    await step(ctx, "process", async () => {
      // ...
    });
  }
);
```

### Pièges courants

- Appeler `await` sur une requête Convex en dehors de `step()` → cassera le retry
- Modifier l'état global dans le workflow
- Oublier que les étapes sont **ré-exécutées** en cas d'erreur → ne pas compter sur les side effects
- Pas de `console.log` fiable dans les workflows (utiliser les events à la place)

---

## 3. Workpool (@convex-dev/workpool)

File d'attente de tâches avec limite de parallélisme et persistance automatique.

### Installation

```bash
npm install @convex-dev/workpool
```

### Patterns clés

#### Créer et utiliser un workpool

```typescript
// convex/lib/imageProcessingPool.ts
import { Workpool } from "@convex-dev/workpool";

export const imageProcessingPool = new Workpool(
  "imageProcessing",
  {
    maxParallel: 5, // Traiter 5 images en parallèle max
    timeoutMs: 30000, // Timeout de 30 secondes par image
  }
);

// convex/functions/imageProcessing.ts
export const scheduleImageResize = authMutation({
  args: { imageId: v.id("images"), targetSize: v.string() },
  handler: async (ctx, { imageId, targetSize }) => {
    // Ajouter à la file
    return await imageProcessingPool.enqueue(ctx, {
      type: "resize",
      imageId,
      targetSize
    });
  }
});

// Traiter les tâches
export const processImageTask = internalMutation({
  args: imageProcessingPool.jobType,
  handler: async (ctx, job) => {
    if (job.type === "resize") {
      const image = await ctx.db.get(job.imageId);

      // Traiter l'image
      const resized = await resizeImage(image.url, job.targetSize);

      // Sauvegarder le résultat
      await ctx.db.patch(job.imageId, {
        resizedUrl: resized.url,
        processed: true
      });

      return { success: true };
    }
  }
});
```

#### Workpool avec priorités

```typescript
// convex/lib/emailPool.ts
import { Workpool } from "@convex-dev/workpool";

export const emailPool = new Workpool("emailDelivery", {
  maxParallel: 10,
  priorityField: "priority" // Trier par ce champ
});

export const scheduleEmail = authMutation({
  args: {
    to: v.string(),
    subject: v.string(),
    priority: v.number() // 1 = haute, 10 = basse
  },
  handler: async (ctx, { to, subject, priority }) => {
    return await emailPool.enqueue(ctx, {
      to,
      subject,
      priority,
      timestamp: Date.now()
    });
  }
});

// Traiter dans l'ordre de priorité
export const processEmailTask = internalMutation({
  args: emailPool.jobType,
  handler: async (ctx, job) => {
    await sendEmailViaProvider(job.to, job.subject);
    return { sent: true };
  }
});
```

#### Retry avec backoff dans workpool

```typescript
export const processJobWithRetry = internalMutation({
  args: emailPool.jobType,
  handler: async (ctx, job) => {
    let lastError;
    let retries = 0;
    const maxRetries = 3;

    while (retries < maxRetries) {
      try {
        await sendEmailViaProvider(job.to, job.subject);
        return { success: true, retries };
      } catch (error) {
        lastError = error;
        retries++;

        if (retries < maxRetries) {
          // Attendre avant le retry (backoff exponentiel)
          await new Promise(resolve =>
            setTimeout(resolve, Math.pow(2, retries) * 1000)
          );
        }
      }
    }

    throw lastError;
  }
});
```

### Pièges courants

- Ne pas définir `maxParallel` → peut surcharger les ressources
- Oublier que les jobs ne sont PAS dupliqués par défaut en case d'erreur
- Utiliser workpool pour du work non-idempotent sans garanties

---

## 4. Aggregate (@convex-dev/aggregate)

Agrégations efficaces avec sharding pour compteurs haute-concurrence.

### Installation

```bash
npm install @convex-dev/aggregate
```

### Patterns clés

#### Compteur simple avec sharding

```typescript
// convex/lib/counters.ts
import { ShardedCounter } from "@convex-dev/aggregate";

// Compteur pour les likes d'un post
export const postLikeCounter = new ShardedCounter(
  "postLikes",
  {
    shards: 10, // Distribuer sur 10 shards pour concurrence
    type: "increment"
  }
);

// Incrémenter le compteur
export const likePost = authMutation({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    // Vérifier que l'utilisateur n'a pas déjà likée
    const existingLike = await ctx.db
      .query("likes")
      .filter(q =>
        q.and(
          q.eq(q.field("postId"), postId),
          q.eq(q.field("userId"), ctx.userId)
        )
      )
      .first();

    if (existingLike) {
      throw new Error("Already liked");
    }

    // Ajouter le like
    await ctx.db.insert("likes", {
      postId,
      userId: ctx.userId,
      createdAt: new Date()
    });

    // Incrémenter le compteur shardé
    await postLikeCounter.increment(ctx, postId);

    return { success: true };
  }
});

// Lire le total
export const getPostStats = query({
  args: { postId: v.id("posts") },
  handler: async (ctx, { postId }) => {
    const likeCount = await postLikeCounter.read(ctx, postId);
    const post = await ctx.db.get(postId);

    return {
      post,
      likeCount
    };
  }
});
```

#### Agrégation avec dimensions

```typescript
// convex/lib/metricsAggregate.ts
export const viewCounterByRegion = new ShardedCounter(
  "viewsByRegion",
  {
    shards: 20, // Plus de shards = plus de concurrence
    dimensions: ["region", "documentId"] // Grouper par région et document
  }
);

export const trackView = authMutation({
  args: { documentId: v.id("documents"), region: v.string() },
  handler: async (ctx, { documentId, region }) => {
    const key = `${region}-${documentId}`;
    await viewCounterByRegion.increment(ctx, key);

    return { tracked: true };
  }
});

export const getViewsByRegion = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    const regions = ["us", "eu", "asia"];
    const counts = await Promise.all(
      regions.map(region =>
        viewCounterByRegion.read(ctx, `${region}-${documentId}`)
      )
    );

    return regions.map((region, i) => ({
      region,
      count: counts[i]
    }));
  }
});
```

#### Reset et audit des compteurs

```typescript
export const resetCounter = internalMutation({
  args: { counterId: v.string(), key: v.string() },
  handler: async (ctx, { counterId, key }) => {
    // Récupérer le compteur
    const counter = new ShardedCounter(counterId);

    // Réinitialiser
    await counter.reset(ctx, key);

    return { reset: true };
  }
});

export const auditCounters = query({
  handler: async (ctx) => {
    // Lister tous les compteurs shardés
    const counters = await ctx.db
      .query("_sharded_counters")
      .collect();

    return counters;
  }
});
```

### Pièges courants

- Choisir trop peu de shards → contention même avec peu de users
- Choisir trop de shards → overhead de stockage et requêtes lentes
- 10-20 shards est généralement idéal
- Ne pas utiliser pour les compteurs faible-concurrence (sur-ingénierie)

---

## 5. Migrations (@convex-dev/migrations)

Patterns pour les migrations de données sûres, avec état et batching.

### Installation

```bash
npm install @convex-dev/migrations
```

### Patterns clés

#### Migration simple avec tracking

```typescript
// convex/migrations/addTimestamps.ts
import { Migration } from "@convex-dev/migrations";

export const addTimestampsToDocuments = new Migration(
  "addTimestampsToDocuments",
  "v1.2.0",
  {
    async execute(ctx) {
      // Récupérer tous les documents sans timestamps
      const documents = await ctx.db
        .query("documents")
        .filter(q => q.eq(q.field("createdAt"), null))
        .collect();

      // Mettre à jour par batch
      const batch = 100;
      for (let i = 0; i < documents.length; i += batch) {
        const chunk = documents.slice(i, i + batch);
        await Promise.all(
          chunk.map(doc =>
            ctx.db.patch(doc._id, {
              createdAt: new Date("2024-01-01"),
              updatedAt: new Date()
            })
          )
        );
      }

      return {
        migrated: documents.length,
        status: "completed"
      };
    },

    async rollback(ctx) {
      // Annuler la migration
      const documents = await ctx.db
        .query("documents")
        .filter(q => q.neq(q.field("createdAt"), null))
        .collect();

      await Promise.all(
        documents.map(doc =>
          ctx.db.patch(doc._id, {
            createdAt: null,
            updatedAt: null
          })
        )
      );

      return { rolled_back: true };
    }
  }
);
```

#### Migration avec state tracking (reprise après erreur)

```typescript
// convex/migrations/migrateUserProfiles.ts
interface MigrationState {
  processedCount: number;
  lastProcessedId?: string;
  status: "pending" | "in_progress" | "completed" | "failed";
}

export const migrateUserProfiles = new Migration(
  "migrateUserProfiles",
  "v1.5.0",
  {
    async execute(ctx) {
      // Initialiser l'état
      let state: MigrationState = {
        processedCount: 0,
        status: "in_progress"
      };

      let lastId = state.lastProcessedId;
      const batchSize = 50;

      // Boucle avec checkpoint
      while (true) {
        const users = await ctx.db
          .query("users")
          .filter(q => lastId ? q.gt(q.field("_id"), lastId) : true)
          .take(batchSize);

        if (users.length === 0) break;

        // Traiter le batch
        for (const user of users) {
          // Migration logic
          await ctx.db.patch(user._id, {
            profileUpdated: true,
            migratedAt: new Date()
          });

          state.processedCount++;
          state.lastProcessedId = user._id;
        }

        // Sauvegarder l'état pour reprise
        await ctx.db.insert("_migrationStates", state);
      }

      state.status = "completed";
      return state;
    }
  }
);
```

#### Migration transformant les données

```typescript
// convex/migrations/normalizeUserEmails.ts
export const normalizeUserEmails = new Migration(
  "normalizeUserEmails",
  "v1.3.0",
  {
    async execute(ctx) {
      const users = await ctx.db.query("users").collect();

      let updated = 0;
      await Promise.all(
        users.map(async (user) => {
          const normalizedEmail = user.email?.toLowerCase().trim();

          if (normalizedEmail !== user.email) {
            await ctx.db.patch(user._id, {
              email: normalizedEmail
            });
            updated++;
          }
        })
      );

      return {
        totalUsers: users.length,
        updated,
        unchanged: users.length - updated
      };
    }
  }
);
```

### Pièges courants

- Ne pas batcher les updates → timeout sur grandes tables
- Oublier le rollback → impossible revenir en arrière
- Modifier les schémas sans migration correspondante
- Pas de checkpoint → perte de progrès en cas de timeout

---

## 6. Stripe Integration (@convex-dev/stripe)

Gestion des paiements, souscriptions et webhooks avec Convex.

### Installation

```bash
npm install @convex-dev/stripe stripe
```

### Configuration dans convex.config.ts

```typescript
// convex/lib/stripe.ts
import Stripe from "stripe";

export const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!, {
  apiVersion: "2024-04-10"
});

// Fonction helper pour créer les customer
export async function getOrCreateStripeCustomer(
  ctx: any,
  userId: string,
  userEmail: string
) {
  const user = await ctx.db
    .query("users")
    .filter(q => q.eq(q.field("_id"), userId))
    .first();

  if (user?.stripeCustomerId) {
    return user.stripeCustomerId;
  }

  // Créer un nouveau customer
  const customer = await stripe.customers.create({
    email: userEmail,
    metadata: { userId }
  });

  // Sauvegarder l'ID
  await ctx.db.patch(userId, {
    stripeCustomerId: customer.id
  });

  return customer.id;
}
```

### Patterns clés

#### Créer une session de paiement unique

```typescript
// convex/functions/payments/createCheckoutSession.ts
import { stripe, getOrCreateStripeCustomer } from "@/lib/stripe";

export const createCheckoutSession = authMutation({
  args: {
    productId: v.string(),
    quantity: v.number(),
    successUrl: v.string(),
    cancelUrl: v.string()
  },
  handler: async (ctx, { productId, quantity, successUrl, cancelUrl }) => {
    const user = await ctx.db.get(ctx.userId);
    if (!user) throw new Error("User not found");

    // Obtenir ou créer le customer Stripe
    const customerId = await getOrCreateStripeCustomer(
      ctx,
      ctx.userId,
      user.email
    );

    // Créer la session
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      payment_method_types: ["card"],
      mode: "payment",
      line_items: [
        {
          price: productId, // Price ID de Stripe
          quantity
        }
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata: { userId: ctx.userId }
    });

    return { sessionId: session.id, url: session.url };
  }
});
```

#### Gérer les souscriptions

```typescript
// convex/functions/subscriptions/createSubscription.ts
export const createSubscription = authMutation({
  args: { priceId: v.string() },
  handler: async (ctx, { priceId }) => {
    const user = await ctx.db.get(ctx.userId);
    if (!user) throw new Error("User not found");

    const customerId = await getOrCreateStripeCustomer(
      ctx,
      ctx.userId,
      user.email
    );

    // Créer la souscription
    const subscription = await stripe.subscriptions.create({
      customer: customerId,
      items: [{ price: priceId }],
      payment_behavior: "default_incomplete",
      expand: ["latest_invoice.payment_intent"]
    });

    // Sauvegarder la souscription
    await ctx.db.patch(ctx.userId, {
      subscriptionId: subscription.id,
      subscriptionStatus: subscription.status,
      subscriptionPriceId: priceId
    });

    return {
      subscriptionId: subscription.id,
      clientSecret: subscription.latest_invoice?.payment_intent?.client_secret
    };
  }
});

// Récupérer l'état de la souscription
export const getSubscription = authQuery({
  handler: async (ctx) => {
    const user = await ctx.db.get(ctx.userId);
    if (!user?.subscriptionId) return null;

    const subscription = await stripe.subscriptions.retrieve(user.subscriptionId);

    return {
      id: subscription.id,
      status: subscription.status,
      currentPeriodEnd: new Date(subscription.current_period_end * 1000),
      cancelAtPeriodEnd: subscription.cancel_at_period_end,
      items: subscription.items.data.map(item => ({
        priceId: item.price.id,
        quantity: item.quantity
      }))
    };
  }
});
```

#### Gérer les webhooks Stripe

```typescript
// convex/functions/_webhooks/stripeWebhook.ts
import { httpAction } from "convex/server";
import Stripe from "stripe";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);
const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET!;

export const stripeWebhook = httpAction(async (ctx, request) => {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  // Vérifier la signature
  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  let event;
  try {
    const body = await request.text();
    event = stripe.webhooks.constructEvent(body, signature, webhookSecret);
  } catch (err) {
    return new Response(`Webhook signature verification failed`, { status: 400 });
  }

  // Traiter les événements
  switch (event.type) {
    case "checkout.session.completed": {
      const session = event.data.object as Stripe.Checkout.Session;
      const userId = session.metadata?.userId;

      if (userId) {
        // Marquer la commande comme complétée
        await ctx.db.insert("orders", {
          userId,
          stripeSessionId: session.id,
          amount: session.amount_total,
          status: "completed",
          createdAt: new Date()
        });
      }
      break;
    }

    case "customer.subscription.updated": {
      const subscription = event.data.object as Stripe.Subscription;
      const userId = subscription.metadata?.userId;

      if (userId) {
        // Mettre à jour le statut de la souscription
        await ctx.db.patch(userId, {
          subscriptionStatus: subscription.status,
          subscriptionId: subscription.id
        });
      }
      break;
    }

    case "invoice.payment_failed": {
      const invoice = event.data.object as Stripe.Invoice;
      console.error(`Payment failed for invoice ${invoice.id}`);
      // Notifier l'utilisateur, etc.
      break;
    }

    default:
      console.log(`Unhandled event type: ${event.type}`);
  }

  return new Response("Webhook received", { status: 200 });
});
```

#### Annuler une souscription

```typescript
export const cancelSubscription = authMutation({
  handler: async (ctx) => {
    const user = await ctx.db.get(ctx.userId);
    if (!user?.subscriptionId) {
      throw new Error("No active subscription");
    }

    // Annuler à la fin de la période
    const updated = await stripe.subscriptions.update(
      user.subscriptionId,
      { cancel_at_period_end: true }
    );

    await ctx.db.patch(ctx.userId, {
      subscriptionStatus: updated.status,
      cancelAtPeriodEnd: true
    });

    return { cancelled: true };
  }
});
```

### Pièges courants

- Oublier de vérifier la signature des webhooks → faille de sécurité
- Stocker les données sensibles de Stripe en local → utiliser les APIs
- Pas de retry sur les appels Stripe → perdre les webhooks
- Modifier le customer ID en base sans mettre à jour Stripe

---

## 7. Resend (@convex-dev/resend)

Envoi d'emails transactionnels via Resend.

### Installation

```bash
npm install resend
```

### Patterns clés

#### Envoyer un email simple

```typescript
// convex/functions/emails/sendWelcomeEmail.ts
import { Resend } from "resend";

const resend = new Resend(process.env.RESEND_API_KEY);

export const sendWelcomeEmail = authMutation({
  args: { email: v.string() },
  handler: async (ctx, { email }) => {
    try {
      const result = await resend.emails.send({
        from: "noreply@example.com",
        to: email,
        subject: "Bienvenue sur notre plateforme",
        html: `
          <h1>Bienvenue!</h1>
          <p>Merci de vous être inscrit.</p>
          <a href="https://example.com/confirm">Confirmer votre email</a>
        `
      });

      // Sauvegarder le log
      await ctx.db.insert("emailLogs", {
        userId: ctx.userId,
        to: email,
        subject: "Welcome",
        status: result.id ? "sent" : "failed",
        resendId: result.id,
        createdAt: new Date()
      });

      return { sent: true, id: result.id };
    } catch (error) {
      console.error("Failed to send email:", error);
      throw new Error("Email send failed");
    }
  }
});
```

#### Envoyer avec template React

```typescript
// convex/functions/emails/sendOrderConfirmation.ts
import { render } from "@react-email/render";
import OrderConfirmationTemplate from "@/emails/OrderConfirmation";

export const sendOrderConfirmation = authMutation({
  args: {
    email: v.string(),
    orderId: v.id("orders")
  },
  handler: async (ctx, { email, orderId }) => {
    const order = await ctx.db.get(orderId);
    if (!order) throw new Error("Order not found");

    // Générer le HTML depuis React
    const html = await render(
      <OrderConfirmationTemplate order={order} />
    );

    const result = await resend.emails.send({
      from: "orders@example.com",
      to: email,
      subject: `Confirmation de votre commande ${order.orderNumber}`,
      html
    });

    return { sent: true, resendId: result.id };
  }
});

// components/emails/OrderConfirmation.tsx
export function OrderConfirmationTemplate({ order }) {
  return (
    <div style={{ fontFamily: "Arial, sans-serif" }}>
      <h1>Commande confirmée</h1>
      <p>Numéro de commande: {order.orderNumber}</p>
      <p>Total: {order.total} EUR</p>
      <p>Livraison estimée: {order.estimatedDelivery}</p>
    </div>
  );
}
```

#### Envoyer des emails en batch avec délai

```typescript
// convex/functions/emails/sendBatchEmails.ts
export const scheduleBatchEmails = internalMutation({
  args: {
    userIds: v.array(v.id("users")),
    templateType: v.string()
  },
  handler: async (ctx, { userIds, templateType }) => {
    const resend = new Resend(process.env.RESEND_API_KEY);

    let sent = 0;
    let failed = 0;

    for (const userId of userIds) {
      try {
        const user = await ctx.db.get(userId);
        if (!user) continue;

        const result = await resend.emails.send({
          from: "newsletter@example.com",
          to: user.email,
          subject: `[${templateType}] Nouveau contenu disponible`,
          html: `<p>Bonjour ${user.name},</p><p>Découvrez nos nouveautés...</p>`
        });

        if (result.id) sent++;
        else failed++;

        // Attendre 100ms entre les emails pour respecter les limites
        await new Promise(resolve => setTimeout(resolve, 100));
      } catch (error) {
        failed++;
        console.error(`Failed to send email to ${userId}:`, error);
      }
    }

    return { sent, failed, total: userIds.length };
  }
});
```

### Pièges courants

- Envoyer sans limiter le débit → throttling
- Ne pas logger les envois → impossible de debugger
- Utiliser des adresses "from" non-vérifiées dans Resend
- Oublier de gérer les bounces

---

## 8. Action Cache (@convex-dev/action-cache)

Cacher les résultats d'appels API externes pour éviter les appels répétés.

### Installation

```bash
npm install @convex-dev/action-cache
```

### Patterns clés

#### Cacher une réponse API

```typescript
// convex/functions/external/fetchWeather.ts
import { actionCache } from "@convex-dev/action-cache";

export const fetchWeather = authAction({
  args: { city: v.string() },
  handler: async (ctx, { city }) => {
    // Clé de cache unique par ville
    const cacheKey = `weather-${city.toLowerCase()}`;

    // Vérifier le cache
    const cached = await actionCache.get(ctx, cacheKey);
    if (cached) {
      console.log("Cache hit for", city);
      return cached;
    }

    // Appeler l'API externe
    const response = await fetch(`https://api.openweathermap.org/data/2.5/weather?q=${city}`);
    const weather = await response.json();

    if (!weather) {
      throw new Error("Weather API failed");
    }

    // Cacher pour 1 heure
    await actionCache.set(ctx, cacheKey, weather, {
      ttlSeconds: 60 * 60
    });

    return weather;
  }
});
```

#### Cacher avec invalidation

```typescript
// convex/functions/external/fetchUserGitHubProfile.ts
export const fetchGitHubProfile = authAction({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const cacheKey = `github-${username}`;

    const cached = await actionCache.get(ctx, cacheKey);
    if (cached) return cached;

    const response = await fetch(`https://api.github.com/users/${username}`);
    const profile = await response.json();

    // Cacher pendant 24h
    await actionCache.set(ctx, cacheKey, profile, {
      ttlSeconds: 24 * 60 * 60
    });

    return profile;
  }
});

// Invalider le cache quand nécessaire
export const invalidateGitHubCache = internalAction({
  args: { username: v.string() },
  handler: async (ctx, { username }) => {
    const cacheKey = `github-${username}`;
    await actionCache.invalidate(ctx, cacheKey);
    return { invalidated: true };
  }
});
```

#### Cacher avec conditional refresh

```typescript
// convex/functions/external/fetchExchangeRates.ts
export const fetchExchangeRates = action({
  args: { baseCurrency: v.string() },
  handler: async (ctx, { baseCurrency }) => {
    const cacheKey = `rates-${baseCurrency}`;

    const cached = await actionCache.get(ctx, cacheKey);

    // Si le cache est récent (moins de 1h), l'utiliser
    if (cached && cached.timestamp > Date.now() - 60 * 60 * 1000) {
      return cached.data;
    }

    // Sinon, faire un nouvel appel
    const response = await fetch(
      `https://api.exchangerate-api.com/v4/latest/${baseCurrency}`
    );
    const rates = await response.json();

    // Cacher avec timestamp
    await actionCache.set(ctx, cacheKey, {
      data: rates,
      timestamp: Date.now()
    }, {
      ttlSeconds: 24 * 60 * 60
    });

    return rates;
  }
});
```

### Pièges courants

- Cacher des données sensibles → fuite de données
- TTL trop court → peu de bénéfice
- TTL trop long → données obsolètes
- Ne pas inclure les paramètres critiques dans la clé de cache

---

## 9. Action Retrier (@convex-dev/action-retrier)

Retry automatique avec backoff pour les actions non-déterministes.

### Installation

```bash
npm install @convex-dev/action-retrier
```

### Patterns clés

#### Retry simple

```typescript
// convex/functions/external/callExternalAPI.ts
import { withRetries } from "@convex-dev/action-retrier";

export const callExternalAPI = action({
  args: { endpoint: v.string(), data: v.any() },
  handler: async (ctx, { endpoint, data }) => {
    return await withRetries(
      async () => {
        const response = await fetch(endpoint, {
          method: "POST",
          body: JSON.stringify(data),
          headers: { "Content-Type": "application/json" }
        });

        if (!response.ok) {
          throw new Error(`API error: ${response.status}`);
        }

        return await response.json();
      },
      {
        maxRetries: 3,
        baseDelayMs: 1000, // 1 seconde
        exponentialBase: 2 // Backoff exponentiel
      }
    );
  }
});
```

#### Retry avec custom logic

```typescript
// convex/functions/external/smartRetry.ts
export const smartRetry = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    let lastError;
    let attempt = 0;
    const maxAttempts = 5;

    while (attempt < maxAttempts) {
      try {
        const response = await fetch(url, { timeout: 5000 });

        if (response.ok) {
          return await response.json();
        }

        // Ne pas retry sur 4xx errors
        if (response.status >= 400 && response.status < 500) {
          throw new Error(`Client error: ${response.status}`);
        }

        // Retry sur 5xx
        throw new Error(`Server error: ${response.status}`);
      } catch (error) {
        lastError = error;
        attempt++;

        if (attempt < maxAttempts) {
          // Backoff exponentiel avec jitter
          const delay = Math.pow(2, attempt) * 1000 + Math.random() * 1000;
          await new Promise(resolve => setTimeout(resolve, delay));
        }
      }
    }

    throw lastError;
  }
});
```

#### Retry avec circuit breaker

```typescript
// convex/lib/circuitBreaker.ts
export class CircuitBreaker {
  private failures = 0;
  private lastFailureTime = 0;
  private state: "closed" | "open" | "half-open" = "closed";

  constructor(
    private failureThreshold = 5,
    private resetTimeoutMs = 60000 // 1 minute
  ) {}

  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (this.state === "open") {
      // Vérifier si on peut passer en half-open
      if (Date.now() - this.lastFailureTime > this.resetTimeoutMs) {
        this.state = "half-open";
      } else {
        throw new Error("Circuit breaker is OPEN");
      }
    }

    try {
      const result = await fn();

      // Succès — réinitialiser
      if (this.state === "half-open") {
        this.state = "closed";
      }
      this.failures = 0;
      return result;
    } catch (error) {
      this.failures++;
      this.lastFailureTime = Date.now();

      if (this.failures >= this.failureThreshold) {
        this.state = "open";
      }

      throw error;
    }
  }
}

// Utilisation
const apiBreaker = new CircuitBreaker(5, 60000);

export const safeApiCall = action({
  args: { url: v.string() },
  handler: async (ctx, { url }) => {
    return await apiBreaker.execute(async () => {
      const response = await fetch(url);
      return await response.json();
    });
  }
});
```

### Pièges courants

- Retry sur des erreurs non-transients (4xx)
- Pas de circuit breaker → appels en cascade
- Oublier le jitter dans le backoff → thundering herd
- Retry infini sans timeout

---

## 10. Presence (@convex-dev/presence)

Tracker la présence d'utilisateurs en temps réel pour les collaborations.

### Installation

```bash
npm install @convex-dev/presence
```

### Patterns clés

#### Initialiser la présence

```typescript
// convex/functions/presence/initializePresence.ts
import { Presence } from "@convex-dev/presence";

const presence = new Presence();

export const initializeUserPresence = authMutation({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    // Enregistrer l'utilisateur comme présent
    const presenceId = await presence.addPresence(ctx, {
      userId: ctx.userId,
      documentId,
      sessionId: generateSessionId(),
      color: generateUserColor(), // Pour les curseurs
      timestamp: new Date()
    });

    return { presenceId };
  }
});

// Fonction helper pour générer une couleur unique
function generateUserColor() {
  const colors = ["#FF6B6B", "#4ECDC4", "#45B7D1", "#FFA07A", "#98D8C8"];
  return colors[Math.floor(Math.random() * colors.length)];
}

function generateSessionId() {
  return `session-${Date.now()}-${Math.random()}`;
}
```

#### Tracker les utilisateurs actifs

```typescript
// convex/functions/presence/getActiveUsers.ts
export const getActiveUsers = query({
  args: { documentId: v.id("documents") },
  handler: async (ctx, { documentId }) => {
    // Récupérer tous les utilisateurs actuellement présents
    const activeUsers = await presence.getPresence(ctx, {
      documentId,
      // Marquer comme inactifs après 5 minutes
      inactiveAfterMs: 5 * 60 * 1000
    });

    return activeUsers.map(p => ({
      userId: p.userId,
      color: p.color,
      sessionId: p.sessionId,
      lastSeen: p.timestamp
    }));
  }
});
```

#### Cleaner la présence (heartbeat)

```typescript
// convex/functions/presence/updatePresenceHeartbeat.ts
export const updatePresenceHeartbeat = authMutation({
  args: { documentId: v.id("documents"), presenceId: v.string() },
  handler: async (ctx, { documentId, presenceId }) => {
    // Mettre à jour le timestamp pour marquer comme actif
    await presence.updatePresence(ctx, presenceId, {
      timestamp: new Date()
    });

    return { updated: true };
  }
});

// Utilisation côté client
export function usePresenceHeartbeat(documentId, presenceId) {
  useEffect(() => {
    // Envoyer un heartbeat toutes les 30 secondes
    const interval = setInterval(() => {
      updatePresenceHeartbeat({
        documentId,
        presenceId
      });
    }, 30000);

    return () => clearInterval(interval);
  }, [documentId, presenceId]);
}
```

#### Cleanup à la déconnexion

```typescript
// convex/functions/presence/removePresence.ts
export const removeUserPresence = authMutation({
  args: { presenceId: v.string() },
  handler: async (ctx, { presenceId }) => {
    await presence.removePresence(ctx, presenceId);
    return { removed: true };
  }
});

// Côté client
export function usePresenceCleanup(presenceId) {
  useEffect(() => {
    return () => {
      // Nettoyer à la déconnexion
      removeUserPresence({ presenceId });
    };
  }, [presenceId]);
}
```

#### Afficher les curseurs en temps réel

```typescript
// convex/functions/presence/updateCursorPosition.ts
export const updateCursorPosition = authMutation({
  args: {
    documentId: v.id("documents"),
    presenceId: v.string(),
    x: v.number(),
    y: v.number()
  },
  handler: async (ctx, { documentId, presenceId, x, y }) => {
    await presence.updatePresence(ctx, presenceId, {
      cursor: { x, y },
      timestamp: new Date()
    });

    return { updated: true };
  }
});

// Composant React pour afficher les curseurs
export function ActiveUsersCursors({ documentId, activeUsers }) {
  return (
    <div className="relative">
      {activeUsers.map(user => (
        <div
          key={user.sessionId}
          className="absolute pointer-events-none"
          style={{
            left: `${user.cursor?.x || 0}px`,
            top: `${user.cursor?.y || 0}px`,
            color: user.color
          }}
        >
          <div className="text-xs font-semibold">{user.userId}</div>
          <div
            className="w-4 h-4 rounded-full"
            style={{ backgroundColor: user.color }}
          />
        </div>
      ))}
    </div>
  );
}
```

### Pièges courants

- Ne pas nettoyer la présence → données fantômes
- Pas de heartbeat → utilisateurs fantômes
- Timeout trop court → présence inconsistante
- Oublier les permissions → voir la présence d'autres users

---

## 11. ProseMirror Sync (@convex-dev/prosemirror-sync)

Synchronisation collaborative d'éditeurs de texte enrichi avec ProseMirror.

### Installation

```bash
npm install @convex-dev/prosemirror-sync prosemirror-state prosemirror-view prosemirror-model
```

### Patterns clés

#### Initialiser le sync

```typescript
// convex/functions/editor/initializeDocument.ts
import { ProseMirrorSync } from "@convex-dev/prosemirror-sync";

const pmSync = new ProseMirrorSync();

export const initializeDocument = authMutation({
  args: {
    title: v.string(),
    content: v.string()
  },
  handler: async (ctx, { title, content }) => {
    // Créer un document collaboratif
    const docId = await ctx.db.insert("documents", {
      title,
      ownerId: ctx.userId,
      content, // État initial
      syncVersion: 0,
      createdAt: new Date(),
      updatedAt: new Date()
    });

    // Initialiser le sync pour ce document
    await pmSync.initialize(ctx, docId, {
      initialContent: content,
      schema: defaultProseMirrorSchema
    });

    return { documentId: docId };
  }
});

// Schema ProseMirror par défaut
import { Schema } from "prosemirror-model";

export const defaultProseMirrorSchema = new Schema({
  nodes: {
    doc: {
      content: "block+"
    },
    paragraph: {
      content: "inline*",
      group: "block",
      parseDOM: [{ tag: "p" }],
      toDOM() { return ["p", 0]; }
    },
    blockquote: {
      content: "block+",
      group: "block",
      parseDOM: [{ tag: "blockquote" }],
      toDOM() { return ["blockquote", 0]; }
    },
    text: {
      inline: true
    }
  },
  marks: {
    em: {
      parseDOM: [{ tag: "em" }],
      toDOM() { return ["em", 0]; }
    },
    strong: {
      parseDOM: [{ tag: "strong" }],
      toDOM() { return ["strong", 0]; }
    }
  }
});
```

#### Envoyer les changements (steps ProseMirror)

```typescript
// convex/functions/editor/applyEdits.ts
export const applyEdits = authMutation({
  args: {
    documentId: v.id("documents"),
    steps: v.array(v.any()), // JSON steps de ProseMirror
    version: v.number()
  },
  handler: async (ctx, { documentId, steps, version }) => {
    const document = await ctx.db.get(documentId);
    if (!document) throw new Error("Document not found");

    // Vérifier les permissions
    if (document.ownerId !== ctx.userId) {
      throw new Error("Not authorized");
    }

    // Appliquer les steps
    const result = await pmSync.applySteps(ctx, documentId, {
      steps,
      version,
      userId: ctx.userId
    });

    // Sauvegarder la nouvelle version
    await ctx.db.patch(documentId, {
      content: result.newContent,
      syncVersion: result.newVersion,
      updatedAt: new Date()
    });

    return {
      success: true,
      newVersion: result.newVersion,
      conflicts: result.conflicts
    };
  }
});
```

#### Récupérer les changements (pull-based sync)

```typescript
// convex/functions/editor/getUpdates.ts
export const getUpdates = authQuery({
  args: {
    documentId: v.id("documents"),
    since: v.number() // Depuis quelle version
  },
  handler: async (ctx, { documentId, since }) => {
    // Récupérer les steps depuis une certaine version
    const updates = await pmSync.getUpdates(ctx, documentId, since);

    return {
      steps: updates.steps,
      newVersion: updates.version,
      timestamp: new Date()
    };
  }
});
```

#### Gérer les conflits et résolutions

```typescript
// convex/functions/editor/handleConflict.ts
export const resolveConflict = authMutation({
  args: {
    documentId: v.id("documents"),
    conflictId: v.string(),
    resolution: v.string() // "ours", "theirs", "manual"
  },
  handler: async (ctx, { documentId, conflictId, resolution }) => {
    if (resolution === "manual") {
      // L'utilisateur va manuellement résoudre dans l'éditeur
      await ctx.db.insert("conflicts", {
        documentId,
        conflictId,
        status: "pending_manual_resolution",
        resolvedBy: ctx.userId,
        resolvedAt: new Date()
      });

      return { status: "awaiting_manual_resolution" };
    }

    // Auto-résoudre
    const resolved = await pmSync.resolveConflict(ctx, documentId, {
      conflictId,
      strategy: resolution
    });

    return { status: "resolved", result: resolved };
  }
});
```

#### Composant React avec sync

```typescript
// components/CollaborativeEditor.tsx
import { useEffect, useState } from "react";
import { useQuery, useMutation } from "convex/react";
import { EditorView } from "prosemirror-view";
import { EditorState } from "prosemirror-state";

export function CollaborativeEditor({ documentId }) {
  const [editorView, setEditorView] = useState(null);
  const applyEdits = useMutation(api.editor.applyEdits);
  const getUpdates = useQuery(api.editor.getUpdates, {
    documentId,
    since: 0
  });

  useEffect(() => {
    if (!editorView || !getUpdates) return;

    // Appliquer les changements distants
    getUpdates.steps.forEach(step => {
      const transaction = editorView.state.tr;
      transaction.step(step);
      editorView.dispatch(transaction);
    });
  }, [getUpdates, editorView]);

  const handleChange = (view) => {
    // Détecter les steps (changements)
    const newTr = view.state.tr;
    const steps = newTr.steps;

    if (steps.length > 0) {
      applyEdits({
        documentId,
        steps: steps.map(s => s.toJSON()),
        version: getUpdates?.newVersion || 0
      });
    }
  };

  return (
    <div
      ref={el => {
        if (el && !editorView) {
          const state = EditorState.create({
            doc: EditorState.fromJSON(defaultProseMirrorSchema, getUpdates?.content),
            plugins: []
          });
          const view = new EditorView(el, {
            state,
            dispatchTransaction: handleChange
          });
          setEditorView(view);
        }
      }}
    />
  );
}
```

### Pièges courants

- Ne pas vérifier les permissions → données exposées
- Oublier le versioning → chaos de sync
- Appliquer les steps dans le désordre → corruptions
- Ne pas gérer les conflits → data loss

---

## Résumé des Patterns Critiques

| Composant | Use Case | Pièges clés |
|-----------|----------|------------|
| **Rate Limiter** | Protéger contre les abus | Token bucket pour concurrence haute |
| **Workflow** | Orchestration durable | Déterminisme requis, steps critiques |
| **Workpool** | Queuing avec limite | Choisir le bon nombre de shards |
| **Aggregate** | Compteurs haute-concurrence | Sharding esssentiel |
| **Migrations** | Migrations data sûres | Batching + checkpoints |
| **Stripe** | Paiements/souscriptions | Vérifier signatures, webhook handling |
| **Resend** | Emails transactionnels | Respecter les limites de débit |
| **Action Cache** | Cacher APIs externes | TTL approprié, pas de données sensibles |
| **Action Retrier** | Retries avec backoff | Circuit breaker pour haute concurrence |
| **Presence** | Utilisateurs actifs en temps réel | Heartbeat + cleanup |
| **ProseMirror** | Édition collaborative | Versioning + résolution conflits |

---

## Intégration Multi-Composants

Exemple : Document collaboratif avec paiement et notifications.

```typescript
// convex/workflows/collaborativeDocumentWorkflow.ts
import { workflow, step } from "@convex-dev/workflow";
import { pmSync } from "@/lib/pmSync";
import { stripe } from "@/lib/stripe";

export const documentCollaborationWorkflow = workflow(
  async (ctx, documentId, userId) => {
    // Vérifier la souscription (Stripe)
    const subscription = await step(ctx, "checkSubscription", async () => {
      const user = await ctx.db.get(userId);
      return await stripe.subscriptions.retrieve(user.subscriptionId);
    });

    if (subscription.status !== "active") {
      throw new Error("Subscription required");
    }

    // Initialiser la présence
    const presence = await step(ctx, "initPresence", async () => {
      return await pmSync.initializePresence(ctx, documentId, userId);
    });

    // Attendre les éditions
    const edits = await step(ctx, "waitForEdits", async () => {
      return await ctx.waitForEvent("documentEdited", documentId, {
        timeoutMs: 24 * 60 * 60 * 1000
      });
    });

    // Sauvegarder si édités
    if (edits) {
      await step(ctx, "saveDocument", async () => {
        return await pmSync.applySteps(ctx, documentId, {
          steps: edits.steps,
          version: edits.version,
          userId
        });
      });
    }

    // Nettoyer la présence
    await step(ctx, "removePresence", async () => {
      await pmSync.removePresence(ctx, presence.id);
    });
  }
);
```

---

## Ressources et Documentation Officielle

- [Convex Components](https://convex.dev/components)
- [Rate Limiter Docs](https://convex.dev/components/ratelimiter)
- [Workflow Docs](https://convex.dev/components/workflow)
- [Stripe Integration](https://convex.dev/components/stripe)
- [ProseMirror Sync](https://convex.dev/components/prosemirror-sync)

---

Dernière mise à jour : 2026-03-29
Maintenu par : OkaTech Team
