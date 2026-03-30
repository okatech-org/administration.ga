---
name: convex-agent
description: Expert en agents IA avec Convex — threads persistants, tool calling, streaming, RAG, et workflows multi-agents
activation: Mots-cles — agent, AI, chat, LLM, thread, streaming, tool calling, RAG, vector search, @convex-dev/agent
projects: digitalium.io, consulat.ga, gabon-diplomatie
---

# Convex AI Agents

Building intelligent, persistent AI agents with Convex using `@convex-dev/agent`. This skill covers thread management, tool calling, streaming, RAG patterns, and multi-agent workflows.

## 1. Thread Management

### Creating and Persisting Conversation Threads

Store threads as Convex documents to maintain conversation history across sessions.

```typescript
// convex/schema.ts
import { defineSchema, defineTable } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  threads: defineTable({
    userId: v.id("users"),
    title: v.string(),
    createdAt: v.number(),
    updatedAt: v.number(),
    metadata: v.optional(v.object({
      model: v.string(),
      temperature: v.number(),
      systemPrompt: v.string(),
    })),
  })
    .index("by_user", ["userId"])
    .index("by_created", ["createdAt"]),

  messages: defineTable({
    threadId: v.id("threads"),
    role: v.union(v.literal("user"), v.literal("assistant"), v.literal("system")),
    content: v.string(),
    toolCalls: v.optional(v.array(v.object({
      id: v.string(),
      function: v.object({
        name: v.string(),
        arguments: v.string(),
      }),
    }))),
    toolResults: v.optional(v.array(v.object({
      toolUseId: v.string(),
      content: v.string(),
    }))),
    tokens: v.optional(v.object({
      input: v.number(),
      output: v.number(),
    })),
    createdAt: v.number(),
  })
    .index("by_thread", ["threadId"]),
});
```

### Creating New Threads

```typescript
// convex/threads.ts
import { mutation, query } from "./_generated/server";
import { v } from "convex/values";

export const createThread = mutation({
  args: {
    userId: v.id("users"),
    title: v.optional(v.string()),
    systemPrompt: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Créer un nouveau thread de conversation persistant
    const threadId = await ctx.db.insert("threads", {
      userId: args.userId,
      title: args.title || `Conversation ${new Date().toLocaleDateString()}`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: args.systemPrompt ? {
        model: "gpt-4-turbo",
        temperature: 0.7,
        systemPrompt: args.systemPrompt,
      } : undefined,
    });
    return threadId;
  },
});

export const getThread = query({
  args: { threadId: v.id("threads") },
  handler: async (ctx, args) => {
    // Récupérer le thread avec son historique complet
    const thread = await ctx.db.get(args.threadId);
    if (!thread) return null;

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    return { thread, messages };
  },
});

export const listUserThreads = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Lister les threads d'un utilisateur avec pagination
    const threads = await ctx.db
      .query("threads")
      .withIndex("by_user", (q) => q.eq("userId", args.userId))
      .order("desc")
      .take(20);

    return threads;
  },
});

export const forkThread = mutation({
  args: {
    sourceThreadId: v.id("threads"),
    userId: v.id("users"),
    messageId: v.optional(v.id("messages")),
  },
  handler: async (ctx, args) => {
    // Créer une branche d'un thread existant à un point donné
    const source = await ctx.db.get(args.sourceThreadId);
    if (!source) throw new Error("Source thread not found");

    const newThreadId = await ctx.db.insert("threads", {
      userId: args.userId,
      title: `${source.title} (fork)`,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      metadata: source.metadata,
    });

    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.sourceThreadId))
      .order("asc")
      .collect();

    // Copier les messages jusqu'au point de fork
    for (const msg of messages) {
      if (args.messageId && msg._id === args.messageId) break;
      await ctx.db.insert("messages", {
        ...msg,
        threadId: newThreadId,
      });
    }

    return newThreadId;
  },
});
```

## 2. Streaming Responses

