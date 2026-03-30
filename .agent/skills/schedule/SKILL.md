# SCHEDULE — Expert en tâches planifiées

**name:** schedule
**description:** Expert en tâches planifiées — création de tâches récurrentes, ponctuelles ou ad-hoc avec cron expressions. S'activate pour: schedule, tâche, planifier, cron, recurring, automatiser, daily, weekly, monthly.

## Vue d'ensemble

Les tâches planifiées permettent d'exécuter du code ou des prompts de manière automatique et fiable. Cette skill couvre la création et la gestion de tâches avec trois modes: récurrentes (cron), ponctuelles (fireAt), et ad-hoc (manuelles).

## Concepts clés

Les tâches planifiées s'exécutent dans des sessions séparées et autonomes. Chaque tâche:
- Stockée en tant que fichier skill (`{taskId}/SKILL.md`)
- Exécutée dans un contexte isolé
- Notifie l'utilisateur à la fin (optionnel)
- Peut être activée/désactivée sans suppression

## Mode 1: Tâches récurrentes (cronExpression)

Les tâches récurrentes utilisent des expressions cron au format 5 champs:
```
minute heure jour_mois mois jour_semaine
```

Évaluation en **heure locale** (pas UTC).

### Exemples courants

```
0 9 * * *       # Tous les jours à 9h00 (heure locale)
0 9 * * 1-5     # Lundi-vendredi à 9h00
30 8 * * 1      # Tous les lundis à 8h30
0 0 1 * *       # 1er du mois à minuit
0 12 * * 0      # Tous les dimanche à midi
0 0 * * *       # Minuit tous les jours
```

### Créer une tâche quotidienne

```bash
# Via l'API (exemple Node.js)
const { createScheduledTask } = require('./scheduler');

await createScheduledTask({
  taskId: 'daily-report',
  description: 'Rapport quotidien des ventes',
  prompt: `Analyse les ventes du jour et génère un rapport:
1. Chiffre d'affaires total
2. Top 5 produits
3. Anomalies ou pics
4. Recommandations

Formatte le rapport en Markdown.`,
  cronExpression: '0 9 * * *',  // 9h00 chaque jour
  notifyOnCompletion: true,
});
```

Avec l'outil `create_scheduled_task`:

```typescript
await createScheduledTask({
  taskId: 'daily-report',
  description: 'Rapport quotidien des ventes',
  prompt: `Analyse les ventes du jour et génère un rapport...`,
  cronExpression: '0 9 * * *',
  notifyOnCompletion: true,
});
```

### Créer une tâche hebdomadaire

```typescript
await createScheduledTask({
  taskId: 'weekly-team-check-in',
  description: 'Vérification hebdomadaire de l\'équipe',
  prompt: `Effectue une revue de l'état de l'équipe:
1. Tâches complétées cette semaine
2. Obstacles et blocages
3. Priorités pour la semaine prochaine
4. Bien-être et satisfaction

Fournis un résumé exécutif.`,
  cronExpression: '0 10 * * 1',  // Lundi à 10h00
  notifyOnCompletion: true,
});
```

### Créer une tâche mensuelle

```typescript
await createScheduledTask({
  taskId: 'monthly-audit',
  description: 'Audit mensuel de conformité',
  prompt: `Effectue un audit mensuel:
1. Vérification des accès utilisateurs
2. Logs de sécurité (erreurs/incidents)
3. Mises à jour de dépendances disponibles
4. Espace de stockage utilisé
5. Générer un rapport au format HTML`,
  cronExpression: '0 8 1 * *',  // 1er du mois à 8h00
  notifyOnCompletion: true,
});
```

## Mode 2: Tâches ponctuelles (fireAt)

Les tâches ponctuelles s'exécutent une seule fois à une heure spécifique, puis se désactivent automatiquement.

Format ISO 8601 avec décalage de fuseau horaire:
```
2026-03-05T14:30:00-08:00
```

### Créer une rappel dans 5 minutes

```typescript
// Calculer le timestamp du futur
const futureTime = new Date(Date.now() + 5 * 60 * 1000);
const isoString = futureTime.toISOString().slice(0, -1) +
  new Date().toString().match(/[-+]\d{2}:\d{2}/)[0];

await createScheduledTask({
  taskId: 'urgent-reminder',
  description: 'Rappel urgent',
  prompt: `Rappel: La réunion commence dans 5 minutes!`,
  fireAt: isoString,
  notifyOnCompletion: false,
});
```

### Créer une tâche pour demain

```typescript
const tomorrow = new Date();
tomorrow.setDate(tomorrow.getDate() + 1);
tomorrow.setHours(9, 0, 0, 0);

const isoString = tomorrow.toISOString().slice(0, -1) +
  new Date().toString().match(/[-+]\d{2}:\d{2}/)[0];

await createScheduledTask({
  taskId: 'tomorrow-standup',
  description: 'Standup de demain matin',
  prompt: `Prépare le standup de demain:
