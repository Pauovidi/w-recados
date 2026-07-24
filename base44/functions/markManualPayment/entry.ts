import { createClientFromRequest } from "npm:@base44/sdk";
import {
  appendStatus,
  errorResponse,
  json,
  requireAdmin,
  text,
} from "./utils.ts";

const MANUAL_METHODS = new Set(["bizum", "efectivo", "transferencia"]);

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);

  try {
    const base44 = createClientFromRequest(req);
    const admin = await requireAdmin(base44);
    const payload = await req.json();
    const orderId = text(payload.order_id, 200);
    const paymentMethod = text(payload.payment_method, 40);
    if (!orderId || !MANUAL_METHODS.has(paymentMethod)) {
      return json({ error: "Pedido o método de pago manual no válido" }, 400);
    }

    const service = base44.asServiceRole;
    const order = await service.entities.Order.get(orderId);
    if (!order) return json({ error: "Pedido no encontrado" }, 404);
    if (order.payment_status === "pagado") return json({ error: "El pedido ya está pagado" }, 409);

    const paidAt = new Date().toISOString();
    const methodLabel = { bizum: "Bizum", efectivo: "Efectivo", transferencia: "Transferencia" }[paymentMethod];
    await service.entities.Order.update(order.id, {
      payment_status: "pagado",
      payment_method: paymentMethod,
      order_status: "confirmado",
      paid_at: paidAt,
      status_history: appendStatus(order, "confirmado", `${admin.full_name || "Administración"} · ${methodLabel}`),
    });

    return json({ ok: true, paid_at: paidAt });
  } catch (error) {
    return errorResponse(error, "No se pudo registrar el pago manual");
  }
});
