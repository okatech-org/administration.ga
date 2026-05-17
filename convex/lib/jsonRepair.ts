/**
 * Réparation de JSON tronqué (réponses LLM coupées).
 *
 * Stratégie : tokenizer stack-based qui respecte la grammaire JSON
 * (strings, escapes) pour fermer correctement les structures ouvertes,
 * sans confondre les délimiteurs { } [ ] internes aux chaînes.
 *
 * Ce module est pur (pas de dépendance Convex/Node) — testable unitaire.
 */

/**
 * Répare un JSON tronqué en fermant les structures ouvertes
 * dans l'ordre LIFO.
 */
export function repairTruncatedJson(input: string): string {
  // Stack des structures ouvertes : '{' ou '['
  const stack: ("{" | "[")[] = [];
  let inString = false;
  let escaped = false;
  let lastSafeIndex = -1; // dernier index où on peut couper proprement

  for (let i = 0; i < input.length; i++) {
    const ch = input[i];

    if (escaped) {
      escaped = false;
      continue;
    }
    if (ch === "\\") {
      escaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (inString) continue;

    if (ch === "{" || ch === "[") {
      stack.push(ch);
    } else if (ch === "}") {
      if (stack[stack.length - 1] === "{") stack.pop();
    } else if (ch === "]") {
      if (stack[stack.length - 1] === "[") stack.pop();
    } else if (ch === "," && stack.length > 0) {
      // Après une virgule, on est entre deux éléments — point sûr pour couper
      lastSafeIndex = i;
    }
  }

  // Si on est resté dans une string, couper avant
  let working = input;
  if (inString && lastSafeIndex > 0) {
    working = input.substring(0, lastSafeIndex);
    // Recalculer la stack pour cette portion (sans la chaîne tronquée)
    stack.length = 0;
    inString = false;
    escaped = false;
    for (let i = 0; i < working.length; i++) {
      const ch = working[i];
      if (escaped) {
        escaped = false;
        continue;
      }
      if (ch === "\\") {
        escaped = true;
        continue;
      }
      if (ch === '"') {
        inString = !inString;
        continue;
      }
      if (inString) continue;
      if (ch === "{" || ch === "[") stack.push(ch);
      else if (ch === "}") {
        if (stack[stack.length - 1] === "{") stack.pop();
      } else if (ch === "]") {
        if (stack[stack.length - 1] === "[") stack.pop();
      }
    }
  }

  // Fermer les structures ouvertes dans l'ordre inverse (LIFO)
  const closing = stack
    .slice()
    .reverse()
    .map((c) => (c === "{" ? "}" : "]"))
    .join("");

  // Retirer une trailing comma éventuelle
  working = working.replace(/,\s*$/, "");

  return working + closing;
}

/**
 * Essaie de parser un JSON, et en cas d'échec tente une réparation
 * via repairTruncatedJson. Retourne le résultat parsé ou lance une erreur.
 */
export function parseOrRepairJson(text: string): unknown {
  try {
    return JSON.parse(text);
  } catch {
    const repaired = repairTruncatedJson(text);
    return JSON.parse(repaired);
  }
}
