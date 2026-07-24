import {
  ALLOWED_LANGUAGES,
  ALLOWED_SERVICES,
  text,
} from "./utils.ts";

export type WhatsAppIntakeDraft = {
  service_type?: string;
  original_text?: string;
  translated_text?: string;
  delivery_address?: string;
  preferred_schedule?: string;
  client_notes?: string;
};

export const WHATSAPP_REQUIRED_FIELDS = [
  "original_text",
  "delivery_address",
  "preferred_schedule",
] as const;

const COPY: Record<string, Record<string, string | ((orderNumber: string) => string)>> = {
  es: {
    original_text: "¡Hola! Puedo apuntar tu pedido por aquí. ¿Qué necesitas que compremos o gestionemos?",
    delivery_address: "Perfecto. ¿En qué dirección, hotel, apartamento o habitación debemos entregarlo?",
    preferred_schedule: "¿Cuándo prefieres la entrega: mañana, mediodía, tarde, lo antes posible o con horario flexible?",
    needs_admin: "He recibido tu mensaje y lo he pasado a Administración para que lo revise personalmente.",
    confirmation: (orderNumber: string) => `¡Listo! He creado el pedido #${orderNumber}. Administración revisará disponibilidad y precio antes de enviarte el enlace de pago.`,
  },
  en: {
    original_text: "Hi! I can take your order here. What would you like us to buy or arrange?",
    delivery_address: "Perfect. Where should we deliver it? Please include the hotel, apartment or room.",
    preferred_schedule: "When would you prefer delivery: morning, midday, afternoon, as soon as possible or flexible?",
    needs_admin: "I received your message and passed it to the team for a personal review.",
    confirmation: (orderNumber: string) => `Done! I created order #${orderNumber}. The team will check availability and price before sending your payment link.`,
  },
  de: {
    original_text: "Hallo! Ich kann deine Bestellung hier aufnehmen. Was sollen wir kaufen oder erledigen?",
    delivery_address: "Perfekt. Wohin sollen wir liefern? Bitte Hotel, Apartment oder Zimmer angeben.",
    preferred_schedule: "Wann möchtest du die Lieferung: morgens, mittags, nachmittags, so schnell wie möglich oder flexibel?",
    needs_admin: "Ich habe deine Nachricht erhalten und zur persönlichen Prüfung an das Team weitergeleitet.",
    confirmation: (orderNumber: string) => `Erledigt! Bestellung #${orderNumber} wurde erstellt. Das Team prüft Verfügbarkeit und Preis, bevor der Zahlungslink gesendet wird.`,
  },
  fr: {
    original_text: "Bonjour ! Je peux prendre votre commande ici. Que souhaitez-vous que nous achetions ou organisions ?",
    delivery_address: "Parfait. Où devons-nous livrer ? Indiquez l’hôtel, l’appartement ou la chambre.",
    preferred_schedule: "Quand préférez-vous la livraison : matin, midi, après-midi, dès que possible ou horaire flexible ?",
    needs_admin: "J’ai bien reçu votre message et je l’ai transmis à l’équipe pour une vérification personnelle.",
    confirmation: (orderNumber: string) => `C’est noté ! La commande #${orderNumber} a été créée. L’équipe vérifiera la disponibilité et le prix avant d’envoyer le lien de paiement.`,
  },
};

function language(value: unknown, fallback = "es") {
  const candidate = text(value, 2).toLowerCase();
  if (ALLOWED_LANGUAGES.has(candidate)) return candidate;
  return ALLOWED_LANGUAGES.has(fallback) ? fallback : "es";
}

export function missingWhatsAppFields(draft: WhatsAppIntakeDraft) {
  return WHATSAPP_REQUIRED_FIELDS.filter((field) => !text(draft[field], 4000));
}

export function whatsappQuestion(languageCode: string, field: string) {
  const dictionary = COPY[language(languageCode)] || COPY.es;
  return String(dictionary[field] || dictionary.original_text);
}

export function whatsappHandoff(languageCode: string) {
  const dictionary = COPY[language(languageCode)] || COPY.es;
  return String(dictionary.needs_admin);
}

export function whatsappConfirmation(languageCode: string, orderNumber: string) {
  const dictionary = COPY[language(languageCode)] || COPY.es;
  const confirmation = dictionary.confirmation;
  return typeof confirmation === "function" ? confirmation(orderNumber) : String(confirmation);
}

