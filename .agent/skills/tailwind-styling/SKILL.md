---
name: tailwind-styling
description: "🎯 Expert Tailwind CSS Styling. S'active automatiquement pour tout travail de styling, design, mise en page, responsive design, animations. Couvre les patterns Tailwind CSS v3, les utilitaires personnalisés, et le responsive design."
---

# 🎯 Skill : Tailwind CSS Styling Expert

## Auto-Activation
- Mots-clés : style, design, couleur, layout, responsive, animation, CSS, UI, dark mode
- Fichiers modifiés avec classes Tailwind
- S'applique à TOUS les projets OkaTech (tous Tailwind v3)

## Identité Visuelle OkaTech (Portails Institutionnels)

### Couleurs Gabon
```
Vert Gabon : #009e49 → utilisé comme primary
Jaune Gabon : #fcd116 → utilisé comme accent
Bleu Gabon : #3a75c4 → utilisé comme info
Noir profond : #1a1a2e → dark backgrounds
```

### Variables CSS communes (globals.css)
```css
@layer base {
  :root {
    --background: 0 0% 100%;
    --foreground: 222.2 84% 4.9%;
    --primary: 142 100% 31%;      /* Vert Gabon */
    --primary-foreground: 0 0% 100%;
    --muted: 210 40% 96.1%;
    --muted-foreground: 215.4 16.3% 46.9%;
    --accent: 45 97% 54%;          /* Jaune Gabon */
  }
  .dark {
    --background: 222.2 84% 4.9%;
    --foreground: 210 40% 98%;
    --primary: 142 100% 31%;
  }
}
```

## Patterns de Layout Récurrents

### Dashboard Layout (identique dans tous les projets)
```tsx
<div className="flex h-screen overflow-hidden bg-background">
  {/* Sidebar fixe */}
  <aside className="hidden md:flex w-64 lg:w-72 flex-col border-r bg-card shrink-0">
    <div className="h-16 flex items-center px-4 border-b">
      <Logo />
    </div>
    <nav className="flex-1 overflow-y-auto py-2 px-2">
      {/* NavItems */}
    </nav>
    <div className="border-t p-4">
      {/* User info */}
    </div>
  </aside>
  
  {/* Contenu principal */}
  <div className="flex-1 flex flex-col min-w-0">
    <header className="h-16 border-b bg-card flex items-center justify-between px-4 lg:px-6 shrink-0">
      {/* Mobile menu + breadcrumbs + actions */}
    </header>
    <main className="flex-1 overflow-y-auto">
      <div className="p-4 lg:p-6 max-w-7xl mx-auto">
        {/* Page content */}
      </div>
    </main>
  </div>
</div>
```

### Grille de Stats (Dashboard)
```tsx
<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
  <Card className="p-6">
    <div className="flex items-center gap-4">
      <div className="p-3 rounded-xl bg-primary/10">
        <FileText className="h-5 w-5 text-primary" />
      </div>
      <div>
        <p className="text-sm text-muted-foreground">Demandes</p>
        <p className="text-2xl font-bold">{count}</p>
      </div>
    </div>
  </Card>
</div>
```

### Card avec Hover Effect (récurrent)
```tsx
<Card className="
  group cursor-pointer
  transition-all duration-200 ease-in-out
  hover:shadow-lg hover:-translate-y-0.5
  border border-border/50
  hover:border-primary/20
">
  <CardContent className="p-6">
    <div className="flex items-start justify-between">
      <div className="space-y-2">
        <h3 className="font-semibold group-hover:text-primary transition-colors">
          {title}
        </h3>
        <p className="text-sm text-muted-foreground line-clamp-2">{description}</p>
      </div>
      <ChevronRight className="h-5 w-5 text-muted-foreground group-hover:text-primary transition-colors" />
    </div>
  </CardContent>
</Card>
```

### Badge de Statut
```tsx
const statusColors: Record<string, string> = {
  draft: "bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-300",
  pending: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  under_review: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  validated: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
  completed: "bg-emerald-100 text-emerald-700",
};

<span className={cn(
  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-medium",
  statusColors[status]
)}>
  <StatusIcon className="h-3 w-3" />
  {statusLabel}
</span>
```

### Glassmorphism (Landing Pages)
```tsx
<div className="bg-white/10 backdrop-blur-xl border border-white/20 rounded-2xl shadow-2xl p-8">
```

### Table Responsive
```tsx
<div className="rounded-lg border overflow-hidden">
  <div className="overflow-x-auto">
    <Table>
      <TableHeader>
        <TableRow className="bg-muted/50 hover:bg-muted/50">
          <TableHead className="font-semibold">Nom</TableHead>
          <TableHead className="hidden md:table-cell">Statut</TableHead>
          <TableHead className="text-right">Actions</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {/* Rows */}
      </TableBody>
    </Table>
  </div>
</div>
```

## Typography (échelle standard)
```tsx
// Titre de page
<h1 className="text-2xl md:text-3xl font-bold tracking-tight">
// Sous-titre
<h2 className="text-lg md:text-xl font-semibold">
// Description
<p className="text-sm text-muted-foreground">
// Label catégorie
<span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
```

## Anti-Patterns
- ❌ JAMAIS de CSS inline quand Tailwind peut le faire
- ❌ JAMAIS de valeurs pixel arbitraires — utiliser l'échelle Tailwind
- ❌ JAMAIS ignorer le responsive (TOUJOURS tester mobile → desktop)
- ❌ JAMAIS mélanger les standards de couleurs entre projets
- ❌ JAMAIS utiliser `!important` — résoudre les conflits autrement
