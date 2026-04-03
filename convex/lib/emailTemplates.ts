/**
 * Shared email template infrastructure.
 *
 * Provides the base HTML layout, styles, and reusable email builders
 * used by both the notification service and the auth OTP flow.
 *
 * All user-facing text supports i18n (fr / en).
 */

import { getPlatformConfig } from "./platform";
import type { PlatformConfig } from "./platform";

// ---------------------------------------------------------------------------
// Supported languages
// ---------------------------------------------------------------------------

export type EmailLang = "fr" | "en";

// ---------------------------------------------------------------------------
// Base styles (shared across all emails)
// ---------------------------------------------------------------------------

export const getBaseStyles = () => `
	<style>
		body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; line-height: 1.6; color: #333; margin: 0; padding: 0; }
		.container { max-width: 600px; margin: 0 auto; padding: 20px; }
		.header { background: linear-gradient(135deg, #009639 0%, #006b2b 100%); color: white; padding: 30px; text-align: center; border-radius: 8px 8px 0 0; }
		.header h1 { margin: 0; font-size: 24px; }
		.content { background: #fff; padding: 30px; border: 1px solid #e5e7eb; border-top: none; }
		.footer { background: #f9fafb; padding: 20px; text-align: center; font-size: 12px; color: #6b7280; border: 1px solid #e5e7eb; border-top: none; border-radius: 0 0 8px 8px; }
		.button { display: inline-block; background: #009639; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: 600; }
		.info-box { background: #f0fdf4; border: 1px solid #86efac; border-radius: 6px; padding: 15px; margin: 15px 0; }
		.warning-box { background: #fffbeb; border: 1px solid #fcd34d; border-radius: 6px; padding: 15px; margin: 15px 0; }
		.otp-box { font-size: 36px; letter-spacing: 10px; font-weight: 700; text-align: center; padding: 24px; background: linear-gradient(135deg, #f0fdf4 0%, #dcfce7 100%); border: 2px solid #86efac; border-radius: 12px; margin: 20px 0; color: #166534; font-family: 'Courier New', monospace; }
	</style>
`;

// ---------------------------------------------------------------------------
// i18n dictionaries
// ---------------------------------------------------------------------------

const footerAutoMessage: Record<EmailLang, string> = {
  fr: "Ce message a été envoyé automatiquement, merci de ne pas répondre.",
  en: "This message was sent automatically, please do not reply.",
};

const otpStrings: Record<
  EmailLang,
  {
    title: string;
    greeting: string;
    body: string;
    validity: string;
    ignore: string;
    subjects: Record<string, string>;
  }
> = {
  fr: {
    title: "Code de connexion",
    greeting: "Bonjour,",
    body: "Voici votre code de connexion :",
    validity: "Ce code est valable <strong>5 minutes</strong>.",
    ignore: "Si vous n'avez pas demandé ce code, ignorez cet email.",
    subjects: {
      "sign-in": "Votre code de connexion",
      "email-verification": "Vérification de votre email",
      "forget-password": "Réinitialisation de mot de passe",
    },
  },
  en: {
    title: "Sign-in code",
    greeting: "Hello,",
    body: "Here is your sign-in code:",
    validity: "This code is valid for <strong>5 minutes</strong>.",
    ignore: "If you did not request this code, please ignore this email.",
    subjects: {
      "sign-in": "Your sign-in code",
      "email-verification": "Verify your email",
      "forget-password": "Password reset",
    },
  },
};

// ---------------------------------------------------------------------------
// Layout
// ---------------------------------------------------------------------------

/**
 * Wraps email content in the standard branded HTML layout.
 *
 * @param title  - Subtitle shown below the platform header
 * @param content - Inner HTML body
 * @param platform - Platform branding (defaults to citizen)
 * @param lang - Language for the auto-generated footer line
 */
export function emailLayout(
  title: string,
  content: string,
  platform: PlatformConfig = getPlatformConfig("citizen"),
  lang: EmailLang = "fr",
) {
  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
	<meta charset="utf-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	${getBaseStyles()}
</head>
<body>
	<div class="container">
		<div class="header">
			<h1>${platform.headerTitle}</h1>
			<p style="margin: 5px 0 0 0; opacity: 0.9;">${title}</p>
		</div>
		<div class="content">
			${content}
		</div>
		<div class="footer">
			<p>${platform.footerText}</p>
			<p>${footerAutoMessage[lang]}</p>
		</div>
	</div>
</body>
</html>`;
}

// ---------------------------------------------------------------------------
// OTP email template
// ---------------------------------------------------------------------------

/**
 * Generates the OTP verification email (sign-in, email verification,
 * password reset).
 *
 * @returns `{ subject, html }` ready for Resend
 */
export function otpEmail(opts: {
  otp: string;
  type: string;
  platform?: PlatformConfig;
  lang?: EmailLang;
}): { subject: string; html: string } {
  const lang = opts.lang ?? "fr";
  const t = otpStrings[lang];
  const platform = opts.platform ?? getPlatformConfig("citizen");

  const subject = `${t.subjects[opts.type] ?? t.subjects["sign-in"]} : ${opts.otp}`;

  const content = `
		<p>${t.greeting}</p>
		<p>${t.body}</p>
		<div class="otp-box">${opts.otp}</div>
		<p style="text-align: center; color: #6b7280; font-size: 14px;">
			${t.validity}<br>
			${t.ignore}
		</p>`;

  return {
    subject,
    html: emailLayout(t.title, content, platform, lang),
  };
}

// ---------------------------------------------------------------------------
// Language detection helpers
// ---------------------------------------------------------------------------

/**
 * Detect the user's preferred language from request headers.
 *
 * Priority:
 * 1. `X-App-Language` – explicit app-level language choice (set by the frontend)
 * 2. `Accept-Language` – browser / OS language preference (fallback)
 *
 * Defaults to "fr".
 */
export function detectLangFromHeaders(headers?: Headers | null): EmailLang {
  if (!headers) return "fr";

  // 1. Explicit app language (most reliable — reflects what the user chose in the UI)
  const appLang = headers.get("x-app-language")?.toLowerCase().split("-")[0];
  if (appLang === "en") return "en";
  if (appLang === "fr") return "fr";

  // 2. Fallback to Accept-Language
  const accept = headers.get("accept-language");
  if (!accept) return "fr";
  const lower = accept.toLowerCase();
  const enIdx = lower.indexOf("en");
  const frIdx = lower.indexOf("fr");
  if (enIdx >= 0 && (frIdx < 0 || enIdx < frIdx)) return "en";
  return "fr";
}
