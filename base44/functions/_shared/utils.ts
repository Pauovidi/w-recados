export const ALLOWED_LANGUAGES = new Set(["es", "en", "de", "fr"]);
export const ALLOWED_SERVICES = new Set([
  "supermercado",
  "farmacia",
  "compras_personales",
  "recados",
  "transporte_productos",
]);

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(error: unknown, fallback = "Error interno") {
  const message = error instanceof Error ? error.message : fallback;
  const status = message === "No autorizado" ? 401 : message === "Acceso denegado" ? 403 : 500;
  return json({ error: status === 500 ? fallback : message }, status);
}

export function requireEnv(name: string) {
  const value = Deno.env.get(name)?.trim();
  if (!value) throw new Error(`Falta el secreto ${name}`);
  return value;
}

export function text(value: unknown, maxLength: number) {
  return String(value ?? "").trim().slice(0, maxLength);
}

export function normalizePhone(value: unknown) {
  let digits = String(value ?? "").replace(/\D/g, "");
  if (digits.startsWith("00")) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits ? `+${digits}` : "";
}

export function whatsappAddress(value: unknown) {
  const phone = normalizePhone(String(value ?? "").replace(/^whatsapp:/i, ""));
  return phone ? `whatsapp:${phone}` : "";
}

export async function requireAdmin(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) throw new Error("No autorizado");
  if (user.role !== "admin") throw new Error("Acceso denegado");
  return user;
}

export function appendStatus(order: any, status: string, actor: string) {
  return [
    ...(Array.isArray(order.status_history) ? order.status_history : []),
    { status, at: new Date().toISOString(), actor },
  ];
}
