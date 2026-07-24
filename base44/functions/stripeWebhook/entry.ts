import { createClientFromRequest } from "npm:@base44/sdk";
import Stripe from "npm:stripe";
import { appendStatus, json, requireEnv } from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
  const signature = req.headers.get("stripe-signature");
  if (!signature) return json({ error: "Firma ausente" }, 400);

  let event: Stripe.Event;
  try {
    const rawBody = await req.text();
    event = await stripe.webhooks.constructEventAsync(
      rawBody,
      signature,
      requireEnv("STRIPE_WEBHOOK_SECRET"),
    );
  } catch {
    return json({ error: "Firma no válida" }, 400);
  }

  try {
    if (event.type !== "checkout.session.completed" && event.type !== "checkout.session.async_payment_succeeded") {
      return json({ received: true });
    }

    const session = event.data.object as Stripe.Checkout.Session;
    if (session.payment_status !== "paid") return json({ received: true });

    const orderId = session.metadata?.order_id || session.client_reference_id;
    if (!orderId) return json({ received: true });

    const base44 = createClientFromRequest(req);
    const service = base44.asServiceRole;
    const order = await service.entities.Order.get(orderId);
    if (!order || order.payment_status === "pagado") return json({ received: true });

    const paidAt = new Date().toISOString();
    await service.entities.Order.update(order.id, {
      payment_status: "pagado",
      payment_method: "stripe",
      order_status: "confirmado",
      paid_at: paidAt,
      stripe_checkout_session_id: session.id,
      stripe_payment_intent_id: typeof session.payment_intent === "string" ? session.payment_intent : "",
      status_history: appendStatus(order, "confirmado", "Stripe"),
    });

    const conversations = order.customer_id
      ? await service.entities.Conversation.filter({ customer_id: order.customer_id }, "-created_date", 1)
      : await service.entities.Conversation.filter({ phone: order.client_phone }, "-created_date", 1);
    if (conversations[0]) {
      await service.entities.Message.create({
        user_id: order.user_id || conversations[0].user_id,
        customer_id: order.customer_id || conversations[0].customer_id,
        conversation_id: conversations[0].id,
        order_id: order.id,
        direction: "system",
        sender_type: "system",
        channel: "system",
        body: `Pago del pedido #${order.order_number} confirmado por Stripe.`,
        status: "recorded",
        sent_at: paidAt,
      });
      await service.entities.Conversation.update(conversations[0].id, {
        customer_unread_count: Number(conversations[0].customer_unread_count || 0) + 1,
        last_message_at: paidAt,
      });
    }

    return json({ received: true });
  } catch {
    return json({ error: "No se pudo procesar el evento" }, 500);
  }
});
