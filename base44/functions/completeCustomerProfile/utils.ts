export const ALLOWED_LANGUAGES = new Set(["es", "en", "de", "fr"]);
export const ALLOWED_SERVICES = new Set([
  "supermercado",
  "farmacia",
  "compras_personales",
  "recados",
  "transporte_productos",
]);

export class HttpError extends Error {
  status: number;
  code: string;

  constructor(status: number, message: string, code = "REQUEST_ERROR") {
    super(message);
    this.name = "HttpError";
    this.status = status;
    this.code = code;
  }
}

export function json(data: unknown, status = 200) {
  return Response.json(data, {
    status,
    headers: { "Cache-Control": "no-store" },
  });
}

export function errorResponse(error: unknown, fallback = "Error interno") {
  if (error instanceof HttpError) {
    return json({ error: error.message, code: error.code }, error.status);
  }
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

export function featureEnabled(name: string, defaultValue = false) {
  const value = Deno.env.get(name)?.trim().toLowerCase();
  if (!value) return defaultValue;
  return ["1", "true", "yes", "on", "enabled"].includes(value);
}

export function whatsappEnabled() {
  return featureEnabled("WHATSAPP_ENABLED", false);
}

export async function requireUser(base44: any) {
  const user = await base44.auth.me().catch(() => null);
  if (!user) throw new HttpError(401, "No autorizado", "AUTH_REQUIRED");
  return user;
}

export async function requireCustomer(base44: any) {
  const user = await requireUser(base44);
  if (user.role === "admin" || (user.app_role && user.app_role !== "customer")) {
    throw new HttpError(403, "Acceso reservado a clientes", "CUSTOMER_REQUIRED");
  }
  if (user.is_verified === false) {
    throw new HttpError(403, "Debes verificar tu correo electrónico", "EMAIL_NOT_VERIFIED");
  }
  return user;
}

export async function requireAdmin(base44: any) {
  const user = await requireUser(base44);
  if (user.role !== "admin") throw new HttpError(403, "Acceso denegado", "ADMIN_REQUIRED");
  return user;
}

export function appendStatus(order: any, status: string, actor: string) {
  return [
    ...(Array.isArray(order.status_history) ? order.status_history : []),
    { status, at: new Date().toISOString(), actor },
  ];
}
