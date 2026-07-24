import { createClientFromRequest } from "npm:@base44/sdk";
import { getPortal } from "./customerPortal.ts";
import { errorResponse, json } from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    return json(await getPortal(createClientFromRequest(req)));
  } catch (error) {
    return errorResponse(error, "No se pudo cargar el portal del cliente");
  }
});
