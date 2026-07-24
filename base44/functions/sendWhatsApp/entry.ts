import { createClientFromRequest } from "npm:@base44/sdk";
import {
  errorResponse,
  json,
  requireAdmin,
  requireEnv,
  text,
  whatsappAddress,
  whatsappEnabled,
} from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const base44 = createClientFromRequest(req);
    await requireAdmin(base44);
    if (!whatsappEnabled()) {
      return json({
        error: "WhatsApp está temporalmente desactivado",
        code: "WHATSAPP_DISABLED",
      }, 503);
    }
    const payload = await req.json();
    const conversationId = text(payload.conversation_id, 200);
    const body = text(payload.body, 4000);
    const contentSid = text(payload.content_sid, 100);
    if (!conversationId || (!body && !contentSid)) return json({ error: "Mensaje incompleto" }, 400);

    const service = base44.asServiceRole;
    const conversation = await service.entities.Conversation.get(conversationId);
    if (!conversation) return json({ error: "Conversación no encontrada" }, 404);

    const windowIsOpen = conversation.service_window_expires_at
      && Date.parse(conversation.service_window_expires_at) > Date.now();
    if (!windowIsOpen && !contentSid) {
      return json({ error: "Fuera de la ventana de 24 horas: usa una plantilla aprobada" }, 409);
    }

    const accountSid = requireEnv("TWILIO_ACCOUNT_SID");
    const authToken = requireEnv("TWILIO_AUTH_TOKEN");
    const from = whatsappAddress(requireEnv("TWILIO_WHATSAPP_FROM"));
    const to = whatsappAddress(conversation.phone);
    if (!from || !to) return json({ error: "Número de WhatsApp no válido" }, 400);

    const form = new URLSearchParams({ From: from, To: to });
    if (contentSid) {
      form.set("ContentSid", contentSid);
      if (payload.content_variables) form.set("ContentVariables", JSON.stringify(payload.content_variables));
    } else {
      form.set("Body", body);
    }
    const statusCallback = Deno.env.get("TWILIO_STATUS_WEBHOOK_URL")?.trim();
    if (statusCallback) form.set("StatusCallback", statusCallback);

    const response = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`, {
      method: "POST",
      headers: {
        Authorization: `Basic ${btoa(`${accountSid}:${authToken}`)}`,
        "Content-Type": "application/x-www-form-urlencoded",
      },
      body: form,
    });
    const result = await response.json();
    if (!response.ok) return json({ error: result.message || "Twilio rechazó el mensaje" }, 502);

    const sentAt = new Date().toISOString();
    const message = await service.entities.Message.create({
      user_id: conversation.user_id,
      customer_id: conversation.customer_id,
      conversation_id: conversation.id,
      order_id: text(payload.order_id, 200),
      provider_sid: result.sid,
      direction: "outbound",
      sender_type: "admin",
      channel: "whatsapp",
      body: body || `Plantilla ${contentSid}`,
      status: result.status || "queued",
      sent_at: sentAt,
    });
    await service.entities.Conversation.update(conversation.id, {
      unread_count: 0,
      admin_unread_count: 0,
      customer_unread_count: Number(conversation.customer_unread_count || 0) + 1,
      last_message_at: sentAt,
    });

    return json({ message });
  } catch (error) {
    return errorResponse(error, "No se pudo enviar el WhatsApp");
  }
});
