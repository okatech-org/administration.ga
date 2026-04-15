# Audit iAsted — État actuel, écarts DS v3, recommandations

> **Date :** 2026-04-15
> **Scope :** Module iAsted dans `agent-web`, `citizen-web`, `backoffice-web`
> **Référentiel :** Citizen Design System v3 « Slate Trust & Authority »
> **Modèle d'animation de référence :** `apps/citizen-web/src/components/ui/circle-menu.tsx`
> **Source screenshots :** fenêtres mobile + desktop + FAB radial + vue citoyen vide

---

## 0. TL;DR

Le module iAsted souffre de **4 dettes structurelles** qui empêchent à la fois la cohérence visuelle, l'efficacité agent, et la configurabilité :

1. **Full duplication** des 3 implémentations (agent / citizen / backoffice) sans `packages/iasted` partagé — chaque correctif doit être répliqué 3×.
2. **Violations DS v3** systématiques : header gradient vert émeraude plein, boutons colorés vifs (rose/bleu/amber) comme fonds, pas d'achromatie, ring au lieu d'élévation par luminosité, radius `rounded-2xl` sur cartes.
3. **Ergonomie agent anémique** : la vue « work » ressemble à la vue « citizen ». Aucune surface dédiée aux affordances métier (file d'attente, SLA, historique citoyen, transfert, prise de notes, actions rapides).
4. **Configuration backoffice dispersée** : `IAstedSection.tsx` existe mais ne pilote pas l'instance runtime — les toggles / personas / escalations sont déclaratifs sans préview ni validation.

Le **CircleMenu du citizen-web est le joyau d'identité** — il doit devenir le point d'entrée universel (agent et backoffice inclus), avec adaptation du contenu selon le contexte.

---

## 1. État actuel — observation des 5 captures

| # | Capture | Contexte | Observations clés |
|---|---------|----------|-------------------|
| 1 | Mobile chat window plein écran, header vert foncé avec « iAsted / Administration », onglets Tous/Équipe/Réseau/Citoyens | **agent-web mobile** | Header `bg-emerald-600` pleine largeur + sous-titre blanc ; tabs horizontaux avec pill bleu plein `bg-blue-500` ; liste contacts dense avec avatars initiales mono-couleur ; nav bas 5 items (iChat/iContact/iAppel/iRéunion/Réglages) |
| 2 | Popup desktop (position relative), header vert même pattern, section dorée « STANDARD » | **agent-web desktop (window)** | Même header mais agrandi ; section STANDARD typographiée `text-emerald-400 uppercase` ; pied de carte « 11 contacts · 2 orgs » en bordure ; taille fixe `420 × 640px` |
| 3 | Vue plein écran avec sidebar gauche (Consulat Gén.), colonne « Discussions », panneau droit « Bonjour, je suis iAsted » | **agent-web desktop (/iasted page)** | Layout 3-colonnes ; colonne discussions dupliquée avec la liste contacts de la popup ; panneau conversation vide avec 2 CTAs « Résumé de la journée / Demandes en attente » en boutons émeraude pleins |
| 4 | FAB radial avec trigger vert central et 4 items orbitaux (Mr Ray rose, iContact amber, iChat vert, iAppel bleu) | **citizen-web desktop FAB** | Le CircleMenu animé — **seule instance DS-aligned** : accents variés mais utilisés en *marqueurs* d'action, pas en fond ; halo ring bleu autour du trigger |
| 5 | Mobile vue citoyen : header « iAsted / Assistant Consulaire », Mr Ray épinglé, état vide « Aucune conversation agent », 3 tabs bas | **citizen-web mobile (window)** | Header `bg-card` achromatique ✓ ; icône dans boîte `bg-emerald-500/10` ✓ ; état vide centré ; mais hiérarchie info faible (Mr Ray en pin isolé perd sa valeur) |

**Verdict croisé :** le citizen-web est **à ~70% conforme** DS v3 ; l'agent-web et le backoffice-web à **~25-30%**.

---

## 2. Écarts DS v3 — Checklist des 10 commandements

| # | Commandement | Agent-Web | Citizen-Web | Backoffice-Web |
|---|--------------|-----------|-------------|----------------|
| 1 | ❌ Zéro ombre | ❌ (FAB uses shadow-lg) | ✓ | ❌ (FAB shadow) |
| 2 | ❌ Zéro bordure sur FlatCard | ❌ Header bordered | ⚠ Partiel | ❌ |
| 3 | ❌ Zéro bg-white / bg-black | ⚠ Dark ok, light ko | ✓ | ⚠ |
| 4 | ❌ Zéro font-normal | ⚠ | ✓ | ⚠ |
| 5 | ❌ Zéro icônes non-Lucide | ✓ | ✓ | ✓ |
| 6 | ❌ Zéro rounded-2xl sur FlatCard | ❌ Window=rounded-2xl | ❌ Window=rounded-2xl | ❌ |
| 7 | ❌ Zéro padding sur FlatCard racine | ⚠ | ✓ | ⚠ |
| 8 | ❌ Zéro couleurs vives hors sémantique | **❌ Header emerald-600 plein** | ❌ CircleMenu items (acceptable car accents) | ❌ |
| 9 | ❌ Zéro couleur Tailwind brute | **❌ emerald-500/600 partout** | ⚠ (rose-500, emerald-600 en FAB trigger) | ❌ |
| 10 | ❌ Zéro gradient coloré de fond | **❌ Header gradient vert** | ✓ | ❌ |

**Violations majeures à corriger en P0 :**
- Suppression du header `bg-emerald-600` → remplacement par surface S1 (`#F4F3ED` / `#171616`) + icône dans boîte foregroud/8
- Conversion de tous les `emerald-*` en tokens sémantiques (`primary` = #0072B9 pour CTAs, `emerald-500/15` uniquement pour statuts "success")
- Unification du radius : window = `rounded-2xl` (exception sidebar/navbar), sub-cards = `rounded-xl`, boutons = `rounded-lg`

---

## 3. Gaps d'ergonomie

### 3.1 Côté agent (les vrais problèmes métier)

L'agent utilise iAsted pour traiter des **demandes** et **citoyens** — or la fenêtre actuelle est construite comme un simple chat consumer.

| Besoin agent | Absent aujourd'hui | Impact |
|--------------|-------------------|--------|
| File d'attente citoyens prioritaire | ❌ | L'agent ne voit que les contacts, pas les citoyens qui *attendent* |
| SLA / temps d'attente visible | ❌ | Aucun signal d'urgence |
| Fiche 360° citoyen inline | ❌ | Oblige à quitter le chat pour aller dans iContact |
| Notes privées sur la conversation | ❌ | Perte d'info entre agents |
| Transfert vers collègue + contexte | ❌ partiel | Existe en Convex mais UI enfouie |
| Réponses rapides / macros | ❌ | Retape les mêmes phrases |
| Annexion de documents (iDocument) | ❌ | Copier-coller lien pénible |
| Création de demande depuis chat | ❌ | Obligé d'ouvrir iBoîte à part |
| Statut agent (dispo/occupé/absent) | ⚠ presence seulement | Pas d'auto-pause sur call, pas de DND |
| Vue *multi-org* (consulat + ambassade) | ✓ mais mal hiérarchisée | Confusion entre org |

### 3.2 Côté citoyen (capture 5)

- **Mr Ray épinglé** isolé en haut → perd son rôle de "point de contact humain garanti". Devrait être dans un slot dédié *"Votre agent assigné"* avec avatar plus grand + status dot.
- **État vide « Aucune conversation agent »** est correct mais manque d'orientation : que faire ? CTA manquant (« Démarrer une demande », « Prendre RDV »).
- **3 tabs iChat/iAppel/iContact** suffisent mais leur rôle n'est pas évident — besoin d'une ligne de sous-titre sous chaque icône au premier usage (onboarding).
- Pas de **historique de conversation** (search, reprise 48h, exports).

### 3.3 Côté backoffice (configuration)

- `IAstedSection.tsx` expose ~9 mutations Convex (persona, prompt, availability, escalation, tools, languages, quotas) **mais sans preview runtime**.
- Aucune **séparation claire** entre :
  1. Config **organisation** (horaires, tone, langues)
  2. Config **citoyen-facing** (CTAs permis, modèles de réponse rapide)
  3. Config **agent-facing** (macros, routing, SLA, permissions)
- Pas de **test drive** (chat sandbox) pour valider le prompt avant push.
- Pas de **versioning / changelog** (si un superadmin casse le prompt, personne ne le sait).
- Pas de **feature flags** par org (ex : "autoriser transfert vers ambassade", "activer suggestions IA sur iChat").

---

## 4. Modèle d'animation de référence — CircleMenu

Le `circle-menu.tsx` est exceptionnellement bien conçu. **Il doit devenir le contrat d'animation du module dans les 3 apps**, avec adaptation du **contenu** (items) selon le contexte.

### 4.1 Primitives à cloner dans un `packages/iasted`

```ts
// Constants — figées, DS-level
const CIRCLE_MENU = {
  itemSize: 48,          // px
  containerSize: 250,    // px (mobile : 220, desktop : 280 via props)
  openStagger: 0.05,     // s entre items à l'ouverture
  closeStagger: 0.12,    // s entre items à la fermeture
  shakeDuration: 0.15,   // s oscillation trigger
  springItems: { type: "spring", stiffness: 180, damping: 22 },
  springTrigger: { type: "spring", stiffness: 200, damping: 18 },
  orbitDuration: (n: number) => 0.12 * (n + 2),  // s
} as const;
```

### 4.2 Séquence OPEN (à respecter identique)

1. Trigger grow `itemSize → maxScale` (backInOut, 250ms)
2. Pause 150ms
3. Shake + shrink vers `itemSize` (spring)
4. Pause 250ms
5. Orbit spin +360° + blur 1px pendant déploiement items (`itemSize × (n+2)` staggers)
6. `setIsOpen(true)` → items s'écartent en étoile (spring 180/22)
7. Trigger finit en `itemSize × 2` (spring 200/18)

### 4.3 Séquence CLOSE

Exact miroir. Les items rentrent d'abord, orbit -360°, shake + grow trigger, settle.

### 4.4 Adaptation par contexte

| Contexte | Items (4) | Accent trigger |
|----------|-----------|----------------|
| **Citizen** (actuel) | Mr Ray (rose), iChat (emerald), iAppel (gabon-blue), iContact (amber) | `bg-foreground` (achromatique) |
| **Agent** (à créer) | File d'attente (primary), iChat équipe (emerald), iAppel (primary), Notes (amber) | `bg-primary` (#0072B9) |
| **Backoffice** (à créer) | Preview (primary), Logs (foreground/8), Test drive (emerald), Versions (amber) | `bg-foreground` |

**Règle d'or :** le trigger reste **achromatique ou primary** ; seuls les items portent un accent de couleur, et **toujours en cercle plein** (pas en fond de carte ensuite).

---

## 5. Architecture cible — `packages/iasted`

```
packages/iasted/
├── src/
│   ├── components/
│   │   ├── circle-menu/           # Le CircleMenu (copié de citizen)
│   │   ├── window/
│   │   │   ├── iasted-window.tsx           # Shell universel
│   │   │   ├── iasted-window-header.tsx    # Header achromatique DS v3
│   │   │   ├── iasted-tab-nav.tsx          # Nav bas standardisée
│   │   │   └── iasted-empty-state.tsx
│   │   ├── chat/
│   │   │   ├── message-bubble.tsx
│   │   │   ├── message-list.tsx
│   │   │   └── message-composer.tsx
│   │   ├── contacts/
│   │   │   ├── contact-list.tsx
│   │   │   └── contact-item.tsx            # Ligne dense DS v3
│   │   └── primitives/
│   │       ├── tab-indicator.tsx           # layoutId shared
│   │       └── status-dot.tsx
│   ├── hooks/
│   │   ├── use-iasted-window.ts            # open/close/tab state
│   │   ├── use-iasted-presence.ts
│   │   └── use-iasted-intent.ts            # Intent processor unifié
│   ├── tokens/
│   │   ├── animation.ts                    # Constants du point 4.1
│   │   └── sizes.ts                        # 420×640 mobile, etc.
│   └── types/
│       └── iasted.ts
├── package.json                            # peerDeps: react, motion/react, convex
└── README.md
```

**3 presets exportés** qui composent les primitives :

```tsx
// apps/citizen-web
<IAstedWindow preset="citizen" tabs={["iChat", "iAppel", "iContact"]} />

// apps/agent-web
<IAstedWindow preset="agent" tabs={["queue", "iChat", "iContact", "iAppel", "iReunion", "settings"]} />

// apps/backoffice-web
<IAstedWindow preset="backoffice" tabs={["preview", "config", "logs", "versions"]} />
```

---

## 6. Recommandations par app

### 6.1 Agent-Web — Transformer en **cockpit agent**

#### 6.1.1 Header DS-aligned (remplacer le `bg-emerald-600`)

```tsx
// AVANT
<header className="bg-emerald-600 text-white p-4 flex items-center">
  <Bot className="h-8 w-8 text-white" />
  <div>
    <h2 className="font-bold text-white">iAsted</h2>
    <p className="text-emerald-100 text-xs">Administration</p>
  </div>
</header>

// APRÈS (DS v3)
<header className="bg-[#F4F3ED] dark:bg-[#171616] p-3 flex items-center gap-3 border-b border-foreground/5">
  <div className="h-9 w-9 rounded-xl bg-foreground/8 dark:bg-foreground/5 flex items-center justify-center shrink-0">
    <Bot className="h-4 w-4 text-foreground" />
  </div>
  <div className="min-w-0 flex-1">
    <h2 className="text-sm font-bold text-foreground truncate">iAsted</h2>
    <p className="text-xs font-medium text-muted-foreground truncate">{orgName}</p>
  </div>
  <StatusDot status={agentStatus} />
</header>
```

#### 6.1.2 Nouveau tab « File d'attente » (priority #1)

Remplacer "Tous / Équipe / Réseau / Citoyens" par une segmentation **métier** :

| Tab | Contenu |
|-----|---------|
| **File** (nouveau) | Citoyens en attente d'agent, triés par SLA restant. Badge rouge si `< 2 min`. Pull-to-refresh. |
| **iChat** | Conversations actives multi-onglets (comme Slack DMs) + bouton « + nouveau » |
| **iContact** | Annuaire (actuel), garde ses 4 sous-tabs Tous/Équipe/Réseau/Citoyens |
| **iAppel** | Historique appels + FAB pour composer |
| **iRéunion** | Calendrier mini + rooms en cours |

#### 6.1.3 Panneau latéral « Fiche citoyen 360° »

Quand l'agent ouvre une conversation citoyen, un **drawer latéral droit** (slide-in 320px) affiche :

- Avatar + nom + matricule mono
- Dernières 3 demandes (lien iBoîte)
- Documents liés (lien iDocument)
- Notes privées (textarea inline, auto-save)
- Actions rapides : « Créer demande », « Planifier RDV », « Transférer »

Animation : `motion.aside` `initial={{ x: "100%" }} animate={{ x: 0 }}` avec spring 320/28 (même que window).

#### 6.1.4 Macros / Réponses rapides

Bouton `/` dans le composer ouvre un menu avec :
- 5 réponses les plus utilisées (learned)
- Variables `{prenom}`, `{ville}`, `{service}` substituées depuis la fiche citoyen
- Raccourci clavier `Cmd+K` pour ouvrir la commande

#### 6.1.5 Agent status control

Remplacer la simple présence par un menu :
- 🟢 **Disponible** (default)
- 🟡 **Occupé** (auto si call en cours)
- 🔵 **En réunion**
- 🔴 **Ne pas déranger** (pas de routage file d'attente)
- ⚫ **Absent** (set offline)

### 6.2 Citizen-Web — Renforcer la **lisibilité**

#### 6.2.1 Mr Ray reprend son rôle (capture 5 mobile)

```tsx
// AVANT : Mr Ray épinglé perdu en haut de liste
<div className="border-b p-4"><MrRayPin /></div>

// APRÈS : slot hero "Votre agent assigné"
<FlatCard className="shrink-0">
  <div className="p-3 flex items-center gap-3">
    <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center relative">
      <Headphones className="h-5 w-5 text-primary" />
      <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full bg-green-500 border-2 border-card" />
    </div>
    <div className="min-w-0 flex-1">
      <p className="text-[10px] font-extrabold uppercase tracking-widest text-muted-foreground/70">Votre agent</p>
      <p className="text-sm font-bold text-foreground">Mr Ray · Standard</p>
      <p className="text-xs font-medium text-muted-foreground">Disponible · répond en ~2 min</p>
    </div>
    <Button className="h-8 rounded-lg bg-primary text-white text-xs font-medium px-3 active:scale-[0.97]">
      Parler
    </Button>
  </div>
</FlatCard>
```

#### 6.2.2 État vide **orienté action**

```tsx
<EmptyState
  icon={<MessageSquarePlus className="h-8 w-8 text-muted-foreground" />}
  title="Commençons votre démarche"
  description="Posez une question à iAsted, ou demandez à parler à un agent humain."
  action={
    <div className="flex gap-2">
      <Button className="...primary">Démarrer une demande</Button>
      <Button variant="ghost">Prendre RDV</Button>
    </div>
  }
/>
```

#### 6.2.3 Historique + recherche conversation

- Tab secondaire dans iChat : "En cours" | "Passées" (15j)
- Barre de recherche globale (toutes conversations, tous tabs) — `Cmd+F` / icône loupe header.

### 6.3 Backoffice-Web — Configurer **proprement**

#### 6.3.1 Restructurer `IAstedSection` en 4 panneaux

```
┌─────────────────────────────────────────────┐
│  ⚙️ Configuration iAsted                     │
├─────────────────────────────────────────────┤
│  [Persona] [Disponibilité] [Outils] [Tests] │
├─────────────────────────────────────────────┤
│                                             │
│  Panneau actif                              │
│  + Preview live (iframe sandbox)            │
│                                             │
└─────────────────────────────────────────────┘
```

| Panneau | Sous-sections |
|---------|---------------|
| **Persona** | Nom, avatar, tone, prompt système (diff visible), langues, longueur réponse |
| **Disponibilité** | Horaires, fériés, routage hors-horaires, SLA (timeout handoff) |
| **Outils** | Whitelist tools (iDocument, iBoîte, etc.), quotas, modèle IA, budget tokens |
| **Tests** | **Sandbox chat** (preview runtime), replay sur conversation historique, A/B tests |

#### 6.3.2 Versioning + audit trail

Chaque update de prompt → entrée dans `convex/logs/iastedConfigVersions` avec :
- `_id`, `orgId`, `updatedBy`, `updatedAt`
- `diff` (avant / après en unified diff)
- `reason` (champ obligatoire > 10 caractères)
- bouton **Restaurer** sur chaque ligne.

#### 6.3.3 Feature flags visuels

```tsx
<FeatureFlagToggle
  flag="iasted.agent_transfer_cross_org"
  label="Autoriser le transfert inter-organisations"
  description="Un agent du consulat peut transférer un citoyen vers l'ambassade"
  status="beta"
/>
```

Stockage : `convex/featureFlags` par `orgId` ; lecture côté agent-web via hook `useFeatureFlag()`.

---

## 7. Plan de migration

> Durée estimée : **5 semaines** à 2 devs, parallélisable partiellement.

### Phase 1 — Fondation (Semaine 1-2) · P0

1. **Créer `packages/iasted`** + extraction CircleMenu depuis citizen-web.
2. **Extraire animation tokens** (`tokens/animation.ts`).
3. **Wrappers DS v3** : `IAstedWindow`, `IAstedWindowHeader`, `IAstedTabNav`, `StatusDot`.
4. **Tests visuels** Playwright (capture 3 apps, compare pixel) — introduire seulement si snapshot tests déjà présents.

### Phase 2 — Migration Citizen (Semaine 2-3) · P1

1. Remplacer `CitizenIAstedWindow` par `<IAstedWindow preset="citizen">`.
2. Ajouter slot "Mr Ray hero" et empty state orienté action.
3. Ajouter historique + recherche.
4. **Critère de sortie** : aucune régression, 100% des tests e2e verts sur `apps/citizen-web`.

### Phase 3 — Migration Agent (Semaine 3-4) · P1

1. Remplacer `IAstedWindow` agent par le preset.
2. Ajouter tab **File d'attente** (nouveau, avec hooks Convex pour pending citoyens).
3. Ajouter **drawer fiche citoyen 360°**.
4. Ajouter **macros + agent status control**.
5. Smoke test : 1 agent réel + 1 citoyen → conversation bout-en-bout.

### Phase 4 — Backoffice (Semaine 4-5) · P2

1. Restructurer `IAstedSection` en 4 panneaux.
2. Sandbox preview (iframe vers agent-web avec `?previewConfig=<id>`).
3. Versioning + audit trail.
4. Feature flags.

### Phase 5 — Cleanup (Semaine 5) · P2

1. Supprimer les composants dupliqués dans les 3 apps.
2. Mettre à jour `DESIGN_CHARTER.md` + `CITIZEN_DESIGN_SYSTEM_V3.md` avec la section iAsted canonique.
3. Exporter Storybook du `packages/iasted` (référence vivante).

---

## 8. Livrables attendus

- `packages/iasted/` fonctionnel et publié en workspace (alias `@workspace/iasted`).
- Section dédiée dans `DESIGN_CHARTER.md` : "§17 Module iAsted — contrat d'interface".
- Storybook local (ou MDX) couvrant : CircleMenu, IAstedWindow (3 presets), MessageBubble, ContactItem, AgentStatusMenu.
- Checklist PR pour toute évolution iAsted : mentionne obligatoirement `DS v3`, `no new hardcoded color`, `tests e2e`.

---

## 9. Risques & mitigations

| Risque | Probabilité | Impact | Mitigation |
|--------|-------------|--------|------------|
| Régression Convex (presence, heartbeat) lors du refactor | Moyen | Fort | Garder les hooks Convex *inchangés* ; le refactor est UI-only en phase 1-3 |
| Divergence avec `consulat.ga` (autre projet) | Faible | Moyen | Notifier équipe consulat.ga ; envisager un `@okatech/iasted` ultérieurement |
| Casse de l'animation CircleMenu si framer-motion upgrade | Moyen | Moyen | Pin `motion/react` à la version actuelle dans `packages/iasted` ; tests visuels pour détecter |
| Features flags mal utilisés → utilisateurs voient du code incomplet | Moyen | Moyen | Convention : tout flag défaut=false + test e2e sur `flag=true` |
| Sandbox preview backoffice expose des données réelles | Élevé | Fort | Isolation par `orgId` + banner "MODE TEST" rouge + fakes citoyens |

---

## 10. Questions ouvertes pour décision

1. **Naming du package** : `@workspace/iasted` ou `@workspace/chat-agent` (ce dernier permet usage au-delà du contexte diplomatique) ?
2. **Orchestration multi-agent** : veut-on que le citoyen puisse voir *plusieurs agents* en parallèle (Mr Ray standard + expert visa) ? Affecte le modèle de donnée.
3. **Offline-first** : le cache IndexedDB des 50 dernières conversations citoyen est-il dans ce scope ou dans un futur sprint PWA ?
4. **Accessibilité** : l'animation CircleMenu viole-t-elle `prefers-reduced-motion` ? Actuellement non geré — ajouter un fallback statique.
5. **Desktop app agent** (il existe `apps/agent-desktop`) : doit-on étendre le packages/iasted au desktop electron ou le laisser dériver ?

---

## Annexe A — Mapping Tailwind → DS v3 tokens

| Avant (violation) | Après (DS v3) |
|------------------|---------------|
| `bg-emerald-600` | `bg-primary` ou `bg-foreground/8` selon rôle |
| `bg-emerald-500/10` (badge success) | `bg-emerald-500/15 dark:bg-emerald-500/20` |
| `text-emerald-400` (active tab) | `text-emerald-600 dark:text-emerald-400` |
| `bg-blue-500` (pill active) | `bg-primary text-primary-foreground` |
| `bg-white` | `bg-card` (= `#F4F3ED` light / `#171616` dark) |
| `rounded-2xl` sur FlatCard | `rounded-xl` |
| `shadow-lg` sur FAB | ❌ supprimé — différenciation par luminosité S2 |
| `border border-gray-200` | `border-foreground/5` |
| `bg-emerald-600` header | `bg-card` + icône box `bg-foreground/8` |

## Annexe B — Paramètres animation à inscrire dans `packages/iasted/tokens/animation.ts`

```ts
export const IASTED_ANIMATION = {
  window: {
    initial: { opacity: 0, y: "100%" },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: "100%" },
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  tabIndicator: {
    layoutId: "iasted-tab-indicator",
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  drawer: { // Fiche citoyen 360°
    initial: { x: "100%" },
    animate: { x: 0 },
    exit: { x: "100%" },
    transition: { type: "spring", stiffness: 320, damping: 28 },
  },
  circleMenu: {
    itemSize: 48,
    containerSize: 250,
    openStagger: 0.05,
    closeStagger: 0.12,
    shakeDuration: 0.15,
    springItems: { type: "spring", stiffness: 180, damping: 22 },
    springTrigger: { type: "spring", stiffness: 200, damping: 18 },
  },
  message: { // Bubble entrance
    initial: { opacity: 0, y: 8, scale: 0.96 },
    animate: { opacity: 1, y: 0, scale: 1 },
    transition: { type: "spring", stiffness: 400, damping: 30 },
  },
  reducedMotion: { // prefers-reduced-motion fallback
    transition: { duration: 0 },
  },
} as const;
```

---

**Prochaine étape proposée** : validation de ce rapport par le PO, puis kick-off Phase 1 (création `packages/iasted`, extraction CircleMenu, tokens animation). Je peux enchaîner immédiatement sur la Phase 1 si tu valides le plan.
