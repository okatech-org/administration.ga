import { httpAction } from "./_generated/server";
import { internal } from "./_generated/api";

// Example of a webhook receiver acting as sensory input
export const webhookEntrant = httpAction(async (ctx, request) => {
  const payload = await request.text();
  const signature = request.headers.get("x-webhook-signature");

  // Example: Convert external webhook data into an internal signal
  try {
    const data = JSON.parse(payload);
    
    // Trigger the limbique system
    await ctx.runMutation(internal.limbique.emettreSignal, {
      type: "WEBHOOK_EXTERNE",
      source: "SENSORIEL",
      payload: data,
      confiance: signature ? 0.9 : 0.5,
      priorite: "NORMAL",
      correlationId: crypto.randomUUID(),
    });

    return new Response(null, { status: 200 });
  } catch (err) {
    return new Response("Webhook Error", { status: 400 });
  }
});
