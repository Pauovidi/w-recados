export const ORDER_STATUSES = [
  { value: 'nuevo', label: 'Nuevo', tone: 'blue' },
  { value: 'pendiente_pago', label: 'Pendiente de pago', tone: 'amber' },
  { value: 'confirmado', label: 'Confirmado', tone: 'emerald' },
  { value: 'en_proceso', label: 'En proceso', tone: 'indigo' },
  { value: 'recogido', label: 'Recogido', tone: 'cyan' },
  { value: 'en_camino', label: 'En camino', tone: 'orange' },
  { value: 'entregado', label: 'Entregado', tone: 'green' },
  { value: 'cancelado', label: 'Cancelado', tone: 'red' },
];

export const PAYMENT_STATUSES = [
  { value: 'sin_presupuestar', label: 'Sin presupuestar' },
  { value: 'pendiente', label: 'Pendiente' },
  { value: 'pagado', label: 'Pagado' },
  { value: 'reembolsado', label: 'Reembolsado' },
];

export const PAYMENT_METHODS = [
  { value: 'stripe', label: 'Tarjeta · Stripe' },
  { value: 'bizum', label: 'Bizum' },
  { value: 'efectivo', label: 'Efectivo' },
  { value: 'transferencia', label: 'Transferencia' },
];

export const SERVICE_LABELS = {
  supermercado: 'Supermercado',
  farmacia: 'Farmacia',
  compras_personales: 'Compras personales',
  recados: 'Recados',
  transporte_productos: 'Transporte de productos',
};

export const LANGUAGE_LABELS = {
  es: 'Español',
  en: 'English',
  de: 'Deutsch',
  fr: 'Français',
};

export const DEMO_EXAMPLES = {
  es: 'Necesito 6 botellas de agua, leche sin lactosa, pan de molde y crema solar factor 50.',
  en: 'I need six bottles of water, lactose-free milk, sliced bread and SPF 50 sunscreen.',
  de: 'Ich brauche sechs Flaschen Wasser, laktosefreie Milch, Toastbrot und Sonnencreme LSF 50.',
  fr: "J'ai besoin de six bouteilles d'eau, de lait sans lactose, de pain de mie et de crème solaire indice 50.",
};

const DEMO_TRANSLATIONS = {
  [DEMO_EXAMPLES.en]: 'Necesito seis botellas de agua, leche sin lactosa, pan de molde y crema solar factor 50.',
  [DEMO_EXAMPLES.de]: 'Necesito seis botellas de agua, leche sin lactosa, pan de molde y crema solar factor 50.',
  [DEMO_EXAMPLES.fr]: 'Necesito seis botellas de agua, leche sin lactosa, pan de molde y crema solar factor 50.',
};

const SIMPLE_REPLACEMENTS = {
  en: [
    [/\bi need\b/gi, 'Necesito'], [/\bwater\b/gi, 'agua'], [/\bmilk\b/gi, 'leche'],
    [/\bbread\b/gi, 'pan'], [/\bsunscreen\b/gi, 'crema solar'], [/\bpharmacy\b/gi, 'farmacia'],
    [/\bplease\b/gi, 'por favor'], [/\band\b/gi, 'y'],
  ],
  de: [
    [/\bich brauche\b/gi, 'Necesito'], [/\bwasser\b/gi, 'agua'], [/\bmilch\b/gi, 'leche'],
    [/\bbrot\b/gi, 'pan'], [/\bsonnencreme\b/gi, 'crema solar'], [/\bapotheke\b/gi, 'farmacia'],
    [/\bbitte\b/gi, 'por favor'], [/\bund\b/gi, 'y'],
  ],
  fr: [
    [/j['’]ai besoin de/gi, "Necesito"], [/\beau\b/gi, 'agua'], [/\blait\b/gi, 'leche'],
    [/\bpain\b/gi, 'pan'], [/\bcrème solaire\b/gi, 'crema solar'], [/\bpharmacie\b/gi, 'farmacia'],
    [/\bs'il vous plaît\b/gi, 'por favor'], [/\bet\b/gi, 'y'],
  ],
};

export function translateForDemo(text, language) {
  if (!text || language === 'es') return text || '';
  if (DEMO_TRANSLATIONS[text]) return DEMO_TRANSLATIONS[text];

  const replacements = SIMPLE_REPLACEMENTS[language] || [];
  const translated = replacements.reduce((value, [pattern, replacement]) => value.replace(pattern, replacement), text);
  return translated === text ? `Traducción pendiente de revisión: ${text}` : translated;
}

export function normalizePhone(value) {
  let digits = String(value || '').replace(/\D/g, '');
  if (digits.startsWith('00')) digits = digits.slice(2);
  if (digits.length === 9) digits = `34${digits}`;
  return digits ? `+${digits}` : '';
}

export function makeId(prefix) {
  return `${prefix}_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 8)}`;
}

export function getStatus(status) {
  return ORDER_STATUSES.find((item) => item.value === status) || ORDER_STATUSES[0];
}

export function formatCurrency(value) {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) return '—';
  return new Intl.DateTimeFormat('es-ES', {
    day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit',
  }).format(new Date(value));
}
