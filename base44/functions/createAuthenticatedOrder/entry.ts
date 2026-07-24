import { createClientFromRequest } from "npm:@base44/sdk";
import { createOrder } from "./customerPortal.ts";
import { errorResponse, json } from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const base44 = createClientFromRequest(req);
    const result = await createOrder(base44, await req.json());
    return json(result, result.ignored ? 200 : 201);
  } catch (error) {
    return errorResponse(error, "No se pudo crear el pedido");
  }
});
