import { createClientFromRequest } from "npm:@base44/sdk";
import {
  errorResponse,
  HttpError,
  json,
  requireAdmin,
  text,
} from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(base44);
    const payload = await req.json();
    const conversationId = text(payload.conversation_id, 200);
    const orderId = text(payload.order_id, 200);
    const body = text(payload.body, 4000);
    if (!conversationId || !body) {
      throw new HttpError(400, "Conversación y mensaje son obligatorios", "MESSAGE_REQUIRED");
    }

    const service = base44.asServiceRole;
    const conversation = await service.entities.Conversation.get(conversationId);
    if (!conversation) throw new HttpError(404, "Conversación no encontrada", "CONVERSATION_NOT_FOUND");
    if (orderId && !(conversation.order_ids || []).includes(orderId)) {
      throw new HttpError(400, "El pedido no pertenece a esta conversación", "ORDER_CONVERSATION_MISMATCH");
    }

    const sentAt = new Date().toISOString();
    const message = await service.entities.Message.create({
      user_id: conversation.user_id,
      customer_id: conversation.customer_id,
      conversation_id: conversation.id,
      order_id: orderId,
      direction: "outbound",
      sender_type: "admin",
      channel: "in_app",
      body,
      status: "sent",
      sent_at: sentAt,
    });
    await service.entities.Conversation.update(conversation.id, {
      unread_count: 0,
      admin_unread_count: 0,
      customer_unread_count: Number(conversation.customer_unread_count || 0) + 1,
      last_message_at: sentAt,
    });

    return json({
      message: {
        id: message.id,
        conversation_id: conversation.id,
        order_id: orderId,
        direction: "outbound",
        sender_type: "admin",
        channel: "in_app",
        body,
        status: "sent",
        sent_at: sentAt,
        actor: admin.full_name || admin.email || "Administración",
      },
    }, 201);
  } catch (error) {
    return errorResponse(error, "No se pudo enviar el mensaje");
  }
});
