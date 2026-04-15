/**
 * @workspace/settings-form
 *
 * Package de coordination pour les formulaires paramétrage multi-sections
 * avec auto-save debounced, garde de navigation, et feedback visuel clair.
 *
 * Exports publics.
 */

// Types
export type {
  FlushEntry,
  SaveStatus,
  SettingsSectionBaseProps,
} from "./types";

// Hooks
export {
  useDebouncedSave,
  type UseDebouncedSaveOptions,
  type UseDebouncedSaveResult,
} from "./hooks/use-debounced-save";

export {
  useRegisterSection,
  type UseRegisterSectionArgs,
} from "./hooks/use-register-section";

// Context
export {
  SettingsFormProvider,
  useSettingsForm,
  useSettingsFormOptional,
  type SettingsFormProviderProps,
  type SettingsFormValue,
} from "./context/settings-form-context";

// Components
export {
  SaveStatusIndicator,
  type SaveStatusIndicatorProps,
} from "./components/SaveStatusIndicator";

export {
  SettingsAutoSaveBanner,
  type SettingsAutoSaveBannerProps,
} from "./components/SettingsAutoSaveBanner";

export {
  SettingsUnsavedGuard,
  type SettingsUnsavedGuardProps,
} from "./components/SettingsUnsavedGuard";

export {
  SettingsReadOnlyBanner,
  type SettingsReadOnlyBannerProps,
} from "./components/SettingsReadOnlyBanner";
