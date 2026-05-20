export { default } from "./SettingsPage"
export { default as SettingsPage } from "./SettingsPage"
// Re-export the SignatureSettingsCard so the standalone `/settings/signature`
// page (and any other callsite) can import it without reaching into the
// feature's components subfolder.
export { SignatureSettingsCard } from "./components/signature-settings-card"
// Sprint 2 — E2 : panneau lexique partagé (utilisé par les 3 surfaces).
export { UserLexiconPanel } from "./components/user-lexicon-panel"
// Sprint 5.5 wiring — G2 : panneau d'enrollment voiceprint partagé.
export { VoicePrintEnrollmentPanel } from "./components/voice-print-enrollment-panel"
