// Le barrel des composants AI citizen ne ré-exporte plus rien.
// Les anciens composants Gemini (VoiceButton / VoiceChatOverlay /
// useVoiceChat / useAIChat) ont été supprimés au profit de l'architecture
// iAsted (CitizenIAstedWindow + VoiceTab + IAstedVoiceContext).
//
// Les pages qui ont encore besoin de FormFillContext ou de useFormFillEffect
// les importent directement depuis leurs fichiers respectifs.
export {};
