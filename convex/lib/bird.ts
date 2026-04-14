/**
 * Bird (ex-MessageBird) API Utility — SMS Channel
 *
 * Sends SMS messages via the Bird Channels API.
 *
 * Required env vars:
 *   BIRD_API_KEY
 *   BIRD_WORKSPACE_ID
 *   BIRD_SMS_CHANNEL_ID
 */

const BIRD_API_BASE = "https://api.bird.com";

// ────────────────────────────────────────────────────────────
// Types
// ────────────────────────────────────────────────────────────

export interface SendSmsResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

// ────────────────────────────────────────────────────────────
// Internal helpers
// ────────────────────────────────────────────────────────────

function getEnvOrThrow(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }
  return value;
}

// ────────────────────────────────────────────────────────────
// Public API
// ────────────────────────────────────────────────────────────

/**
 * Send an SMS message via Bird.
 *
 * @param phone – E.164 format (e.g. "+33612345678")
 * @param text  – Plain text content (max ~160 chars for 1 segment)
 */
export async function sendSms(
  phone: string,
  text: string,
): Promise<SendSmsResult> {
  const apiKey = getEnvOrThrow("BIRD_API_KEY");
  const workspaceId = getEnvOrThrow("BIRD_WORKSPACE_ID");
  const channelId = getEnvOrThrow("BIRD_SMS_CHANNEL_ID");

  const url = `${BIRD_API_BASE}/workspaces/${workspaceId}/channels/${channelId}/messages`;

  const body = {
    receiver: {
      contacts: [
        {
          identifierKey: "phonenumber",
          identifierValue: phone,
        },
      ],
    },
    body: {
      type: "text",
      text: { text },
    },
  };

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        Authorization: `AccessKey ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(body),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      console.error(`[Bird SMS] ${response.status} error:`, errorBody);
      return { success: false, error: `HTTP ${response.status}: ${errorBody}` };
    }

    const data = (await response.json()) as { id?: string };
    return { success: true, messageId: data.id };
  } catch (error: any) {
    console.error(`[Bird SMS] Network error:`, error.message);
    return { success: false, error: error.message };
  }
}
