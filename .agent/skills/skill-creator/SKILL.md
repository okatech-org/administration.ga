# SKILL-CREATOR — Expert en création et amélioration de skills

**name:** skill-creator
**description:** Expert en création et amélioration de skills — drafting, évaluation, benchmarking, optimisation de descriptions pour meilleur triggering. S'activate pour: skill, create skill, improve skill, eval, benchmark, optimize skill description.

## Vue d'ensemble

Les skills sont des unités de savoir-faire réutilisables qui activent automatiquement Claude pour des tâches spécifiques. Cette skill couvre le processus complet de création, test, évaluation et optimisation des skills.

## Qu'est-ce qu'une skill?

Une skill est:
- Un fichier `SKILL.md` avec métadonnées + contenu
- Activée automatiquement quand certains mots-clés sont détectés
- Autonome et réutilisable à travers plusieurs sessions
- Optimisée pour un domaine ou pattern spécifique

Structure:
```markdown
# [Titre]

**name:** kebab-case-name
**description:** Déscription auto-activante (60-100 mots)

## Vue d'ensemble
[Explication du domaine]

## Installation / Prérequis
[Outils et dépendances]

## Contenus principaux
[Patrons, codes, best practices]

## Anti-patterns
[Ce qu'il NE FAUT PAS faire]

## Ressources
[Liens et références]
```

## Workflow de création

### Phase 1: Capture de l'intent

Poser les questions clés:
1. **Domaine** : Quel problème cette skill résout-elle?
2. **Audience** : Qui va l'utiliser?
3. **Déclencheurs** : Quels mots-clés doivent l'activer?
4. **Objectif** : Quel résultat le user attend?
5. **Scope** : Quels sont les cas d'usage principaux vs edge cases?

### Phase 2: Drafting du SKILL.md

```markdown
# [Skill Title]

**name:** skill-name
**description:** [Description claire et axée sur l'activation automatique]

## Vue d'ensemble
[1-2 paragraphes sur le domaine et son importance]

## Installation / Prérequis
[Dépendances, outils, configuration requise]

## Contenus principaux
[Sections thématiques avec exemples de code]
- Concept 1 avec exemple
- Concept 2 avec exemple
- Concept 3 avec exemple

## Patterns avancés
[Cas d'usage plus complexes]

## Anti-patterns
[Erreurs courantes avec ❌ MAUVAIS et ✅ BON]

## Ressources
[Liens vers documentation officielle]
```

### Phase 3: Écriture des cas de test

Créer un fichier `test-cases.json`:

```json
{
  "skill_name": "auth-patterns",
  "test_cases": [
    {
      "id": "test_1",
      "description": "Créer un middleware d'authentification JWT",
      "user_query": "Comment créer un middleware JWT secure avec Express?",
      "should_trigger": true,
      "expected_output_pattern": "JWT.*Express.*middleware|Bearer.*token",
      "success_criteria": [
        "Inclut la vérification du secret",
        "Gère les erreurs d'expiration",
        "Valide le format du token"
      ]
    },
    {
      "id": "test_2",
      "description": "Configuration OAuth2",
      "user_query": "Setup OAuth2 flow avec Google",
      "should_trigger": true,
      "expected_output_pattern": "OAuth2|authorization_code|code_exchange",
      "success_criteria": [
        "Explique les 3 étapes du flow",
        "Fournit des codes d'exemple",
        "Inclut la gestion des erreurs"
      ]
    },
    {
      "id": "test_3",
      "description": "Question non-pertinente",
      "user_query": "Comment faire un gâteau au chocolat?",
      "should_trigger": false,
      "expected_output_pattern": "",
      "success_criteria": [
        "N'active pas la skill",
        "Traite comme question générale"
      ]
    }
  ]
}
```

### Phase 4: Test avec avec/sans skill

Exécuter chaque cas de test dans deux contextes:

**Context A: SANS la skill**
```
User: "Comment créer un middleware JWT secure?"
Claude (baseline): [Répond de manière générique]
```

**Context B: AVEC la skill**
```
User: "Comment créer un middleware JWT secure?"
Claude (with skill): [Répond avec patterns spécifiques, exemples détaillés, best practices]
```

