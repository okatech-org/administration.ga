import { Search, Loader2, User, X, IdCard, MapPin, Calendar } from "lucide-react"
import { useProfileLookup } from "../../hooks/useProfileLookup"

export function ProfileLookupPage() {
  const {
    searchTerm,
    setSearchTerm,
    results,
    isSearching,
    selectedProfileId,
    setSelectedProfileId,
    selectedProfile,
    isLoadingProfile,
  } = useProfileLookup()

  return (
    <div className="flex-1 overflow-hidden flex flex-col p-6">
      {/* Header */}
      <div className="mb-4">
        <h1 className="text-xl font-bold text-foreground">Recherche de profils</h1>
        <p className="text-sm text-muted-foreground">Recherchez un citoyen par nom pour consulter son dossier</p>
      </div>

      {/* Search bar */}
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground" />
        <input
          type="text"
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          placeholder="Rechercher par nom, prénom..."
          className="w-full pl-10 pr-4 py-2.5 rounded-xl border border-border bg-card text-sm text-foreground placeholder:text-muted-foreground/50 focus:border-primary focus:outline-none focus:ring-1 focus:ring-primary"
        />
        {isSearching && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground animate-spin" />
        )}
      </div>

      <div className="flex-1 overflow-hidden flex gap-4">
        {/* Results list */}
        <div className="flex-1 overflow-y-auto">
          {searchTerm.length < 2 ? (
            <div className="flex flex-col items-center justify-center py-16">
              <Search className="size-10 mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Saisissez au moins 2 caractères</p>
            </div>
          ) : results.length === 0 && !isSearching ? (
            <div className="flex flex-col items-center justify-center py-16">
              <User className="size-10 mb-3 text-muted-foreground/20" />
              <p className="text-sm text-muted-foreground">Aucun résultat pour « {searchTerm} »</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-2">
              {results.map((profile: any) => (
                <button
                  key={profile._id}
                  onClick={() => setSelectedProfileId(profile._id)}
                  className={`w-full text-left flex items-center gap-3 p-3 rounded-xl border transition-colors
                    ${selectedProfileId === profile._id
                      ? "border-primary bg-primary/5"
                      : "border-border bg-card hover:bg-muted/50"
                    }
                  `}
                >
                  <div className="size-10 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                    <span className="text-sm font-medium text-primary">
                      {getInitials(profile.firstName, profile.lastName)}
                    </span>
                  </div>
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">
                      {profile.firstName} {profile.lastName}
                    </p>
                    <p className="text-xs text-muted-foreground truncate">
                      {profile.nationality || "Nationalité inconnue"}
                    </p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Profile detail panel */}
        {selectedProfileId && (
          <div className="w-80 shrink-0 rounded-xl border border-border bg-card overflow-y-auto">
            {isLoadingProfile ? (
              <div className="flex items-center justify-center py-16">
                <Loader2 className="size-6 animate-spin text-muted-foreground" />
              </div>
            ) : selectedProfile ? (
              <ProfileDetail profile={selectedProfile} onClose={() => setSelectedProfileId(null)} />
            ) : null}
          </div>
        )}
      </div>
    </div>
  )
}

function ProfileDetail({ profile, onClose }: { profile: any; onClose: () => void }) {
  const p = profile.profile || profile

  return (
    <div className="p-4 space-y-4">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="size-12 rounded-full bg-primary/10 flex items-center justify-center">
            <span className="text-lg font-semibold text-primary">
              {getInitials(p.firstName, p.lastName)}
            </span>
          </div>
          <div>
            <p className="font-semibold text-foreground">{p.firstName} {p.lastName}</p>
            <p className="text-xs text-muted-foreground">{p.nationality || "—"}</p>
          </div>
        </div>
        <button onClick={onClose} className="size-7 flex items-center justify-center rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted">
          <X className="size-4" />
        </button>
      </div>

      {/* Identity */}
      <Section title="Identité" icon={User}>
        <Field label="Nom" value={p.lastName} />
        <Field label="Prénom" value={p.firstName} />
        <Field label="Date de naissance" value={p.birthDate ? formatDateFull(p.birthDate) : "—"} />
        <Field label="Lieu de naissance" value={p.birthPlace || "—"} />
        <Field label="Genre" value={p.gender === "M" ? "Masculin" : p.gender === "F" ? "Féminin" : "—"} />
        <Field label="Nationalité" value={p.nationality || "—"} />
      </Section>

      {/* Passport */}
      <Section title="Passeport" icon={IdCard}>
        <Field label="N° passeport" value={p.passportNumber || "—"} />
        <Field label="Délivré le" value={p.passportIssueDate ? formatDateFull(p.passportIssueDate) : "—"} />
        <Field label="Expire le" value={p.passportExpiryDate ? formatDateFull(p.passportExpiryDate) : "—"} />
      </Section>

      {/* Address */}
      <Section title="Adresse" icon={MapPin}>
        <Field label="Adresse" value={p.address || "—"} />
        <Field label="Ville" value={p.city || "—"} />
        <Field label="Pays" value={p.country || "—"} />
      </Section>
    </div>
  )
}

function Section({ title, icon: Icon, children }: { title: string; icon: React.ElementType; children: React.ReactNode }) {
  return (
    <div>
      <div className="flex items-center gap-2 mb-2 pb-1 border-b border-border/50">
        <Icon className="size-3.5 text-muted-foreground" />
        <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">{title}</p>
      </div>
      <div className="space-y-1.5">{children}</div>
    </div>
  )
}

function Field({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex justify-between text-xs">
      <span className="text-muted-foreground">{label}</span>
      <span className="text-foreground font-medium text-right">{value}</span>
    </div>
  )
}

function getInitials(first?: string, last?: string) {
  return ((first?.[0] || "") + (last?.[0] || "")).toUpperCase() || "?"
}

function formatDateFull(d: string | number) {
  try {
    return new Date(d).toLocaleDateString("fr-FR", { day: "2-digit", month: "long", year: "numeric" })
  } catch {
    return String(d)
  }
}