export async function extractWhatsAppIntake({
  service,
  body,
  mediaUrls,
  currentDraft,
  currentLanguage,
}: {
  service: any;
  body: string;
  mediaUrls: string[];
  currentDraft: WhatsAppIntakeDraft;
  currentLanguage: string;
}) {
  const missingBefore = missingWhatsAppFields(currentDraft);
  const activeDraft = Boolean(Object.values(currentDraft || {}).some(Boolean));
  const response = await service.integrations.Core.InvokeLLM({
    model: "gpt_5_mini",
    prompt: [
      "Actúas como recepcionista de un servicio de recados por WhatsApp.",
      "Extrae datos para crear un pedido sin inventar información.",
      "El teléfono ya está identificado y no debes pedirlo.",
      "Campos operativos: lista o recado, dirección exacta de entrega y horario preferido.",
      "Clasifica el servicio como supermercado, farmacia, compras_personales, recados o transporte_productos.",
      "Si ya existe un borrador, interpreta el nuevo mensaje como respuesta al primer campo pendiente.",
      "original_text debe contener lo que el cliente quiere comprar o gestionar, sin traducir.",
      "translated_text debe contener la traducción al español de original_text.",
      "preferred_schedule debe ser mañana, mediodía, tarde, lo_antes_posible, flexible o texto breve equivalente.",
      "Usa cadenas vacías para datos ausentes. No completes dirección ni horario por inferencia.",
      "Marca needs_admin solo si el mensaje es ambiguo, conflictivo o no puede tramitarse de forma segura.",
      `Hay un borrador activo: ${activeDraft ? "sí" : "no"}`,
      `Primer campo pendiente: ${missingBefore[0] || "ninguno"}`,
      `Idioma conocido: ${currentLanguage || "desconocido"}`,
      `Borrador actual: ${JSON.stringify(currentDraft || {})}`,
      `Mensaje entrante: ${body || "(sin texto; revisar archivos adjuntos)"}`,
    ].join("\n"),
    response_json_schema: {
      type: "object",
      properties: {
        intent: { type: "string", enum: ["order", "details", "other"] },
        language: { type: "string", enum: ["es", "en", "de", "fr"] },
        service_type: {
          type: "string",
          enum: ["supermercado", "farmacia", "compras_personales", "recados", "transporte_productos"],
        },
        original_text: { type: "string" },
        translated_text: { type: "string" },
        delivery_address: { type: "string" },
        preferred_schedule: { type: "string" },
        client_notes: { type: "string" },
        needs_admin: { type: "boolean" },
      },
      required: [
        "intent",
        "language",
        "service_type",
        "original_text",
        "translated_text",
        "delivery_address",
        "preferred_schedule",
        "client_notes",
        "needs_admin",
      ],
    },
    ...(mediaUrls.length ? { file_urls: mediaUrls } : {}),
  });

  const extracted = response && typeof response === "object" ? response as Record<string, unknown> : {};
  // Preserve the language selected at the start of an active intake. Follow-up
  // replies such as a hotel name or room number are too short to classify safely.
  const detectedLanguage = activeDraft
    ? language(currentLanguage, "es")
    : language(extracted.language, currentLanguage);
  const draft: WhatsAppIntakeDraft = { ...(currentDraft || {}) };
  const merge = (field: keyof WhatsAppIntakeDraft, maxLength: number) => {
    const value = text(extracted[field], maxLength);
    // A short follow-up should only fill what is missing; it must not silently
    // replace details already confirmed earlier in the conversation.
    if (!text(draft[field], maxLength) && value) draft[field] = value;
  };

  merge("original_text", 4000);
  merge("translated_text", 4000);
  merge("delivery_address", 500);
  merge("preferred_schedule", 100);
  merge("client_notes", 1000);

  const serviceType = text(extracted.service_type, 50);
  if (ALLOWED_SERVICES.has(serviceType)) draft.service_type = serviceType;
  if (!draft.service_type && draft.original_text) draft.service_type = "recados";
  if (detectedLanguage === "es" && draft.original_text && !draft.translated_text) {
    draft.translated_text = draft.original_text;
  }

  return {
    draft,
    language: detectedLanguage,
    intent: text(extracted.intent, 20) || "other",
    needsAdmin: extracted.needs_admin === true,
    missingFields: missingWhatsAppFields(draft),
  };
}
