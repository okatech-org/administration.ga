# Welcome to your Convex functions directory!

Write your Convex functions here.
See https://docs.convex.dev/functions for more.
Also https://docs.convex.dev/api/modules/server

A query function that takes two arguments looks like:

```ts
import { query } from "./_generated/server";
import { v } from "convex/values";

export const myQueryFunction = query({
  args: {
    first: v.number(),
    second: v.string(),
  },

  handler: async (ctx, args) => {
    const documents = await ctx.db.query("tablename").collect();

    console.log(args.first, args.second);

    return documents;
  },
});
```

Using this query function in a React component looks like:

```ts
//  NOT PREFERRED: Direct useQuery from convex/react
const data = useQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});

//  PREFERRED: Use custom hooks from @/integrations/convex/hooks
const { data, isPending } = useConvexQuery(api.myFunctions.myQueryFunction, {
  first: 10,
  second: "hello",
});
```

A mutation function looks like:

```ts
import { mutation } from "./_generated/server";
import { v } from "convex/values";

export const myMutationFunction = mutation({
  args: {
    first: v.string(),
    second: v.string(),
  },

  handler: async (ctx, args) => {
    const message = { body: args.first, author: args.second };
    const id = await ctx.db.insert("messages", message);

    return await ctx.db.get("messages", id);
  },
});
```

Using this mutation function in a React component looks like:

```ts
const mutation = useMutation(api.myFunctions.myMutationFunction);
function handleButtonPress() {
  mutation({ first: "Hello!", second: "me" });

  mutation({ first: "Hello!", second: "me" }).then((result) =>
    console.log(result),
  );
}
```

Use the Convex CLI to push your functions to a deployment. See everything
the Convex CLI can do by running `npx convex -h` in your project root
directory. To learn more, launch the docs with `npx convex docs`.

---

## Frontend Hooks Guide

This project uses **TanStack Query** with Convex for better loading/error states.

### Which Hook to Use?

| Use Case                        | Hook                          | Import From                   |
| ------------------------------- | ----------------------------- | ----------------------------- |
| Query with loading/error states | `useConvexQuery`              | `@/integrations/convex/hooks` |
| Query requiring auth            | `useAuthenticatedConvexQuery` | `@/integrations/convex/hooks` |
| Mutation with status            | `useConvexMutationQuery`      | `@/integrations/convex/hooks` |
| Simple query (no loading state) | `useQuery`                    | `convex/react`                |
| Simple mutation                 | `useMutation`                 | `convex/react`                |

### Queries with Loading/Error States

```ts
import { useConvexQuery } from "@/integrations/convex/hooks";
import { api } from "@convex/_generated/api";

function MyComponent() {
  const { data, isPending, error, isError } = useConvexQuery(
    api.messages.list,
    { channelId: "123" }
  );

  if (isPending) return <Spinner />;
  if (isError) return <Error message={error.message} />;
  return <MessageList messages={data} />;
}
```

### Authenticated Queries

Use when the query requires a logged-in user. Automatically skips when not authenticated:

```ts
import { useAuthenticatedConvexQuery } from "@/integrations/convex/hooks";

function UserProfile() {
  const { data: user, isPending } = useAuthenticatedConvexQuery(
    api.users.getCurrent,
    {}
  );

  if (isPending) return <Spinner />;
  if (!user) return <SignInPrompt />;
  return <Profile user={user} />;
}
```

### Mutations

```ts
import { useConvexMutationQuery } from "@/integrations/convex/hooks";

function SendButton() {
  const { mutate, isPending, error } = useConvexMutationQuery(api.messages.send);

  return (
    <button
      onClick={() => mutate({ content: "Hello!" })}
      disabled={isPending}
    >
      {isPending ? "Sending..." : "Send"}
    </button>
  );
}
```

---

## Backend Auth Functions

For protected backend functions, use the auth wrappers in `convex/lib/customFunctions.ts`:

| Instead of | Use            | Effect                      |
| ---------- | -------------- | --------------------------- |
| `query`    | `authQuery`    | Throws if not authenticated |
| `mutation` | `authMutation` | Throws if not authenticated |
| `action`   | `authAction`   | Throws if not authenticated |

```ts
import { authQuery } from "./lib/customFunctions";

export const getMyData = authQuery({
  args: {},
  handler: async (ctx) => {

    const userId = ctx.auth.getUserId();
    return await ctx.db.query("userData").filter(...).first();
  },
});
```

---

##  Resources

### Official Documentation

- [Functions](https://docs.convex.dev/functions) - Core functions documentation
- [Server API](https://docs.convex.dev/api/modules/server) - Server module reference
- [Indexes](https://docs.convex.dev/database/reading-data/indexes) - Database indexes
- [Indexes & Query Performance](https://docs.convex.dev/database/reading-data/indexes/indexes-and-query-perf#indexing-multiple-fields) - Indexing multiple fields
- [IndexTiebreakerField](https://docs.convex.dev/api/modules/server#indextiebreakerfield) - System fields & `_creationTime`
- [Cron Jobs](https://docs.convex.dev/scheduling/cron-jobs) - Scheduled functions
- [Log Streams - Audit Events](https://docs.convex.dev/production/integrations/log-streams#audit_log-events) - Audit logging

### Best Practices

- [Best Practices](https://docs.convex.dev/understanding/best-practices/) - Official best practices
- [Check for Redundant Indexes](https://docs.convex.dev/understanding/best-practices/#check-for-redundant-indexes)
- [Access Control for All Public Functions](https://docs.convex.dev/understanding/best-practices/#use-some-form-of-access-control-for-all-public-functions)
- [How to Implement Access Control](https://docs.convex.dev/understanding/best-practices/#how-5)

### Stack Articles

- [Queries That Scale](https://stack.convex.dev/queries-that-scale#1-fetching-exactly-what-you-need-with-indexes) - Fetching with indexes
- [Observability in Production](https://stack.convex.dev/observability-in-production#persist-important-events-to-tables) - Persist events to tables
- [Authentication Best Practices (Clerk + Next.js)](https://stack.convex.dev/authentication-best-practices-convex-clerk-and-nextjs#securing-your-convex-backend)
- [Authorization - Membership Checks](https://stack.convex.dev/authorization#membership-checks)
- [Authorization - Role Based Access Control](https://stack.convex.dev/authorization#role-based-access-control)
- [Database Triggers](https://stack.convex.dev/triggers) - Triggers overview
- [Use-Cases of Triggers](https://stack.convex.dev/triggers#use-cases-of-triggers) - Logging, denormalization
- [Convex Ents - Soft Deletion](https://stack.convex.dev/ents#cascading-deletes-soft-deletion-and-scheduled-deletion) - Cascading & scheduled deletion

### Components

- [Aggregate Component](https://www.convex.dev/components/aggregate#operations) - Aggregate operations

### Community Discussions

- [Discord: Normalization Best Practices](https://discord.com/channels/1019350475847499849/1365352951542972551)
- [Discord: Soft Deletion Best Practices](https://discord.com/channels/1019350475847499849/1395518376851538120)