### Real-time Text Streaming with Persistent Storage

```typescript
// convex/agent.ts
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

export const streamMessage = action({
  args: {
    threadId: v.id("threads"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Récupérer le thread et l'historique
    const thread = await ctx.runQuery(async (qctx) => {
      return await qctx.db.get(args.threadId);
    });

    if (!thread) throw new Error("Thread not found");

    // Sauvegarder le message utilisateur
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "user",
        content: args.userMessage,
        createdAt: Date.now(),
      });
    });

    // Récupérer l'historique complet
    const messages = await ctx.runQuery(async (qctx) => {
      return await qctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("asc")
        .collect();
    });

    // Streaming avec Anthropic
    const systemPrompt = thread.metadata?.systemPrompt ||
      "You are a helpful AI assistant.";

    const response = await client.messages.create({
      model: thread.metadata?.model || "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
      stream: true,
    });

    // Collecter le streaming et sauvegarder
    let fullContent = "";
    let inputTokens = 0;
    let outputTokens = 0;

    for await (const event of response) {
      if (event.type === "content_block_delta") {
        const delta = event.delta as any;
        if (delta.type === "text_delta") {
          fullContent += delta.text;
          // Transmettre le chunk en streaming au client
          yield { type: "text", content: delta.text };
        }
      }
      if (event.type === "message_start") {
        inputTokens = event.message.usage?.input_tokens || 0;
      }
      if (event.type === "message_delta") {
        outputTokens = event.usage?.output_tokens || 0;
      }
    }

    // Sauvegarder la réponse complète
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "assistant",
        content: fullContent,
        tokens: {
          input: inputTokens,
          output: outputTokens,
        },
        createdAt: Date.now(),
      });
    });

    yield { type: "done" };
  },
});
```

### Client-side streaming handler

```typescript
// src/hooks/useAgentStream.ts
import { useState, useCallback } from "react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function useAgentStream() {
  const [isStreaming, setIsStreaming] = useState(false);
  const [streamContent, setStreamContent] = useState("");
  const streamMessage = useMutation(api.agent.streamMessage);

  const sendMessage = useCallback(
    async (threadId: string, userMessage: string) => {
      setIsStreaming(true);
      setStreamContent("");

      try {
        const response = await streamMessage({
          threadId,
          userMessage,
        });

        // Consommer le streaming en tant que lecture simple
        // (À adapter selon l'implémentation Convex de votre streaming)
        for await (const chunk of response) {
          if (chunk.type === "text") {
            setStreamContent((prev) => prev + chunk.content);
          }
        }
      } catch (error) {
        console.error("Streaming error:", error);
      } finally {
        setIsStreaming(false);
      }
    },
    [streamMessage]
  );

  return { sendMessage, isStreaming, streamContent };
}
```

## 3. Tool Calling

### Defining Agent Tools with Convex Context

