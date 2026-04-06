import { Skeleton } from "@/components/ui/skeleton"

export default function ServiceDetailLoading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-4xl mx-auto px-4 py-8 space-y-8">
        {/* Back button */}
        <Skeleton className="h-9 w-32" />

        {/* Header */}
        <div className="space-y-4">
          <div className="flex items-center gap-3">
            <Skeleton className="h-14 w-14 rounded-xl" />
            <div className="space-y-2 flex-1">
              <Skeleton className="h-8 w-2/3" />
              <Skeleton className="h-4 w-24 rounded-full" />
            </div>
          </div>
          <Skeleton className="h-5 w-full" />
          <Skeleton className="h-5 w-3/4" />
        </div>

        {/* Content cards */}
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-2/3" />
          </div>

          <div className="rounded-xl border bg-card p-6 space-y-4">
            <Skeleton className="h-6 w-48" />
            <div className="space-y-2">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="flex items-center gap-3">
                  <Skeleton className="h-5 w-5 rounded" />
                  <Skeleton className="h-4 w-48" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
