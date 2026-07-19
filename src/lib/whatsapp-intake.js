const SUPPORTED_LANGUAGES = new Set(['es', 'en', 'de', 'fr']);

export const WHATSAPP_INTAKE_FIELDS = [
  'original_text',
  'delivery_address',
  'preferred_schedule',
];

const COPY = {
  es: {
    original_text: '¡Hola! Puedo apuntar tu pedido por aquí. ¿Qué necesitas que compremos o gestionemos?',
    delivery_address: 'Perfecto. ¿En qué dirección, hotel, apartamento o habitación debemos entregarlo?',
    preferred_schedule: '¿Cuándo prefieres la entrega: mañana, mediodía, tarde, lo antes posible o con horario flexible?',
    confirmation: (orderNumber) => `¡Listo! He creado el pedido #${orderNumber}. Administración revisará disponibilidad y precio antes de enviarte el enlace de pago.`,
  },
  en: {
    original_text: 'Hi! I can take your order here. What would you like us to buy or arrange?',
    delivery_address: 'Perfect. Where should we deliver it? Please include the hotel, apartment or room.',
    preferred_schedule: 'When would you prefer delivery: morning, midday, afternoon, as soon as possible or flexible?',
    confirmation: (orderNumber) => `Done! I created order #${orderNumber}. The team will check availability and price before sending your payment link.`,
  },
  de: {
    original_text: 'Hallo! Ich kann deine Bestellung hier aufnehmen. Was sollen wir kaufen oder erledigen?',
    delivery_address: 'Perfekt. Wohin sollen wir liefern? Bitte Hotel, Apartment oder Zimmer angeben.',
    preferred_schedule: 'Wann möchtest du die Lieferung: morgens, mittags, nachmittags, so schnell wie möglich oder flexibel?',
    confirmation: (orderNumber) => `Erledigt! Bestellung #${orderNumber} wurde erstellt. Das Team prüft Verfügbarkeit und Preis, bevor der Zahlungslink gesendet wird.`,
  },
  fr: {
    original_text: 'Bonjour ! Je peux prendre votre commande ici. Que souhaitez-vous que nous achetions ou organisions ?',
    delivery_address: "Parfait. Où devons-nous livrer ? Indiquez l’hôtel, l’appartement ou la chambre.",
    preferred_schedule: 'Quand préférez-vous la livraison : matin, midi, après-midi, dès que possible ou horaire flexible ?',
    confirmation: (orderNumber) => `C’est noté ! La commande #${orderNumber} a été créée. L’équipe vérifiera la disponibilité et le prix avant d’envoyer le lien de paiement.`,
  },
};

function fold(value) {
  return String(value || '')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase();
}

function clean(value, maxLength = 4000) {
  return String(value || '').trim().slice(0, maxLength);
}

function detectLanguage(message, fallback = 'es') {
  const value = fold(message);
  if (/\b(i need|please|delivery|room|hotel|as soon as possible)\b/.test(value)) return 'en';
  if (/\b(ich brauche|bitte|liefer|zimmer|so schnell wie moglich)\b/.test(value)) return 'de';
  if (/\b(j.?ai besoin|s.?il vous plait|livr|chambre|des que possible)\b/.test(value)) return 'fr';
  return SUPPORTED_LANGUAGES.has(fallback) ? fallback : 'es';
}

function isGreetingOnly(message) {
  const value = fold(message).replace(/[^a-z\s]/g, ' ').replace(/\s+/g, ' ').trim();
  return /^(hola|buenas|hello|hi|hey|hallo|bonjour|bonsoir)( que tal)?$/.test(value);
}

function looksLikeOrder(message) {
  const value = fold(message);
  return /(necesito|quiero|compr|trae|pedido|encargo|busco|i need|i want|please (?:get|buy|bring)|buy |ich brauche|ich mochte|kauf|besorg|j.?ai besoin|je voudrais|achet|apport)/.test(value);
}

function inferServiceType(message) {
  const value = fold(message);
  if (/(farmacia|medicament|paracetamol|ibuprofen|apotheke|pharmacie)/.test(value)) return 'farmacia';
  if (/(ropa|regalo|flores|cargador|clothes|gift|flowers|charger|kleidung|geschenk|blumen|vetement|cadeau|fleurs)/.test(value)) return 'compras_personales';
  if (/(supermercado|agua|leche|pan|comida|grocery|water|milk|bread|food|wasser|milch|brot|eau|lait|pain)/.test(value)) return 'supermercado';
  if (/(transport|recoger|llevar|pick ?up|deliver|abholen|bringen|recuperer|livrer)/.test(value)) return 'transporte_productos';
  return 'recados';
}