```typescript
// convex/tools.ts
import { action, internalMutation } from "./_generated/server";
import { v } from "convex/values";

// Définir les outils disponibles pour l'agent
export const AGENT_TOOLS = [
  {
    name: "search_documents",
    description: "Search through document database",
    input_schema: {
      type: "object",
      properties: {
        query: {
          type: "string",
          description: "Search query",
        },
        limit: {
          type: "number",
          description: "Max results",
        },
      },
      required: ["query"],
    },
  },
  {
    name: "create_task",
    description: "Create a new task for the user",
    input_schema: {
      type: "object",
      properties: {
        title: { type: "string" },
        description: { type: "string" },
        priority: {
          type: "string",
          enum: ["low", "medium", "high"],
        },
      },
      required: ["title"],
    },
  },
  {
    name: "fetch_user_context",
    description: "Get current user information and settings",
    input_schema: {
      type: "object",
      properties: {},
    },
  },
];

// Exécuteur d'outils
export const executeTool = action({
  args: {
    toolName: v.string(),
    toolInput: v.any(),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Dépêcher selon l'outil demandé
    switch (args.toolName) {
      case "search_documents":
        return await searchDocuments(ctx, args.userId, args.toolInput);
      case "create_task":
        return await createTask(ctx, args.userId, args.toolInput);
      case "fetch_user_context":
        return await fetchUserContext(ctx, args.userId);
      default:
        throw new Error(`Unknown tool: ${args.toolName}`);
    }
  },
});

async function searchDocuments(ctx: any, userId: string, input: any) {
  // Implémentation de la recherche dans la base de documents
  const results = await ctx.runQuery(async (qctx) => {
    // Exemple : rechercher dans les documents de l'utilisateur
    return await qctx.db
      .query("documents")
      .withIndex("by_user", (q) => q.eq("userId", userId))
      .collect();
  });

  return {
    success: true,
    results: results
      .filter((doc) =>
        doc.title.toLowerCase().includes(input.query.toLowerCase())
      )
      .slice(0, input.limit || 5),
  };
}

async function createTask(ctx: any, userId: string, input: any) {
  // Créer une tâche via mutation
  const taskId = await ctx.runMutation(async (mctx) => {
    return await mctx.db.insert("tasks", {
      userId,
      title: input.title,
      description: input.description || "",
      priority: input.priority || "medium",
      status: "pending",
      createdAt: Date.now(),
    });
  });

  return {
    success: true,
    taskId,
    message: `Task "${input.title}" created successfully`,
  };
}

async function fetchUserContext(ctx: any, userId: string) {
  // Récupérer le contexte utilisateur
  const user = await ctx.runQuery(async (qctx) => {
    return await qctx.db.get(userId);
  });

  return {
    userId,
    email: user.email,
    name: user.name,
    preferences: user.preferences || {},
  };
}
```

### Multi-step Tool Execution

```typescript
// convex/agentWithTools.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";
import { AGENT_TOOLS, executeTool } from "./tools";

const client = new Anthropic();

export const streamMessageWithTools = action({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Sauvegarder le message utilisateur
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "user",
        content: args.userMessage,
        createdAt: Date.now(),
      });
    });

    // Récupérer l'historique
    const messages = await ctx.runQuery(async (qctx) => {
      return await qctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("asc")
        .collect();
    });

    // Boucle agentic avec tool calling
    let assistantMessage = "";
    let toolCalls: any[] = [];
    let toolResults: any[] = [];
    let stopReason = "end_turn";

    do {
      // Appeler l'API avec les outils disponibles
      const response = await client.messages.create({
        model: "claude-3-5-sonnet-20241022",
        max_tokens: 2048,
        system:
          "You are a helpful assistant with access to tools. Use tools when needed to help the user.",
        tools: AGENT_TOOLS as any,
        messages: messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
      });

      stopReason = response.stop_reason;

      // Traiter la réponse
      for (const block of response.content) {
        if (block.type === "text") {
          assistantMessage += block.text;
          yield { type: "text", content: block.text };
        } else if (block.type === "tool_use") {
          // Exécuter l'outil
          yield {
            type: "tool_call",
            toolName: block.name,
            toolId: block.id,
          };

          const toolResult = await executeTool({
            toolName: block.name,
            toolInput: block.input,
            userId: args.userId,
          });

          toolCalls.push({
            id: block.id,
            function: {
              name: block.name,
              arguments: JSON.stringify(block.input),
            },
          });

          toolResults.push({
            toolUseId: block.id,
            content: JSON.stringify(toolResult),
          });

          yield {
            type: "tool_result",
            toolId: block.id,
            result: toolResult,
          };

          // Ajouter la réponse de l'outil au contexte
          messages.push({
            role: "assistant",
            content: assistantMessage,
            toolCalls,
          });

          messages.push({
            role: "user",
            content: JSON.stringify(toolResults),
          });
        }
      }
    } while (stopReason === "tool_use");

    // Sauvegarder le message assistant avec les tool calls
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "assistant",
        content: assistantMessage,
        toolCalls: toolCalls.length > 0 ? toolCalls : undefined,
        toolResults: toolResults.length > 0 ? toolResults : undefined,
        createdAt: Date.now(),
      });
    });

    yield { type: "done" };
  },
});
```

