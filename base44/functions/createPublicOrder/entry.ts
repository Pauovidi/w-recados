import { createClientFromRequest } from "npm:@base44/sdk";
import {
  ALLOWED_LANGUAGES,
  ALLOWED_SERVICES,
  errorResponse,
  json,
  normalizePhone,
  text,
} from "../_shared/utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const payload = await req.json();
    if (payload.website) return json({ ok: true });

    const clientPhone = normalizePhone(payload.client_phone);
    const originalText = text(payload.original_text, 4000);
    const deliveryAddress = text(payload.delivery_address, 500);
    const language = text(payload.client_language, 2).toLowerCase();
    const serviceType = text(payload.service_type, 50);

    if (!clientPhone || clientPhone.replace(/\D/g, "").length < 8) {
      return json({ error: "Teléfono no válido" }, 400);
    }
    if (!originalText || !deliveryAddress) {
      return json({ error: "Faltan la lista o la dirección de entrega" }, 400);
    }
    if (!ALLOWED_LANGUAGES.has(language) || !ALLOWED_SERVICES.has(serviceType)) {
      return json({ error: "Idioma o servicio no válido" }, 400);
    }

    const service = base44.asServiceRole;
    const now = new Date().toISOString();
    const customerMatches = await service.entities.Customer.filter({ phone: clientPhone }, "-created_date", 1);
    const existingCustomer = customerMatches[0];
    const displayName = text(payload.client_name, 120) || existingCustomer?.display_name || `Cliente ${clientPhone.slice(-4)}`;
    const customer = existingCustomer
      ? await service.entities.Customer.update(existingCustomer.id, {
          display_name: displayName,
          language,
          order_count: Number(existingCustomer.order_count || 0) + 1,
          last_order_at: now,
        })
      : await service.entities.Customer.create({
          phone: clientPhone,
          display_name: displayName,
          language,
          order_count: 1,
          last_order_at: now,
          marketing_consent: false,
        });

    let translatedText = originalText;
    let translationMode = "original";
    if (language !== "es") {
      translationMode = "pending";
      try {
        const translation = await service.integrations.Core.InvokeLLM({
          model: "gpt_5_mini",
          prompt: [
            "Traduce al español esta lista de compra o recado.",
            "Conserva cantidades, marcas, nombres propios y saltos de línea.",
            "Devuelve únicamente la traducción, sin comentarios ni formato adicional.",
            `Idioma de origen: ${language}`,
            `Texto: ${originalText}`,
          ].join("\n"),
        });
        if (typeof translation === "string" && translation.trim()) {
          translatedText = translation.trim().slice(0, 4000);
          translationMode = "base44_ai";
        }
      } catch {
        translatedText = "";
      }
    }

    const orderNumber = String(Date.now()).slice(-8);
    const paymentToken = crypto.randomUUID().replaceAll("-", "");
    const trackingToken = crypto.randomUUID().replaceAll("-", "");
    const order = await service.entities.Order.create({
      order_number: orderNumber,
      customer_id: customer.id,
      service_type: serviceType,
      original_text: originalText,
      translated_text: translatedText,
      translation_mode: translationMode,
      original_language: language,
      client_language: language,
      delivery_address: deliveryAddress,
      client_phone: clientPhone,
      client_name: displayName,
      preferred_schedule: text(payload.preferred_schedule, 100),
      client_notes: text(payload.client_notes, 1000),
      business_assignments: [],
      package_ids: [],
      attachment_urls: Array.isArray(payload.attachment_urls)
        ? payload.attachment_urls.map((value: unknown) => text(value, 1000)).filter(Boolean).slice(0, 3)
        : [],
      public_tracking_token: trackingToken,
      payment_token: paymentToken,
      payment_method: "stripe",
      order_status: "nuevo",
      payment_status: "sin_presupuestar",
      status_history: [{ status: "nuevo", at: now, actor: "Cliente web" }],
    });

    const conversationMatches = await service.entities.Conversation.filter({ phone: clientPhone }, "-created_date", 1);
    const existingConversation = conversationMatches[0];
    const orderIds = [...new Set([order.id, ...(existingConversation?.order_ids || [])])];
    const conversation = existingConversation
      ? await service.entities.Conversation.update(existingConversation.id, {
          customer_id: customer.id,
          display_name: displayName,
          language,
          order_ids: orderIds,
          unread_count: Number(existingConversation.unread_count || 0) + 1,
          last_message_at: now,
        })
      : await service.entities.Conversation.create({
          customer_id: customer.id,
          phone: clientPhone,
          display_name: displayName,
          language,
          order_ids: [order.id],
          unread_count: 1,
          last_message_at: now,
        });

    await service.entities.Message.create({
      conversation_id: conversation.id,
      order_id: order.id,
      direction: "system",
      body: `Pedido #${orderNumber} creado desde la web.`,
      status: "recorded",
      sent_at: now,
    });

    return json({
      order: { id: order.id, order_number: orderNumber, public_tracking_token: trackingToken },
      recognized_customer: Boolean(existingCustomer),
    }, 201);
  } catch (error) {
    return errorResponse(error, "No se pudo crear el pedido");
  }
});
