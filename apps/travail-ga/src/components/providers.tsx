"use client";

import { Toaster } from "sonner";
import { ConvexAuthProvider } from "@/lib/convex-provider";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ConvexAuthProvider>
      {children}
      <Toaster position="top-right" richColors />
    </ConvexAuthProvider>
  );
}