## 4. Structured Output with JSON Schemas

```typescript
// convex/structuredOutput.ts
import { action } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Schéma JSON pour extraire des données structurées
const EXTRACTION_SCHEMA = {
  type: "object",
  properties: {
    sentiment: {
      type: "string",
      enum: ["positive", "negative", "neutral"],
      description: "Sentiment of the message",
    },
    urgency: {
      type: "string",
      enum: ["low", "medium", "high"],
      description: "Urgency level",
    },
    topics: {
      type: "array",
      items: { type: "string" },
      description: "Topics discussed",
    },
    action_items: {
      type: "array",
      items: {
        type: "object",
        properties: {
          task: { type: "string" },
          assignee: { type: "string" },
          deadline: { type: "string" },
        },
      },
    },
  },
  required: ["sentiment", "urgency", "topics"],
};

export const extractStructured = action({
  args: {
    content: v.string(),
  },
  handler: async (ctx, args) => {
    // Extraire des données structurées avec schéma JSON
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 1024,
      messages: [
        {
          role: "user",
          content: `Analyze this content and extract structured data:\n\n${args.content}`,
        },
      ],
      system:
        "You are a data extraction assistant. Extract information according to the provided schema.",
    });

    // Parser la réponse et valider contre le schéma
    let extracted = {};
    for (const block of response.content) {
      if (block.type === "text") {
        try {
          // Essayer de parser le JSON de la réponse
          extracted = JSON.parse(block.text);
        } catch {
          // Si ce n'est pas du JSON valide, utiliser directement le texte
          extracted = { raw: block.text };
        }
      }
    }

    return extracted;
  },
});
```

## 5. Message History Management

### Context Window Optimization

```typescript
// convex/contextManagement.ts
import { query, mutation } from "./_generated/server";
import { v } from "convex/values";

export const getContextWindow = query({
  args: {
    threadId: v.id("threads"),
    maxTokens: v.optional(v.number()),
  },
  handler: async (ctx, args) => {
    // Obtenir une fenêtre de contexte optimisée pour l'API
    const maxTokens = args.maxTokens || 4000;
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    // Toujours inclure les messages système et utilisateur récents
    const recentMessages = messages.slice(-20);

    // Estimer les tokens (approximation simple)
    let tokenCount = 0;
    const context: typeof recentMessages = [];

    for (let i = recentMessages.length - 1; i >= 0; i--) {
      const msg = recentMessages[i];
      const msgTokens = Math.ceil(msg.content.length / 4);
      if (tokenCount + msgTokens > maxTokens && context.length > 0) {
        break;
      }
      context.unshift(msg);
      tokenCount += msgTokens;
    }

    return { messages: context, tokenCount };
  },
});

export const summarizeOldMessages = mutation({
  args: {
    threadId: v.id("threads"),
    beforeMessageId: v.id("messages"),
  },
  handler: async (ctx, args) => {
    // Résumer les messages anciens pour économiser le contexte
    const messages = await ctx.db
      .query("messages")
      .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
      .order("asc")
      .collect();

    const targetIndex = messages.findIndex((m) => m._id === args.beforeMessageId);
    if (targetIndex === -1) return;

    const oldMessages = messages.slice(0, targetIndex);
    if (oldMessages.length === 0) return;

    // Créer un résumé (placeholder - implémenter avec une vraie summarization)
    const summary = `[Summary of ${oldMessages.length} messages from beginning of conversation]`;

    // Insérer un message de résumé
    const summaryId = await ctx.db.insert("messages", {
      threadId: args.threadId,
      role: "system",
      content: summary,
      createdAt: Date.now(),
    });

    // Marquer les anciens messages comme archivés (soft delete)
    for (const msg of oldMessages) {
      await ctx.db.patch(msg._id, {
        archived: true,
      });
    }

    return summaryId;
  },
});
```

