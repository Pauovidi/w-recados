import { createClientFromRequest } from "npm:@base44/sdk";
import twilio from "npm:twilio";
import {
  normalizePhone,
  requireEnv,
  text,
} from "../_shared/utils.ts";

const twiml = (status = 200) => new Response("<?xml version=\"1.0\" encoding=\"UTF-8\"?><Response></Response>", {
  status,
  headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
});

Deno.serve(async (req) => {
  if (req.method !== "POST") return twiml(405);

  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const signature = req.headers.get("x-twilio-signature") || "";
    const expectedUrl = Deno.env.get("TWILIO_INBOUND_WEBHOOK_URL") || req.url;
    const authToken = requireEnv("TWILIO_AUTH_TOKEN");
    const formValues = Object.fromEntries(params.entries());

    if (!twilio.validateRequest(authToken, signature, expectedUrl, formValues)) return twiml(403);

    const providerSid = text(params.get("MessageSid") || params.get("SmsSid"), 100);
    const phone = normalizePhone((params.get("From") || "").replace(/^whatsapp:/i, ""));
    if (!providerSid || !phone) return twiml(400);

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const duplicates = await service.entities.Message.filter({ provider_sid: providerSid }, "-created_date", 1);
    if (duplicates[0]) return twiml();

    const now = new Date();
    const receivedAt = now.toISOString();
    const windowExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const profileName = text(params.get("ProfileName"), 120);

    const customerMatches = await service.entities.Customer.filter({ phone }, "-created_date", 1);
    const customer = customerMatches[0] || await service.entities.Customer.create({
      phone,
      display_name: profileName || `Cliente ${phone.slice(-4)}`,
      language: "es",
      order_count: 0,
      marketing_consent: false,
    });
    if (customerMatches[0] && profileName && profileName !== customer.display_name) {
      await service.entities.Customer.update(customer.id, { display_name: profileName });
    }

    const conversationMatches = await service.entities.Conversation.filter({ phone }, "-created_date", 1);
    const existing = conversationMatches[0];
    const conversation = existing
      ? await service.entities.Conversation.update(existing.id, {
          customer_id: customer.id,
          display_name: profileName || existing.display_name,
          unread_count: Number(existing.unread_count || 0) + 1,
          last_message_at: receivedAt,
          service_window_expires_at: windowExpires,
        })
      : await service.entities.Conversation.create({
          customer_id: customer.id,
          phone,
          display_name: profileName || customer.display_name,
          language: customer.language || "es",
          order_ids: [],
          unread_count: 1,
          last_message_at: receivedAt,
          service_window_expires_at: windowExpires,
        });

    const mediaCount = Math.min(Number(params.get("NumMedia") || 0), 10);
    const mediaUrls = Array.from({ length: mediaCount }, (_, index) => text(params.get(`MediaUrl${index}`), 1000)).filter(Boolean);
    await service.entities.Message.create({
      conversation_id: conversation.id,
      provider_sid: providerSid,
      direction: "inbound",
      body: text(params.get("Body"), 4000),
      status: "received",
      media_urls: mediaUrls,
      sent_at: receivedAt,
    });

    return twiml();
  } catch {
    return twiml(500);
  }
});