1. Récapitule les accomplissements d'aujourd'hui
2. Identifie les obstacles potentiels
3. Prépare les sujets de discussion`,
  fireAt: isoString,
  notifyOnCompletion: true,
});
```

### Créer une tâche à date/heure fixe

```typescript
// Tâche le 5 avril 2026 à 14h30 (heure locale, ex: -08:00)
await createScheduledTask({
  taskId: 'q2-planning',
  description: 'Planification Q2',
  prompt: `Initie le processus de planification Q2:
1. Revue des objectifs Q1
2. Draft des OKRs Q2
3. Allocation budgétaire
4. Planning des ressources

Prépare un document pour présentation.`,
  fireAt: '2026-04-05T14:30:00-08:00',
  notifyOnCompletion: true,
});
```

## Mode 3: Tâches ad-hoc (aucun calendrier)

Les tâches sans calendrier (pas de `cronExpression` ni `fireAt`) ne s'exécutent que manuellement via l'interface.

```typescript
await createScheduledTask({
  taskId: 'on-demand-analysis',
  description: 'Analyse à la demande',
  prompt: `Effectue une analyse complète des performances:
1. Calcule les KPIs
2. Identifie les tendances
3. Propose des optimisations
4. Évalue les risques`,
  // Pas de cronExpression ni fireAt — ad-hoc uniquement
  notifyOnCompletion: true,
});
```

## Structure d'une tâche planifiée

Les tâches sont stockées sous la forme de fichiers skill:
```
/Users/username/Documents/Claude/Scheduled/
  task-id/
    SKILL.md
```

Format du fichier SKILL.md:
```markdown
# task-id

**name:** task-id
**description:** Description brève
**schedule:** "0 9 * * *" (cron) ou "2026-03-05T14:30:00-08:00" (one-time)

## Objectif

Description détaillée de ce que doit faire la tâche.

## Résultat attendu

- Point 1
- Point 2
- Point 3

## Prompt complet

[Le prompt autonome complet...]
```

## Drafting de prompts autonomes

Un prompt pour tâche planifiée doit être **autonome** (exécuté sans contexte utilisateur additionnel):

```typescript
const prompt = `
Tu es un expert en analyse de ventes. Effectue l'analyse quotidienne:

1. **Ventes du jour**
   - Chiffre d'affaires total
   - Nombre de transactions
   - Panier moyen

