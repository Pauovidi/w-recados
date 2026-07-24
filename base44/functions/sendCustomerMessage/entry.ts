import { createClientFromRequest } from "npm:@base44/sdk";
import { sendCustomerChatMessage } from "./customerPortal.ts";
import { errorResponse, json } from "./utils.ts";

Deno.serve(async (req) => {
  if (req.method !== "POST") return json({ error: "Método no permitido" }, 405);
  try {
    const base44 = createClientFromRequest(req);
    return json(await sendCustomerChatMessage(base44, await req.json()), 201);
  } catch (error) {
    return errorResponse(error, "No se pudo enviar el mensaje");
  }
});
