const now = Date.now();
const ago = (minutes) => new Date(now - minutes * 60_000).toISOString();
const after = (minutes) => new Date(now + minutes * 60_000).toISOString();

export const DEMO_VERSION = 4;

export const initialDemoState = {
  version: DEMO_VERSION,
  settings: {
    demo_mode: true,
    whatsapp_phone: '34600000000',
    whatsapp_provider: 'twilio_demo',
    stripe_provider: 'stripe_demo',
    active_courier_id: 'rep_alberto',
  },
  couriers: [
    {
      id: 'rep_alberto',
      name: 'Álex — Repartidor demo',
      phone: '+34611000222',
      zone: 'Las Playitas',
      is_active: true,
    },
  ],
  customers: [
    { id: 'cli_anna', phone: '+447700900321', display_name: 'Anna Müller', language: 'de', order_count: 1, last_order_at: ago(18) },
    { id: 'cli_james', phone: '+447700900456', display_name: 'James Wilson', language: 'en', order_count: 1, last_order_at: ago(72) },
    { id: 'cli_marie', phone: '+33612030405', display_name: 'Marie Laurent', language: 'fr', order_count: 1, last_order_at: ago(145) },
  ],
  orders: [
    {
      id: 'ped_1003', order_number: '1003', public_tracking_token: 'track-1003', payment_token: 'pay-1003',
      service_type: 'supermercado',
      original_text: 'Ich brauche sechs Flaschen Wasser, laktosefreie Milch, Toastbrot und Sonnencreme LSF 50.',
      translated_text: 'Necesito seis botellas de agua, leche sin lactosa, pan de molde y crema solar factor 50.',
      original_language: 'de', client_language: 'de', delivery_address: 'Villa 12, Playitas Resort',
      client_phone: '+447700900321', customer_id: 'cli_anna', preferred_schedule: 'tarde',
      client_notes: 'Bitte an der Rezeption anrufen.', internal_notes: '', attachments: [],
      order_status: 'nuevo', payment_status: 'sin_presupuestar', assigned_delivery: '', assigned_delivery_name: '',
      product_cost: 0, transport_cost: 0, service_cost: 0, total: 0, payment_link: '',
      created_date: ago(18), updated_date: ago(18),
      status_history: [{ status: 'nuevo', at: ago(18), actor: 'Cliente' }],
    },
    {
      id: 'ped_1002', order_number: '1002', public_tracking_token: 'track-1002', payment_token: 'pay-1002',
      service_type: 'farmacia',
      original_text: 'I need paracetamol, mosquito repellent and after-sun lotion. Please call before delivery.',
      translated_text: 'Necesito paracetamol, repelente de mosquitos y loción after-sun. Llamar antes de entregar.',
      original_language: 'en', client_language: 'en', delivery_address: 'Hotel Playitas, habitación 214',
      client_phone: '+447700900456', customer_id: 'cli_james', preferred_schedule: 'lo_antes_posible',
      client_notes: 'Call reception first.', internal_notes: 'Compra prioritaria. Confirmar formato del paracetamol.', attachments: [],
      order_status: 'asignado', payment_status: 'pagado', assigned_delivery: 'rep_alberto', assigned_delivery_name: 'Álex — Repartidor demo',
      product_cost: 24.8, transport_cost: 4, service_cost: 8, total: 36.8, payment_link: '/pago/pay-1002',
      paid_at: ago(41), created_date: ago(72), updated_date: ago(32),
      status_history: [
        { status: 'nuevo', at: ago(72), actor: 'Cliente' },
        { status: 'pendiente_pago', at: ago(54), actor: 'Administración' },
        { status: 'pagado', at: ago(41), actor: 'Stripe demo' },
        { status: 'asignado', at: ago(32), actor: 'Administración' },
      ],
    },
    {
      id: 'ped_1001', order_number: '1001', public_tracking_token: 'track-1001', payment_token: 'pay-1001',
      service_type: 'recados',
      original_text: "Acheter un chargeur USB-C, récupérer un bouquet de fleurs et apporter le tout à l'appartement.",
      translated_text: 'Comprar un cargador USB-C, recoger un ramo de flores y llevarlo todo al apartamento.',
      original_language: 'fr', client_language: 'fr', delivery_address: 'Aparthotel Playitas, apartamento B-07',
      client_phone: '+33612030405', customer_id: 'cli_marie', preferred_schedule: 'tarde',
      client_notes: "Laisser à la réception si je ne réponds pas.", internal_notes: 'Incluye compras en más de un establecimiento.', attachments: [],
      order_status: 'en_camino', payment_status: 'pagado', assigned_delivery: 'rep_alberto', assigned_delivery_name: 'Álex — Repartidor demo',
      product_cost: 32.5, transport_cost: 6, service_cost: 10, total: 48.5, payment_link: '/pago/pay-1001',
      paid_at: ago(118), created_date: ago(145), updated_date: ago(8),
      status_history: [
        { status: 'nuevo', at: ago(145), actor: 'Cliente' },
        { status: 'pendiente_pago', at: ago(132), actor: 'Administración' },
        { status: 'pagado', at: ago(118), actor: 'Stripe demo' },
        { status: 'asignado', at: ago(70), actor: 'Administración' },
        { status: 'recogido', at: ago(20), actor: 'Álex — Repartidor demo' },
        { status: 'en_camino', at: ago(8), actor: 'Álex — Repartidor demo' },
      ],
    },
  ],
  conversations: [
    {
      id: 'conv_anna', customer_id: 'cli_anna', phone: '+447700900321', display_name: 'Anna Müller', language: 'de',
      order_ids: ['ped_1003'], unread_count: 1, updated_at: ago(18), service_window_expires_at: after(1422),
      messages: [
        { id: 'msg_anna_1', direction: 'inbound', body: 'Hallo! Ich habe gerade meine Einkaufsliste geschickt.', at: ago(18), status: 'received', provider: 'twilio_demo' },
        { id: 'msg_anna_2', direction: 'system', body: 'Pedido #1003 creado desde la web.', at: ago(18), status: 'recorded', provider: 'system' },
      ],
    },
    {
      id: 'conv_james', customer_id: 'cli_james', phone: '+447700900456', display_name: 'James Wilson', language: 'en',
      order_ids: ['ped_1002'], unread_count: 0, updated_at: ago(32), service_window_expires_at: '',
      messages: [
        { id: 'msg_james_1', direction: 'outbound', body: 'We have reviewed order #1002. The total is €36.80. We will start as soon as payment is confirmed.', at: ago(54), status: 'delivered', provider: 'twilio_demo' },
        { id: 'msg_james_2', direction: 'system', body: 'Pago demo confirmado y repartidor asignado.', at: ago(32), status: 'recorded', provider: 'system' },
      ],
    },
    {
      id: 'conv_marie', customer_id: 'cli_marie', phone: '+33612030405', display_name: 'Marie Laurent', language: 'fr',
      order_ids: ['ped_1001'], unread_count: 0, updated_at: ago(8), service_window_expires_at: '',
      messages: [
        { id: 'msg_marie_1', direction: 'outbound', body: 'Votre commande #1001 est en route. Livraison prévue dans environ 15 minutes.', at: ago(8), status: 'delivered', provider: 'twilio_demo' },
      ],
    },
  ],
};
