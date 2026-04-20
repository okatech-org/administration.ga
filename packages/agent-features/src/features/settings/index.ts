export { default } from "./SettingsPage"
export { default as SettingsPage } from "./SettingsPage"
// Re-export the SignatureSettingsCard so the standalone `/settings/signature`
// page (and any other callsite) can import it without reaching into the
// feature's components subfolder.
export { SignatureSettingsCard } from "./components/signature-settings-card"
