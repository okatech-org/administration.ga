/**
 * Réexport compat — migration vers `@workspace/settings-form`.
 *
 * Les nouvelles sections devraient importer directement depuis
 * `@workspace/settings-form/hooks/use-debounced-save` ou
 * `@workspace/settings-form`.
 *
 * Ce fichier est conservé pour ne pas casser les imports existants.
 */

export {
  useDebouncedSave,
  type UseDebouncedSaveOptions,
  type UseDebouncedSaveResult,
} from "@workspace/settings-form";