function normalizeSchedule(message) {
  const value = fold(message);
  if (/(lo antes posible|cuanto antes|asap|as soon as possible|so schnell wie moglich|schnellstmoglich|des que possible|au plus vite)/.test(value)) {
    return 'lo_antes_posible';
  }
  if (/(por la tarde|esta tarde|afternoon|nachmittag|apres-midi)/.test(value)) return 'tarde';
  if (/\b(mediodia|medio dia|midday|noon|mittag|midi)\b/.test(value)) return 'mediodía';
  if (/(por la manana|esta manana|morning|vormittag|matin)/.test(value)) return 'mañana';
  if (/(flexible|cuando sea|any time|anytime|egal wann|peu importe l.?heure)/.test(value)) return 'flexible';
  return '';
}

function stripScheduleSuffix(value) {
  return value
    .replace(/[.,;]?\s*(?:por la mañana|por la tarde|esta mañana|esta tarde|lo antes posible|as soon as possible|in the morning|in the afternoon|am vormittag|am nachmittag|so schnell wie möglich|le matin|l'après-midi|dès que possible).*$/i, '')
    .trim();
}

function extractAddress(message, expectedField) {
  const raw = clean(message, 500);
  const marker = raw.match(/(?:entreg(?:a|ar)|llevar|direcci[oó]n|address|deliver(?:y)?(?:\s+to)?|liefer(?:n|ung)?|adresse|livr(?:er|aison))\s*(?:en|a|to|an|à|:|is)?\s+(.+)/i);
  if (marker?.[1]) return stripScheduleSuffix(marker[1]);

  const lines = raw.split(/\r?\n/).map((line) => line.trim()).filter(Boolean);
  const addressLine = lines.find((line) => (
    /(hotel|hostal|apart(?:amento|ment)?|aparthotel|villa|habitaci[oó]n|room|zimmer|chambre|recepci[oó]n|reception|calle|avenida|street|straße|strasse|rue|playitas)/i.test(line)
  ));
  if (addressLine) return stripScheduleSuffix(addressLine);

  if (expectedField === 'delivery_address' && !normalizeSchedule(raw)) return raw;
  return '';
}

export function getWhatsAppIntakePrompt(language, field) {
  const dictionary = COPY[SUPPORTED_LANGUAGES.has(language) ? language : 'es'];
  return dictionary[field] || dictionary.original_text;
}

export function getWhatsAppIntakeConfirmation(language, orderNumber) {
  const dictionary = COPY[SUPPORTED_LANGUAGES.has(language) ? language : 'es'];
  return dictionary.confirmation(orderNumber);
}

export function processDemoWhatsAppIntake({ conversation, message }) {
  const body = clean(message);
  const previousDraft = conversation?.intake_status === 'collecting'
    ? conversation.intake_draft || {}
    : {};
  const draft = { ...previousDraft };
  const previousMissing = WHATSAPP_INTAKE_FIELDS.filter((field) => !clean(draft[field]));
  const expectedField = previousMissing[0] || 'original_text';
  // Once an intake has started, keep its language stable. Short follow-up
  // answers often contain shared words such as "hotel" and are not reliable
  // enough to re-detect the customer's language.
  const language = Object.keys(previousDraft).length
    ? (SUPPORTED_LANGUAGES.has(conversation?.language) ? conversation.language : 'es')
    : detectLanguage(body, conversation?.language);
  const schedule = normalizeSchedule(body);
  const address = extractAddress(body, expectedField);

  if (!draft.original_text && !isGreetingOnly(body)) {
    if (expectedField === 'original_text' || looksLikeOrder(body)) {
      draft.original_text = body;
      draft.service_type = inferServiceType(body);
    }
  }

  if (!draft.delivery_address && address) draft.delivery_address = address;
  if (!draft.preferred_schedule && schedule) draft.preferred_schedule = schedule;
  if (!draft.service_type && draft.original_text) draft.service_type = inferServiceType(draft.original_text);

  const missingFields = WHATSAPP_INTAKE_FIELDS.filter((field) => !clean(draft[field]));

  return {
    complete: missingFields.length === 0,
    draft,
    language,
    missingFields,
    reply: missingFields.length ? getWhatsAppIntakePrompt(language, missingFields[0]) : '',
  };
}
