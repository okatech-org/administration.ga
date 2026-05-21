import { Skeleton } from "@/components/ui/skeleton"

export default function NewsDetailLoading() {
  return (
    <div className="min-h-dvh bg-background">
      <div className="max-w-3xl mx-auto px-4 py-8 space-y-8">
        {/* Back button */}
        <Skeleton className="h-9 w-32" />

        {/* Category badge + date */}
        <div className="flex items-center gap-3">
          <Skeleton className="h-6 w-24 rounded-full" />
          <Skeleton className="h-4 w-32" />
        </div>

        {/* Title */}
        <Skeleton className="h-10 w-full" />
        <Skeleton className="h-10 w-2/3" />

        {/* Cover image */}
        <Skeleton className="h-72 w-full rounded-xl" />

        {/* Article body */}
        <div className="space-y-4">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-3/4" />
        </div>
      </div>
    </div>
  )
}
