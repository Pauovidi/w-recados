import { createClientFromRequest } from "npm:@base44/sdk";
import twilio from "npm:twilio";
import { requireEnv, text, whatsappEnabled } from "./utils.ts";

const empty = (status = 204) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });

Deno.serve(async (req) => {
  if (req.method !== "POST") return empty(405);
  if (!whatsappEnabled()) return empty();

  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const signature = req.headers.get("x-twilio-signature") || "";
    const expectedUrl = Deno.env.get("TWILIO_STATUS_WEBHOOK_URL") || req.url;
    if (!twilio.validateRequest(
      requireEnv("TWILIO_AUTH_TOKEN"),
      signature,
      expectedUrl,
      Object.fromEntries(params.entries()),
    )) return empty(403);

    const providerSid = text(params.get("MessageSid") || params.get("SmsSid"), 100);
    const status = text(params.get("MessageStatus") || params.get("SmsStatus"), 50);
    if (!providerSid || !status) return empty(400);

    const base44 = createClientFromRequest(req);
    const messages = await base44.asServiceRole.entities.Message.filter({ provider_sid: providerSid }, "-created_date", 1);
    if (messages[0]) await base44.asServiceRole.entities.Message.update(messages[0].id, { status });
    return empty();
  } catch {
    return empty(500);
  }
});
