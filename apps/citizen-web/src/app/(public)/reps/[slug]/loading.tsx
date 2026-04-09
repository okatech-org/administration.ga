import { Skeleton } from "@/components/ui/skeleton"

export default function RepDetailLoading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back button */}
        <Skeleton className="h-9 w-32" />

        {/* Header */}
        <div className="flex items-center gap-4">
          <Skeleton className="h-12 w-12 rounded" />
          <div className="space-y-2 flex-1">
            <Skeleton className="h-8 w-64" />
            <Skeleton className="h-4 w-32 rounded-full" />
          </div>
        </div>

        {/* Contact info card */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-40" />
          <div className="space-y-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3">
                <Skeleton className="h-5 w-5 rounded" />
                <Skeleton className="h-4 w-56" />
              </div>
            ))}
          </div>
        </div>

        {/* Map */}
        <Skeleton className="h-64 w-full rounded-xl" />

        {/* Services */}
        <div className="rounded-xl border bg-card p-6 space-y-4">
          <Skeleton className="h-6 w-32" />
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-10 w-full rounded-lg" />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}
