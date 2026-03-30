---
name: i18n-translations
description: "🌍 Expert i18n. S'active automatiquement pour les projets multilingues (consulat.ga, idetude.ga). Couvre i18next et react-i18next."
---

# 🌍 Skill : i18n Expert

## Auto-Activation
- Fichier dans `locales/` ou import `useTranslation`
- Mots-clés : traduction, langue, i18n, multilingue
- Projets : `consulat.ga`, `idetude.ga`

## Règle CRITIQUE
```tsx
// ❌ JAMAIS de fallback
t("common.save", "Sauvegarder")

// ✅ Clé seule
t("common.save")
```

## Structure
```
src/locales/
├── fr/common.json
├── en/common.json
└── es/common.json
```

## Usage
```tsx
import { useTranslation } from "react-i18next";

function Form() {
  const { t } = useTranslation();
  return <Button>{t("common.save")}</Button>;
}
```
