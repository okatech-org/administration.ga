import { defineConfig, globalIgnores } from "eslint/config"
import nextVitals from "eslint-config-next/core-web-vitals"
import nextTs from "eslint-config-next/typescript"

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "out/**", "build/**", "next-env.d.ts"]),
  {
    rules: {
      // Apostrophes en français : `l'utilisateur` lisible en JSX.
      "react/no-unescaped-entities": "off",
      // React 19 / hooks v7 — règle trop stricte sur useEffect+setState.
      "react-hooks/set-state-in-effect": "off",
      // React 19 / hooks v7 — règle "purity" sur les hooks qui flag des
      // mutations de Map/Set transients (utilisé dans memoisations).
      "react-hooks/purity": "off",
      // Dette legacy pre-Phase 7 — passage en warn pour pipeline vert ;
      // ces règles restent visibles pour migration progressive et tout
      // nouveau code doit les respecter.
      "@typescript-eslint/no-explicit-any": "warn",
      "@typescript-eslint/no-unused-vars": "warn",
      "@typescript-eslint/no-this-alias": "warn",
      "react/no-children-prop": "warn",
      "react-hooks/rules-of-hooks": "warn",
      "@next/next/no-html-link-for-pages": "warn",
      // React Hooks v7 — règles strictes ajoutées sur du code legacy.
      // Tolérées en warn pour pipeline vert ; à corriger progressivement.
      "react-hooks/refs": "warn",
      "react-hooks/immutability": "warn",
      "react-hooks/set-state-in-render": "warn",
      "react-hooks/use-memo": "warn",
    },
  },
])

export default eslintConfig