## 6. Multi-Agent Workflows

### Agent Routing and Specialization

```typescript
// convex/multiAgent.ts
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Définir les agents spécialisés
const AGENTS = {
  general: {
    systemPrompt:
      "You are a general purpose assistant. Route complex queries to specialized agents.",
  },
  code: {
    systemPrompt:
      "You are an expert code assistant. Help with programming, debugging, and code review.",
  },
  research: {
    systemPrompt:
      "You are a research assistant. Help with literature review, fact-checking, and citations.",
  },
  creative: {
    systemPrompt:
      "You are a creative writing assistant. Help with stories, poetry, and creative content.",
  },
};

export const routeMessage = action({
  args: {
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Déterminer quel agent doit traiter le message
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 100,
      messages: [
        {
          role: "user",
          content: `Classify this message into one of these categories: general, code, research, creative. Reply with only the category name.\n\n${args.userMessage}`,
        },
      ],
    });

    let agentType = "general";
    for (const block of response.content) {
      if (block.type === "text") {
        const text = block.text.toLowerCase().trim();
        if (text.includes("code")) agentType = "code";
        else if (text.includes("research")) agentType = "research";
        else if (text.includes("creative")) agentType = "creative";
      }
    }

    return { agentType } as const;
  },
});

export const processWithAgent = action({
  args: {
    threadId: v.id("threads"),
    agentType: v.string(),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Traiter le message avec l'agent spécialisé
    const agent =
      AGENTS[args.agentType as keyof typeof AGENTS] || AGENTS.general;

    const messages = await ctx.runQuery(async (qctx) => {
      return await qctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("asc")
        .collect();
    });

    messages.push({
      role: "user",
      content: args.userMessage,
      threadId: args.threadId,
      createdAt: Date.now(),
    } as any);

    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: agent.systemPrompt,
      messages: messages.map((m) => ({
        role: m.role as "user" | "assistant",
        content: m.content,
      })),
    });

    let content = "";
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      }
    }

    // Sauvegarder la réponse
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "assistant",
        content,
        createdAt: Date.now(),
      });
    });

    return content;
  },
});
```

## 7. RAG Patterns with Convex Vector Search

### Vector Storage and Retrieval

```typescript
// convex/schema.ts (add to existing)
import { defineTable, defineSchema } from "convex/server";
import { v } from "convex/values";

export default defineSchema({
  // ... existing tables ...

  vectorDocuments: defineTable({
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    embedding: v.array(v.number()), // Vector embedding
    metadata: v.optional(
      v.object({
        source: v.string(),
        tags: v.array(v.string()),
        importedAt: v.number(),
      })
    ),
    createdAt: v.number(),
  })
    .vectorIndex("by_embedding", {
      vectorField: "embedding",
      filterFields: ["userId"],
    })
    .index("by_user", ["userId"]),
});
```

### RAG Query Implementation

