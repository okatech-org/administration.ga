---
name: prisma-database
description: "🗄️ Expert Prisma ORM & Database. S'active automatiquement pour les projets utilisant Prisma (evenement.ga). Couvre le schema Prisma, les migrations, le seeding, et les patterns de requêtes avancées."
---

# 🗄️ Skill : Prisma ORM & Database Expert

## Auto-Activation
Ce skill s'active quand :
- Le fichier ouvert est dans un dossier `prisma/` ou importe `@prisma/client`
- La requête mentionne : prisma, migration, seed, modèle, relation, base de données SQL
- Projets concernés : `evenement.ga`

## Schema Prisma Standard
```prisma
// prisma/schema.prisma
generator client {
  provider = "prisma-client-js"
}

datasource db {
  provider = "postgresql"
  url      = env("DATABASE_URL")
}

model User {
  id            String    @id @default(uuid())
  email         String    @unique
  name          String
  role          Role      @default(USER)
  events        Event[]   @relation("organizer")
  tickets       Ticket[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@map("users")
}

model Event {
  id            String    @id @default(uuid())
  title         String
  slug          String    @unique
  description   String?
  startDate     DateTime
  endDate       DateTime
  location      String?
  status        EventStatus @default(DRAFT)
  organizerId   String
  organizer     User      @relation("organizer", fields: [organizerId], references: [id])
  tickets       Ticket[]
  createdAt     DateTime  @default(now())
  updatedAt     DateTime  @updatedAt

  @@index([organizerId])
  @@index([status])
  @@map("events")
}

enum Role {
  USER
  ADMIN
  ORGANIZER
  SUPER_ADMIN
}

enum EventStatus {
  DRAFT
  PUBLISHED
  CANCELLED
  COMPLETED
}
```

## Commandes de Migration
```bash
# Créer une migration
npx prisma migrate dev --name add_events_table

# Appliquer en production
npx prisma migrate deploy

# Réinitialiser la DB (développement seulement)
npx prisma migrate reset

# Générer le client Prisma
npx prisma generate

# Ouvrir Prisma Studio
npx prisma studio

# Seed la base
npx tsx prisma/seed.ts
```

## Patterns de Requêtes
```ts
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

// ✅ Requête avec relations
const events = await prisma.event.findMany({
  where: { status: "PUBLISHED" },
  include: {
    organizer: { select: { name: true, email: true } },
    tickets: { where: { status: "AVAILABLE" } },
  },
  orderBy: { startDate: "asc" },
  take: 20,
  skip: 0,
});

// ✅ Transaction
const [event, ticket] = await prisma.$transaction([
  prisma.event.update({ where: { id: eventId }, data: { /* ... */ } }),
  prisma.ticket.create({ data: { /* ... */ } }),
]);

// ✅ Upsert
const user = await prisma.user.upsert({
  where: { email: "user@example.com" },
  update: { name: "Updated Name" },
  create: { email: "user@example.com", name: "New User" },
});
```

## Anti-Patterns
- ❌ Ne JAMAIS instancier PrismaClient dans le scope d'une fonction — utiliser un singleton
- ❌ Ne JAMAIS oublier `@@map()` pour les noms de tables
- ❌ Ne JAMAIS faire de N+1 queries — utiliser `include` ou `select`
- ❌ Ne JAMAIS modifier la DB en production avec `migrate dev` — utiliser `migrate deploy`
