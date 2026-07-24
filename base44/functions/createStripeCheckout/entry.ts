import { createClientFromRequest } from "npm:@base44/sdk";
import Stripe from "npm:stripe";
import {
  appendStatus,
  errorResponse,
  json,
  requireAdmin,
  requireEnv,
  text,
} from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(base44);
    const { order_id: orderId } = await req.json();
    if (!orderId) return json({ error: "Falta order_id" }, 400);

    const service = base44.asServiceRole;
    const order = await service.entities.Order.get(text(orderId, 200));
    if (!order) return json({ error: "Pedido no encontrado" }, 404);
    if (order.payment_status === "pagado") return json({ error: "El pedido ya está pagado" }, 409);

    const amount = Math.round(Number(order.total || 0) * 100);
    if (!Number.isFinite(amount) || amount < 50) {
      return json({ error: "El total debe ser de al menos 0,50 €" }, 400);
    }

    const stripe = new Stripe(requireEnv("STRIPE_SECRET_KEY"));
    const appUrl = requireEnv("PUBLIC_APP_URL").replace(/\/$/, "");
    const paymentToken = order.payment_token || crypto.randomUUID().replaceAll("-", "");
    const session = await stripe.checkout.sessions.create({
      mode: "payment",
      client_reference_id: order.id,
      line_items: [{
        quantity: 1,
        price_data: {
          currency: "eur",
          unit_amount: amount,
          product_data: {
            name: `Recado #${order.order_number || order.id}`,
            description: "Compra, gestión y entrega del recado acordado",
          },
        },
      }],
      metadata: {
        order_id: order.id,
        order_number: String(order.order_number || ""),
      },
      success_url: `${appUrl}/pago/${paymentToken}?payment=success&session_id={CHECKOUT_SESSION_ID}`,
      cancel_url: `${appUrl}/pago/${paymentToken}?payment=cancelled`,
      locale: "auto",
    }, {
      idempotencyKey: `order-${order.id}-${order.updated_date || amount}`,
    });

    await service.entities.Order.update(order.id, {
      payment_token: paymentToken,
      payment_link: session.url,
      stripe_checkout_session_id: session.id,
      payment_status: "pendiente",
      order_status: "pendiente_pago",
      status_history: appendStatus(order, "pendiente_pago", admin.full_name || "Administración"),
    });

    return json({ url: session.url, session_id: session.id });
  } catch (error) {
    return errorResponse(error, "No se pudo iniciar el pago");
  }
});