```typescript
// convex/rag.ts
import { action, mutation } from "./_generated/server";
import { v } from "convex/values";
import Anthropic from "@anthropic-ai/sdk";

const client = new Anthropic();

// Générer un embedding pour un texte
async function getEmbedding(text: string): Promise<number[]> {
  const response = await client.beta.messages.create({
    model: "claude-3-5-sonnet-20241022",
    max_tokens: 1024,
    messages: [
      {
        role: "user",
        content: `Provide the embedding vector for this text (respond with only comma-separated numbers): ${text}`,
      },
    ],
  });

  // Note: Ceci est un placeholder. Utiliser une vraie API d'embedding
  return Array(1536).fill(0);
}

export const indexDocument = mutation({
  args: {
    userId: v.id("users"),
    title: v.string(),
    content: v.string(),
    source: v.optional(v.string()),
    tags: v.optional(v.array(v.string())),
  },
  handler: async (ctx, args) => {
    // Générer l'embedding du document
    const embedding = await getEmbedding(args.content);

    // Sauvegarder dans la base vectorielle
    const docId = await ctx.db.insert("vectorDocuments", {
      userId: args.userId,
      title: args.title,
      content: args.content,
      embedding,
      metadata: {
        source: args.source || "manual",
        tags: args.tags || [],
        importedAt: Date.now(),
      },
      createdAt: Date.now(),
    });

    return docId;
  },
});

export const ragQuery = action({
  args: {
    threadId: v.id("threads"),
    userId: v.id("users"),
    userMessage: v.string(),
  },
  handler: async (ctx, args) => {
    // Recherche vectorielle : récupérer les documents pertinents
    const queryEmbedding = await getEmbedding(args.userMessage);

    const relevantDocs = await ctx.runQuery(async (qctx) => {
      // Recherche vectorielle dans Convex
      return await qctx.db
        .query("vectorDocuments")
        .withIndex("by_embedding", (q) =>
          q
            .eq("userId", args.userId)
            .nearestTo(queryEmbedding, { limit: 5 })
        )
        .collect();
    });

    // Construire le contexte RAG
    const ragContext = relevantDocs
      .map((doc) => `[${doc.title}]\n${doc.content}`)
      .join("\n\n");

    // Récupérer les messages du thread
    const messages = await ctx.runQuery(async (qctx) => {
      return await qctx.db
        .query("messages")
        .withIndex("by_thread", (q) => q.eq("threadId", args.threadId))
        .order("asc")
        .collect();
    });

    // Appeler l'agent avec le contexte RAG
    const response = await client.messages.create({
      model: "claude-3-5-sonnet-20241022",
      max_tokens: 2048,
      system: `You are a helpful assistant with access to a knowledge base. Use the provided context to answer questions accurately.

Context from knowledge base:
${ragContext}`,
      messages: [
        ...messages.map((m) => ({
          role: m.role as "user" | "assistant",
          content: m.content,
        })),
        {
          role: "user",
          content: args.userMessage,
        },
      ],
    });

    let content = "";
    for (const block of response.content) {
      if (block.type === "text") {
        content += block.text;
      }
    }

    // Sauvegarder la réponse et les sources utilisées
    await ctx.runMutation(async (mctx) => {
      await mctx.db.insert("messages", {
        threadId: args.threadId,
        role: "assistant",
        content,
        createdAt: Date.now(),
      });
    });

    return {
      content,
      sources: relevantDocs.map((d) => ({
        title: d.title,
        source: d.metadata?.source,
      })),
    };
  },
});
```

## 8. Human-in-the-Loop Workflows

### Approval Workflows for Agent Actions

