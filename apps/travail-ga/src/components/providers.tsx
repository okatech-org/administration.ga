"use client";

import { ConvexProvider, ConvexReactClient } from "convex/react";
import { TravailThemeProvider } from "@/components/design/theme-provider";

const convexUrl = process.env.NEXT_PUBLIC_CONVEX_URL;
const convex = convexUrl ? new ConvexReactClient(convexUrl) : null;

export function Providers({ children }: { children: React.ReactNode }) {
  const tree = (
    <TravailThemeProvider>{children}</TravailThemeProvider>
  );
  if (!convex) return tree;
  return <ConvexProvider client={convex}>{tree}</ConvexProvider>;
}