Comparer:
- Longueur de la réponse
- Profondeur technique
- Nombre d'exemples
- Couverture des cas d'erreur
- Score de pertinence (1-10)

### Phase 5: Benchmarking avec variance

Exécuter 3 fois chaque test et calculer:

```python
import json
from statistics import mean, stdev

def benchmark_skill(test_case, with_skill=True):
    results = []
    for run in range(3):
        score = evaluate_response(
            user_query=test_case["user_query"],
            with_skill=with_skill,
            criteria=test_case["success_criteria"]
        )
        results.append(score)

    return {
        "mean": mean(results),
        "stdev": stdev(results) if len(results) > 1 else 0,
        "min": min(results),
        "max": max(results),
        "runs": results
    }

# Comparer
baseline = benchmark_skill(test_case, with_skill=False)
with_skill = benchmark_skill(test_case, with_skill=True)

improvement = (
    (with_skill["mean"] - baseline["mean"]) / baseline["mean"]
) * 100

print(f"Improvement: {improvement:.1f}%")
print(f"Baseline: {baseline['mean']:.2f} ± {baseline['stdev']:.2f}")
print(f"With skill: {with_skill['mean']:.2f} ± {with_skill['stdev']:.2f}")
```

### Phase 6: Optimisation de la description

La **description** détermine l'activation automatique. L'optimiser est critique.

**Mauvaise description** (trop générique):
```
description: "Expert en patterns de programmation"
```
Problème: Trop vague, va s'activer pour n'importe quelle question sur les patterns.

**Bonne description** (spécifique + déclencheurs clairs):
```
description: "Expert en patterns d'authentification — JWT, OAuth2, Clerk, Better Auth, sessions. S'active pour: auth, login, token, session, permission, RBAC, middleware, security."
```

Points clés:
1. Commencer par le domaine spécifique
2. Lister les technologies/frameworks principaux
3. Inclure 6-8 mots-clés de déclenchement
4. Éviter les mots génériques (pattern, code, expert)
5. Être concis (sous 150 caractères pour meilleures pratiques)

### Phase 7: Structuration finale et packaging

Structure du répertoire:
```
skills/
  skill-name/
    SKILL.md           # Contenu principal
    test-cases.json    # (Optionnel) Cas de test
    references/        # (Optionnel) Documentation externe
      url-1.md
      url-2.md
    scripts/           # (Optionnel) Utilitaires
      setup.sh
      validate.py
    agents/            # (Optionnel) Sous-agents
      reviewer.md
```

## Exemples de skills existantes

### Exemple 1: convex-backend (haute complexité)

**Déclencheurs**: schema, mutation, query, table, index, validator
**Contenu**: 15+ sections avec patterns avancés, schemas complexes
**Test cases**: 8+ tests
**Improvement**: +75% de précision vs baseline

### Exemple 2: react-vite-spa (moyenne complexité)

**Déclencheurs**: Vite, React, page, route, composant
**Contenu**: 8-10 sections avec examples
**Test cases**: 5+ tests
**Improvement**: +45% de précision vs baseline

### Exemple 3: docx (spécialisée)

**Déclencheurs**: .docx, Word, rapport, lettre, template
**Contenu**: 10+ sections avec code spécifique
**Test cases**: 6+ tests
**Improvement**: +60% de pertinence vs baseline

## Evaluation méthodologie

### Critères de succès d'une skill

1. **Activation correcte** (>90% accuracy)
   - S'active pour les bonnes requêtes
   - Ne s'active pas pour les mauvaises

2. **Amélioration de qualité** (>30% improvement)
   - Réponses plus détaillées
   - Meilleurs exemples
   - Plus de considérations edge cases

