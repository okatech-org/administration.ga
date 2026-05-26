import nextCoreWebVitals from "eslint-config-next/core-web-vitals";
import nextTypescript from "eslint-config-next/typescript";

/**
 * Flat config ESLint pour travail-ga.
 *
 * Pattern recommandé Next.js 16 : importer directement les flat configs
 * exportés par `eslint-config-next/*` (déjà au format `Linter.Config[]`).
 * On évite ainsi le bug `FlatCompat.extends()` qui produit une référence
 * circulaire avec `eslint-plugin-react` au démarrage.
 */
const config = [
  ...nextCoreWebVitals,
  ...nextTypescript,
  {
    ignores: [
      ".next/**",
      "node_modules/**",
      ".turbo/**",
      "out/**",
      "dist/**",
      "public/**",
      "next-env.d.ts",
      "tsconfig.tsbuildinfo",
    ],
  },
  {
    rules: {
      // Apostrophes en français : `l'utilisateur` est courant et lisible
      // en JSX. La règle force `l&apos;utilisateur` qui dégrade la
      // lisibilité du code FR sans bénéfice runtime.
      "react/no-unescaped-entities": "off",
      // React 19 / eslint-plugin-react-hooks v7 — règle trop stricte sur
      // les patterns `useEffect(() => { setState(read()); window.addEventListener(...) })`
      // qui sont valides pour synchroniser un store externe (localStorage, etc.).
      // Disable jusqu'à ce que la règle distingue les vrais faux positifs.
      "react-hooks/set-state-in-effect": "off",
    },
  },
];

export default config;
