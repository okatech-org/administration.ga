import { useState, useMemo } from "react"
import { useQuery } from "convex/react"
import { api } from "@convex/_generated/api"
import type { Id } from "@convex/_generated/dataModel"

export function useProfileLookup() {
  const [searchTerm, setSearchTerm] = useState("")
  const [selectedProfileId, setSelectedProfileId] = useState<Id<"profiles"> | null>(null)

  // Debounced search — only search when 2+ chars
  const debouncedTerm = useDebounce(searchTerm, 300)
  const shouldSearch = debouncedTerm.length >= 2

  const results = useQuery(
    api.functions.profiles.searchProfiles,
    shouldSearch ? { query: debouncedTerm } : "skip"
  )

  const selectedProfile = useQuery(
    api.functions.profiles.getProfileDetail,
    selectedProfileId ? { profileId: selectedProfileId } : "skip"
  )

  return {
    searchTerm,
    setSearchTerm,
    results: results ?? [],
    isSearching: shouldSearch && results === undefined,
    selectedProfileId,
    setSelectedProfileId,
    selectedProfile: selectedProfile ?? null,
    isLoadingProfile: selectedProfileId !== null && selectedProfile === undefined,
  }
}

// Simple debounce hook
function useDebounce(value: string, delay: number) {
  const [debounced, setDebounced] = useState(value)

  useMemo(() => {
    const timer = setTimeout(() => setDebounced(value), delay)
    return () => clearTimeout(timer)
  }, [value, delay])

  return debounced
}