```typescript
// convex/humanLoop.ts
import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

export const requestApproval = mutation({
  args: {
    userId: v.id("users"),
    threadId: v.id("threads"),
    actionType: v.string(),
    actionDescription: v.string(),
    requiredApprovalRole: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Créer une demande d'approbation
    const approvalId = await ctx.db.insert("approvalRequests", {
      userId: args.userId,
      threadId: args.threadId,
      actionType: args.actionType,
      actionDescription: args.actionDescription,
      requiredRole: args.requiredApprovalRole || "supervisor",
      status: "pending",
      createdAt: Date.now(),
      responses: [],
    });

    return approvalId;
  },
});

export const approveAction = mutation({
  args: {
    approvalId: v.id("approvalRequests"),
    approverId: v.id("users"),
    approved: v.boolean(),
    comment: v.optional(v.string()),
  },
  handler: async (ctx, args) => {
    // Approuver ou rejeter une action
    const approval = await ctx.db.get(args.approvalId);
    if (!approval) throw new Error("Approval request not found");

    const updatedResponses = [
      ...(approval.responses || []),
      {
        approverId: args.approverId,
        approved: args.approved,
        comment: args.comment || "",
        respondedAt: Date.now(),
      },
    ];

    // Déterminer le statut final
    const approved = updatedResponses.some((r) => r.approved);
    const rejected = updatedResponses.some((r) => !r.approved);

    let status = "pending";
    if (approved) status = "approved";
    if (rejected) status = "rejected";

    await ctx.db.patch(args.approvalId, {
      status,
      responses: updatedResponses,
    });

    return status;
  },
});

export const executeApprovedAction = action({
  args: {
    approvalId: v.id("approvalRequests"),
    userId: v.id("users"),
  },
  handler: async (ctx, args) => {
    // Exécuter une action approuvée
    const approval = await ctx.runQuery(async (qctx) => {
      return await qctx.db.get(args.approvalId);
    });

    if (!approval) throw new Error("Approval request not found");
    if (approval.status !== "approved") {
      throw new Error("Action not approved");
    }

    // Exécuter l'action selon son type
    switch (approval.actionType) {
      case "send_email":
        return await executeSendEmail(ctx, approval.actionDescription);
      case "publish_document":
        return await executePublishDocument(ctx, approval.actionDescription);
      case "delete_data":
        return await executeDeleteData(ctx, approval.actionDescription);
      default:
        throw new Error(`Unknown action type: ${approval.actionType}`);
    }
  },
});

async function executeSendEmail(ctx: any, description: string) {
  // Implémentation : envoyer l'email approuvé
  return { success: true, message: "Email sent" };
}

async function executePublishDocument(ctx: any, description: string) {
  // Implémentation : publier le document approuvé
  return { success: true, message: "Document published" };
}

async function executeDeleteData(ctx: any, description: string) {
  // Implémentation : supprimer les données approuvées
  return { success: true, message: "Data deleted" };
}
```

## 9. Rate Limiting and Usage Tracking

### API Rate Limiting

```typescript
// convex/rateLimit.ts
import { mutation, query, action } from "./_generated/server";
import { v } from "convex/values";

export const trackApiUsage = mutation({
  args: {
    userId: v.id("users"),
    model: v.string(),
    inputTokens: v.number(),
    outputTokens: v.number(),
  },
  handler: async (ctx, args) => {
    // Enregistrer l'utilisation de l'API
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    // Obtenir les limites de l'utilisateur
    const user = await ctx.db.get(args.userId);
    const limits = user.limits || {
      hourlyRequests: 100,
      hourlyTokens: 100000,
      dailyRequests: 1000,
      dailyTokens: 1000000,
    };

    // Vérifier les limites de taux
    const hourlyUsage = await ctx.db
      .query("apiUsage")
      .filter((q) =>
        q.and(
          q.eq("userId", args.userId),
          q.gte("timestamp", oneHourAgo)
        )
      )
      .collect();

    const hourlyTokens = hourlyUsage.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0
    );

    if (hourlyUsage.length >= limits.hourlyRequests) {
      throw new Error("Hourly request limit exceeded");
    }
    if (hourlyTokens + args.inputTokens + args.outputTokens > limits.hourlyTokens) {
      throw new Error("Hourly token limit exceeded");
    }

    // Enregistrer l'utilisation
    await ctx.db.insert("apiUsage", {
      userId: args.userId,
      model: args.model,
      inputTokens: args.inputTokens,
      outputTokens: args.outputTokens,
      timestamp: now,
    });

    return { success: true };
  },
});

export const getUserQuota = query({
  args: { userId: v.id("users") },
  handler: async (ctx, args) => {
    // Obtenir les quotas actuels et l'utilisation
    const now = Date.now();
    const oneHourAgo = now - 60 * 60 * 1000;
    const oneDayAgo = now - 24 * 60 * 60 * 1000;

    const user = await ctx.db.get(args.userId);
    const limits = user.limits || {
      hourlyRequests: 100,
      hourlyTokens: 100000,
      dailyRequests: 1000,
      dailyTokens: 1000000,
    };

    const hourlyUsage = await ctx.db
      .query("apiUsage")
      .filter((q) =>
        q.and(
          q.eq("userId", args.userId),
          q.gte("timestamp", oneHourAgo)
        )
      )
      .collect();

    const dailyUsage = await ctx.db
      .query("apiUsage")
      .filter((q) =>
        q.and(
          q.eq("userId", args.userId),
          q.gte("timestamp", oneDayAgo)
        )
      )
      .collect();

    const hourlyTokens = hourlyUsage.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0
    );
    const dailyTokens = dailyUsage.reduce(
      (sum, u) => sum + u.inputTokens + u.outputTokens,
      0
    );

    return {
      hourly: {
        requests: {
          used: hourlyUsage.length,
          limit: limits.hourlyRequests,
        },
        tokens: {
          used: hourlyTokens,
          limit: limits.hourlyTokens,
        },
      },
      daily: {
        requests: {
          used: dailyUsage.length,
          limit: limits.dailyRequests,
        },
        tokens: {
          used: dailyTokens,
          limit: limits.dailyTokens,
        },
      },
    };
  },
});
```