2. **Top produits**
   - Les 5 meilleurs vendeurs (par volume)
   - Les 5 meilleurs (par chiffre d'affaires)

3. **Anomalies**
   - Baisse > 20% par rapport à hier
   - Pics inhabituels
   - Catégories en déclin

4. **Recommandations**
   - Actions immédiates suggérées
   - Sujets à enquêter

Format: Markdown structuré avec sections claires.
`;
```

### Points clés pour prompts autonomes

- Spécifier les données d'entrée (comment accéder aux données)
- Définir le format de sortie exactement
- Inclure des critères de succès explicites
- Ne pas supposer de contexte utilisateur
- Ajouter des instructions pour la gestion des erreurs
- Préparer les artefacts (rapports, fichiers) si nécessaire

## Gestion des tâches

### Lister les tâches existantes

```typescript
const { listScheduledTasks } = require('./scheduler');

const tasks = await listScheduledTasks();
tasks.forEach(task => {
  console.log(`${task.taskId}: ${task.description}`);
  console.log(`  Schedule: ${task.schedule}`);
  console.log(`  Next run: ${task.nextRunAt}`);
  console.log(`  Last run: ${task.lastRunAt}`);
});
```

### Mettre à jour une tâche

```typescript
const { updateScheduledTask } = require('./scheduler');

// Modifier la description
await updateScheduledTask({
  taskId: 'daily-report',
  description: 'Rapport quotidien des ventes (amélioré)',
});

// Modifier le prompt
await updateScheduledTask({
  taskId: 'daily-report',
  prompt: `Nouveau prompt avec améliorations...`,
});

// Modifier la schedule
await updateScheduledTask({
  taskId: 'daily-report',
  cronExpression: '0 10 * * *',  // Déplacer à 10h00
});

// Désactiver/réactiver
await updateScheduledTask({
  taskId: 'daily-report',
  enabled: false,  // Pause les exécutions automatiques
});

// Réactiver
await updateScheduledTask({
  taskId: 'daily-report',
  enabled: true,
});

// Modifier les notifications
await updateScheduledTask({
  taskId: 'daily-report',
  notifyOnCompletion: false,  // Arrête les notifications
});
```

## Exemples de workflows complets

### Workflow: Rapport de ventes quotidien + archivage hebdomadaire

```typescript
// Tâche 1: Rapport quotidien
await createScheduledTask({
  taskId: 'daily-sales-report',
  description: 'Rapport quotidien des ventes',
  prompt: `
Génère un rapport quotidien:
1. Chiffre d'affaires du jour
2. Top 5 produits
3. Anomalies

Sauvegarde dans: /reports/daily-{date}.md
  `,
  cronExpression: '0 18 * * *',  // 18h00 chaque jour
  notifyOnCompletion: true,
});

// Tâche 2: Archivage hebdomadaire
await createScheduledTask({
  taskId: 'weekly-archive',
  description: 'Archivage hebdomadaire des rapports',
  prompt: `
Archive les rapports quotidiens de la semaine:
1. Collecte tous les fichiers /reports/daily-*.md
2. Crée un ZIP: weekly-{year}-{week}.zip
3. Supprime les fichiers journaliers
4. Stocke le ZIP dans /archive/

Envoie un résumé.
  `,
  cronExpression: '0 19 * * 0',  // Dimanche 19h00
  notifyOnCompletion: true,
});
```

### Workflow: Backup + Vérification d'intégrité

```typescript
// Backup automatique
await createScheduledTask({
  taskId: 'nightly-backup',
  description: 'Backup nocturne des données',
  prompt: `
Effectue un backup complet:
1. Dump de la base de données
2. Export des fichiers critiques
3. Chiffrement du backup
4. Upload sur S3
5. Vérification CRC32

Notifie si erreur.
  `,
  cronExpression: '0 3 * * *',  // 3h00 du matin
  notifyOnCompletion: false,  // Sauf erreur
});

// Vérification hebdomadaire
await createScheduledTask({
  taskId: 'weekly-integrity-check',
  description: 'Vérification hebdomadaire d\'intégrité',
  prompt: `
Vérifie l'intégrité des backups:
1. Liste tous les backups S3
2. Vérifie les checksums
3. Teste une restauration partielle
4. Génère un rapport

Format: HTML avec graphiques de trendlines.
  `,
  cronExpression: '0 4 * * 1',  // Lundi 4h00
  notifyOnCompletion: true,
});
```

## Cas d'utilisation avancés

### Détection d'anomalies temps réel (pseudo-temps réel)

```typescript
// Toutes les 5 minutes
await createScheduledTask({
  taskId: 'anomaly-detector-5min',
  description: 'Détection d\'anomalies (5 min)',
  prompt: `
Détecte les anomalies des 5 dernières minutes:
1. Requêtes par endpoint (comparer à baseline)
2. Taux d'erreur > 5%
3. Latence > 500ms
4. Utilisateurs suspects

Alerte si anomalie détectée.
  `,
  cronExpression: '*/5 * * * *',  // Chaque 5 minutes
  notifyOnCompletion: false,
});
```

### Maintenance programmée

```typescript
// Maintenance hebdomadaire planifiée
await createScheduledTask({
  taskId: 'weekly-maintenance',
  description: 'Maintenance hebdomadaire',
  prompt: `
Effectue la maintenance programmée:
1. Nettoie les logs > 30 jours
2. Réindex la base de données
3. Met à jour les dépendances (patch uniquement)
4. Vérifie la santé des services
5. Génère un rapport

Notifie si problème détecté.
  `,
  cronExpression: '0 2 * * 6',  // Samedi 2h00
  notifyOnCompletion: true,
});
```

## Anti-patterns

❌ **NE PAS** créer des tâches trop fréquentes (chaque minute):
```typescript
cronExpression: '* * * * *'  // MAUVAIS — surcharge système
```

✅ **FAIRE** choisir une fréquence raisonnable:
```typescript
cronExpression: '0 9 * * *'  // BON — une fois par jour
```

❌ **NE PAS** spécifier les deux (cron ET fireAt):
```typescript
await createScheduledTask({
  cronExpression: '0 9 * * *',
  fireAt: '2026-03-05T14:30:00-08:00',  // ERREUR
});
```

✅ **FAIRE** choisir un seul mode:
```typescript
// SOIT récurrent:
await createScheduledTask({
  cronExpression: '0 9 * * *',
});

// SOIT ponctuel:
await createScheduledTask({
  fireAt: '2026-03-05T14:30:00-08:00',
});

// SOIT ad-hoc (aucun des deux)
```

❌ **NE PAS** oublier de formater correctement les ISO timestamps:
```typescript
fireAt: '2026-03-05 14:30:00'  // MAUVAIS — pas ISO 8601
```

✅ **FAIRE** utiliser le format ISO avec offset:
```typescript
fireAt: '2026-03-05T14:30:00-08:00'  // BON
```

❌ **NE PAS** laisser les prompts trop vagues:
```typescript
prompt: 'Effectue un rapport'  // MAUVAIS — insuffisant
```

✅ **FAIRE** structurer le prompt:
```typescript
prompt: `
Effectue un rapport:
1. Définir les métriques clés
2. Calculer les tendances
3. Identifier les anomalies
4. Formater en HTML
5. Envoyer par email

Critères de succès: ...
`  // BON — détaillé
```

## Ressources

- [Cron Expression Generator](https://crontab.guru/)
- [ISO 8601 Timestamp Format](https://en.wikipedia.org/wiki/ISO_8601)
- [Timezone List](https://en.wikipedia.org/wiki/List_of_tz_database_time_zones)
