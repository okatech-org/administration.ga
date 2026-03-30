---
name: shadcn-ui
description: "🎨 Expert Shadcn/UI Components. S'active automatiquement quand un composant UI est créé ou modifié. Couvre l'installation, la personnalisation, et les patterns d'utilisation de Shadcn/ui avec Radix UI et Tailwind CSS."
---

# 🎨 Skill : Shadcn/UI Components Expert

## Auto-Activation
- Fichier dans `components/ui/` ou composant utilisant Shadcn
- Projets avec `components.json` : TOUS (consulat.ga, cnom.ga, mairie.ga, sgg.ga, digitalium.io, evenement.ga, idetude.ga, AGASA-*)

## Commande d'Installation

```bash
# Projets avec pnpm (consulat.ga)
pnpm dlx shadcn@latest add [composant]

# Projets avec npm
npx shadcn@latest add [composant]

# Multiples composants
npx shadcn@latest add button card dialog table form input select
```

## ⚠️ RÈGLE CRITIQUE
Les fichiers dans `components/ui/` sont gérés par Shadcn. Pour personnaliser, créer un wrapper dans `components/shared/` ou `components/common/`.

## Composants les Plus Utilisés dans les Projets OkaTech

### 1. Sidebar (Shadcn sidebar) — Tous les dashboards
```tsx
// components/ui/sidebar.tsx — Installé dans mairie.ga, sgg.ga, idetude.ga, consulat.ga
import { SidebarProvider, Sidebar, SidebarContent, SidebarGroup, SidebarMenuItem } from "@/components/ui/sidebar";
```

### 2. Dialog/Modal avec Formulaire
```tsx
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from "@/components/ui/form";

function CreateEntityDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (v: boolean) => void }) {
  const form = useForm<z.infer<typeof schema>>({
    resolver: zodResolver(schema),
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Créer un élément</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField control={form.control} name="title"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Titre</FormLabel>
                  <FormControl><Input {...field} /></FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button type="submit" disabled={form.formState.isSubmitting}>
                {form.formState.isSubmitting ? "Création..." : "Créer"}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
```

### 3. Select avec Recherche (CommandPalette pattern)
```tsx
import { Command, CommandInput, CommandList, CommandEmpty, CommandItem } from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
```

### 4. Toast Notifications (sonner)
```tsx
// Sonner est utilisé dans TOUS les projets
import { toast } from "sonner";

toast.success("Document créé avec succès");
toast.error("Erreur lors de la création");
toast.promise(asyncFn(), {
  loading: "Chargement...",
  success: "Terminé !",
  error: "Échec",
});
```

### 5. DropdownMenu (Actions contextuelles)
```tsx
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

<DropdownMenu>
  <DropdownMenuTrigger asChild>
    <Button variant="ghost" size="icon"><MoreHorizontal className="h-4 w-4" /></Button>
  </DropdownMenuTrigger>
  <DropdownMenuContent align="end">
    <DropdownMenuItem onClick={handleEdit}>
      <Pencil className="mr-2 h-4 w-4" /> Modifier
    </DropdownMenuItem>
    <DropdownMenuSeparator />
    <DropdownMenuItem onClick={handleDelete} className="text-destructive">
      <Trash className="mr-2 h-4 w-4" /> Supprimer
    </DropdownMenuItem>
  </DropdownMenuContent>
</DropdownMenu>
```

## Utilitaire cn() — Présent dans TOUS les projets
```ts
// lib/utils.ts
import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
```

## Bibliothèques Complémentaires
- **lucide-react** : Icônes (utilisé dans TOUS les projets)
- **date-fns** : Manipulation de dates (TOUS les projets)
- **react-hook-form + @hookform/resolvers** : Formulaires
- **zod** : Validation de schéma
- **recharts** : Graphiques (foot.cd, sgg.ga, idetude.ga)
- **sonner** : Toast notifications (TOUS les projets)

## Anti-Patterns
- ❌ JAMAIS modifier les fichiers `components/ui/`
- ❌ JAMAIS oublier `asChild` sur les DialogTrigger/PopoverTrigger avec composant custom
- ❌ JAMAIS utiliser `alert()` natif — utiliser `toast` de sonner
- ❌ JAMAIS réinventer un composant que Shadcn fournit déjà