## 10. Debugging AI Agent Issues

### Logging and Error Tracking

```typescript
// convex/agentDebug.ts
import { mutation, action } from "./_generated/server";
import { v } from "convex/values";

export const logAgentTrace = mutation({
  args: {
    threadId: v.id("threads"),
    level: v.string(), // debug, info, warning, error
    source: v.string(), // tool name, agent type, etc.
    message: v.string(),
    metadata: v.optional(v.any()),
  },
  handler: async (ctx, args) => {
    // Enregistrer une trace d'exécution de l'agent
    const logId = await ctx.db.insert("agentLogs", {
      threadId: args.threadId,
      level: args.level,
      source: args.source,
      message: args.message,
      metadata: args.metadata,
      timestamp: Date.now(),
    });

    return logId;
  },
});

export const debugAgent = action({
  args: {
    threadId: v.id("threads"),
  },
  handler: async (ctx, args) => {
    // Récupérer les logs de débogage pour un thread
    const logs = await ctx.runQuery(async (qctx) => {
      return await qctx.db
        .query("agentLogs")
        .filter((q) => q.eq("threadId", args.threadId))
        .order("desc")
        .take(100)
        .collect();
    });

    // Analyser les problèmes courants
    const errors = logs.filter((l) => l.level === "error");
    const warnings = logs.filter((l) => l.level === "warning");
    const toolErrors = logs.filter((l) =>
      l.message.toLowerCase().includes("tool")
    );

    return {
      totalLogs: logs.length,
      errors: {
        count: errors.length,
        recent: errors.slice(0, 5),
      },
      warnings: {
        count: warnings.length,
        recent: warnings.slice(0, 5),
      },
      toolIssues: {
        count: toolErrors.length,
        recent: toolErrors.slice(0, 5),
      },
      diagnostics: {
        hasRecurrentErrors: errors.length > 5,
        hasToolIssues: toolErrors.length > 2,
        needsAttention: errors.length > 0 || toolErrors.length > 0,
      },
    };
  },
});
```

## Best Practices

1. **Thread Persistence**: Always save threads and messages to maintain conversation state
2. **Token Budgeting**: Estimate token usage and implement context window optimization
3. **Error Handling**: Log all errors and implement retry logic with exponential backoff
4. **Tool Safety**: Validate tool inputs and implement approval workflows for sensitive actions
5. **Performance**: Use vector search for RAG, batch operations where possible
6. **User Experience**: Stream responses for real-time feedback, show tool execution progress
7. **Testing**: Test tool calling with various inputs, verify schema compliance
8. **Cost Control**: Track API usage, implement rate limiting per user tier

## Resources

- [@convex-dev/agent documentation](https://docs.convex.dev)
- [Anthropic API docs](https://docs.anthropic.com)
- [Convex vector search guide](https://docs.convex.dev/database/vector-search)
- [Tool use best practices](https://docs.anthropic.com/guides/tool-use)
