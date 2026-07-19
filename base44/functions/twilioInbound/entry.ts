import { createClientFromRequest } from "npm:@base44/sdk";
import twilio from "npm:twilio";
import {
  normalizePhone,
  requireEnv,
  text,
} from "../_shared/utils.ts";
import {
  extractWhatsAppIntake,
  whatsappConfirmation,
  whatsappHandoff,
  whatsappQuestion,
} from "../_shared/whatsappIntake.ts";

const escapeXml = (value: unknown) => String(value ?? "")
  .replaceAll("&", "&amp;")
  .replaceAll("<", "&lt;")
  .replaceAll(">", "&gt;")
  .replaceAll('"', "&quot;")
  .replaceAll("'", "&apos;");

const twiml = (body = "", status = 200) => {
  const message = body ? `<Message><Body>${escapeXml(body)}</Body></Message>` : "";
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><Response>${message}</Response>`, {
    status,
    headers: { "Content-Type": "text/xml; charset=utf-8", "Cache-Control": "no-store" },
  });
};

Deno.serve(async (req) => {
  if (req.method !== "POST") return twiml("", 405);

  try {
    const rawBody = await req.text();
    const params = new URLSearchParams(rawBody);
    const signature = req.headers.get("x-twilio-signature") || "";
    const expectedUrl = Deno.env.get("TWILIO_INBOUND_WEBHOOK_URL") || req.url;
    const authToken = requireEnv("TWILIO_AUTH_TOKEN");
    const formValues = Object.fromEntries(params.entries());

    if (!twilio.validateRequest(authToken, signature, expectedUrl, formValues)) {
      return twiml("", 403);
    }

    const providerSid = text(params.get("MessageSid") || params.get("SmsSid"), 100);
    const phone = normalizePhone((params.get("From") || "").replace(/^whatsapp:/i, ""));
    if (!providerSid || !phone) return twiml("", 400);

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const duplicates = await service.entities.Message.filter({ provider_sid: providerSid }, "-created_date", 1);
    // Twilio may retry the same webhook. Repeating the prior TwiML would send
    // the automated answer twice, so acknowledge duplicates without a message.
    if (duplicates[0]) return twiml();

    const now = new Date();
    const receivedAt = now.toISOString();
    const windowExpires = new Date(now.getTime() + 24 * 60 * 60 * 1000).toISOString();
    const profileName = text(params.get("ProfileName"), 120);
    const incomingBody = text(params.get("Body"), 4000);
    const mediaCount = Math.min(Number(params.get("NumMedia") || 0), 10);
    const mediaUrls = Array.from(
      { length: mediaCount },
      (_, index) => text(params.get(`MediaUrl${index}`), 1000),
    ).filter(Boolean);

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
          automation_enabled: true,
          intake_status: "idle",
          intake_draft: {},
          intake_missing_fields: [],
        });

    await service.entities.Message.create({
      conversation_id: conversation.id,
      provider_sid: providerSid,
      direction: "inbound",
      body: incomingBody || (mediaUrls.length ? "Archivo adjunto recibido." : ""),
      status: "received",
      media_urls: mediaUrls,
      sent_at: receivedAt,
    });

    if (conversation.automation_enabled === false) return twiml();

    let reply = "";
    let replyOrderId = "";

    try {
      const currentDraft = conversation.intake_status === "collecting"
        ? conversation.intake_draft || {}
        : {};
      const intake = await extractWhatsAppIntake({
        service,
        body: incomingBody,
        mediaUrls,
        currentDraft,
        currentLanguage: conversation.language || customer.language || "es",
      });

      if (intake.needsAdmin) {
        reply = whatsappHandoff(intake.language);
        await service.entities.Conversation.update(conversation.id, {
          language: intake.language,
          intake_status: "needs_admin",
          intake_draft: intake.draft,
          intake_missing_fields: intake.missingFields,
        });
      } else if (intake.missingFields.length) {
        reply = whatsappQuestion(intake.language, intake.missingFields[0]);
        await service.entities.Conversation.update(conversation.id, {
          language: intake.language,
          intake_status: "collecting",
          intake_draft: intake.draft,
          intake_missing_fields: intake.missingFields,
        });
      } else {
        const orderNumber = String(Date.now()).slice(-8);
        const paymentToken = crypto.randomUUID().replaceAll("-", "");
        const trackingToken = crypto.randomUUID().replaceAll("-", "");
        const originalText = text(intake.draft.original_text, 4000);
        const translatedText = text(intake.draft.translated_text, 4000)
          || (intake.language === "es" ? originalText : "");

        const order = await service.entities.Order.create({
          order_number: orderNumber,
          customer_id: customer.id,
          service_type: intake.draft.service_type || "recados",
          original_text: originalText,
          translated_text: translatedText,
          translation_mode: intake.language === "es"
            ? "original"
            : translatedText ? "base44_ai" : "pending",
          original_language: intake.language,
          client_language: intake.language,
          delivery_address: text(intake.draft.delivery_address, 500),
          client_phone: phone,
          client_name: profileName || conversation.display_name || customer.display_name,
          preferred_schedule: text(intake.draft.preferred_schedule, 100),
          client_notes: text(intake.draft.client_notes, 1000),
          attachment_urls: mediaUrls.slice(0, 3),
          public_tracking_token: trackingToken,
          payment_token: paymentToken,
          order_status: "nuevo",
          payment_status: "sin_presupuestar",
          status_history: [{ status: "nuevo", at: receivedAt, actor: "WhatsApp automático" }],
        });
        replyOrderId = order.id;

        await service.entities.Customer.update(customer.id, {
          display_name: profileName || customer.display_name,
          language: intake.language,
          order_count: Number(customer.order_count || 0) + 1,
          last_order_at: receivedAt,
        });
        await service.entities.Conversation.update(conversation.id, {
          language: intake.language,
          order_ids: [order.id, ...(conversation.order_ids || []).filter((id: string) => id !== order.id)],
          intake_status: "created",
          intake_draft: intake.draft,
          intake_missing_fields: [],
          last_intake_order_id: order.id,
        });
        await service.entities.Message.create({
          conversation_id: conversation.id,
          order_id: order.id,
          direction: "system",
          body: `Pedido #${orderNumber} creado automáticamente desde WhatsApp.`,
          status: "recorded",
          sent_at: receivedAt,
          automation: true,
        });

        reply = whatsappConfirmation(intake.language, orderNumber);
      }
    } catch {
      const fallbackLanguage = conversation.language || customer.language || "es";
      reply = whatsappHandoff(fallbackLanguage);
      await service.entities.Conversation.update(conversation.id, {
        intake_status: "needs_admin",
      });
    }

    if (reply) {
      await service.entities.Message.create({
        conversation_id: conversation.id,
        order_id: replyOrderId,
        in_reply_to_sid: providerSid,
        direction: "outbound",
        body: reply,
        status: "queued",
        sent_at: receivedAt,
        automation: true,
      });
    }

    return twiml(reply);
  } catch {
    return twiml("", 500);
  }
});