3. **Couverture** (80%+ des cas d'usage)
   - Couvre les use cases principaux
   - Gère les variantes raisonnables
   - Documente les limitations

4. **Maintenabilité** (< 50 secondes à lire)
   - Structure claire
   - Sections bien délimitées
   - Code facile à scanner

### Scoring

```
Score = (Activation × 0.25) + (Quality × 0.4) + (Coverage × 0.2) + (Maintainability × 0.15)

Où chaque composant est noté 0-10
```

## Amélioration itérative

### Cycle de feedback

1. **Créer** version 1.0
2. **Tester** avec 5-10 cas réels
3. **Collecter feedback** sur:
   - Activation (false positives/negatives)
   - Qualité de contenu
   - Lacunes identifiées
4. **Optimiser**:
   - Ajouter sections manquantes
   - Améliorer la description
   - Affiner les exemples
5. **Re-tester** et mesurer l'impact
6. **Itérer** jusqu'à target de qualité

### Version management

Utiliser le numérotation sémantique:
- v1.0: Version initiale
- v1.1: Petits ajustements
- v1.5: Contenu additionnel
- v2.0: Refonte majeure

```markdown
# [Skill Title]

**name:** skill-name
**version:** 1.2
**last_updated:** 2026-03-30
**maintainer:** Claude
```

## Anti-patterns en création de skills

❌ **NE PAS** créer une skill trop générique:
```
name: programming-patterns
description: Expert en patterns de programmation
```
Problème: Activée pour TOUTE question de code.

✅ **FAIRE** être spécifique:
```
name: actor-concurrency
description: Expert en patterns Acteur (Akka, Erlang) et concurrence distribuée.
```

❌ **NE PAS** créer une skill sans exemples de code:
```
## Concepts
Utilisez les guards pour contrôler les transitions...
```

✅ **FAIRE** inclure code exécutable:
```
## Concepts
Utilisez les guards:
\`\`\`typescript
type Guard = (state, event) => boolean;
const guard: Guard = (state, event) => state.value === 'idle';
\`\`\`
```

❌ **NE PAS** oublier les anti-patterns:
```
# Skill complete without anti-patterns section
```

✅ **FAIRE** montrer les erreurs courantes:
```
❌ MAUVAIS: const x = new Array(size).fill(null)
✅ BON: const x = Array.from({ length: size })
```

## Optimisation des descriptions

Formule de base:
```
{Domaine spécifique} — {Technos principales}. S'activate pour: {kw1}, {kw2}, {kw3}...
```

Exemples:

```
"Expert en patterns d'authentification — JWT, OAuth2, Clerk, Better Auth, NextAuth. S'active pour: auth, login, token, session, permission, middleware."

"Expert en création PDF — extraction, fusion, OCR, formulaires. S'active pour: .pdf, PDF, rapport, extraction, merge, OCR."

"Expert en modèles financiers Excel — formules, formatage, validation. S'active pour: .xlsx, Excel, modèle, formule, tableau, calcul financier."
```

Points de vérification:
1. Commence par le domaine?
2. Listet 3-5 technos/frameworks?
3. Inclut 6-8 mots-clés?
4. Sous 120 caractères?
5. Évite les mots génériques (code, pattern, expert)?

## Resources pour créateurs

### Documentation
- Conventions OkaTech: `/mnt/SKILLS/CLAUDE.md`
- Skill existantes: `/mnt/okatech-projects/.agent/skills/`
- Format Markdown: Utiliser le guide de style project

### Outils
- Test runner: `npm run test-skill`
- Validator: `npm run validate-skill`
- Benchmark: `npm run benchmark-skill`

### Support
- Voir `/mnt/SKILLS/CLAUDE.md` pour patterns critiques OkaTech
- Consulter les skills existantes pour les structures éprouvées

## Template de création rapide

```markdown
# [Skill Title]

**name:** [kebab-case]
**description:** Expert en [domaine spécifique] — [tech 1], [tech 2]. S'active pour: [kw1], [kw2], [kw3], [kw4], [kw5], [kw6].

## Vue d'ensemble

[2-3 paragraphes sur l'importance du domaine]

## Installation

\`\`\`bash
npm install [dependencies]
pip install [dependencies]
\`\`\`

## Concept 1: [Titre]

### Explanation
[Explication]

### Code example
\`\`\`[lang]
[code]
\`\`\`

## Concept 2: [Titre]

[Même structure]

## Anti-patterns

❌ MAUVAIS: [code]

✅ BON: [code]

## Ressources

- [Link 1]
- [Link 2]
```

## Ressources

- [OkaTech CLAUDE.md](/mnt/SKILLS/CLAUDE.md)
- [Skill Registry](/.agent/skills/)
- [Markdown Guide](https://www.markdownguide.org/)
