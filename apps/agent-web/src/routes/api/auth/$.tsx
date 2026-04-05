import { createFileRoute } from "@tanstack/react-router";

// Géré par server/routes/api/auth/[...path].ts (Nitro)
export const Route = createFileRoute("/api/auth/$")({});

