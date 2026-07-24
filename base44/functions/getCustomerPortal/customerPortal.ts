import {
  ALLOWED_LANGUAGES,
  ALLOWED_SERVICES,
  HttpError,
  normalizePhone,
  requireCustomer,
  text,
} from "./utils.ts";

type ProfileInput = {
  display_name?: unknown;
  phone?: unknown;
  language?: unknown;
  marketing_consent?: unknown;
};

type OrderInput = ProfileInput & {
  service_type?: unknown;
  original_text?: unknown;
  delivery_address?: unknown;
  preferred_schedule?: unknown;
  client_notes?: unknown;
  client_language?: unknown;
  attachment_urls?: unknown;
  website?: unknown;
};

function language(value: unknown, fallback = "es") {
  const candidate = text(value, 2).toLowerCase();
  return ALLOWED_LANGUAGES.has(candidate) ? candidate : fallback;
}

function safeOrder(order: any) {
  return {
    id: order.id,
    order_number: order.order_number,
    service_type: order.service_type,
    original_text: order.original_text,
    translated_text: order.translated_text,
    translation_mode: order.translation_mode,
    original_language: order.original_language,
    client_language: order.client_language,
    delivery_address: order.delivery_address,
    preferred_schedule: order.preferred_schedule,
    client_notes: order.client_notes,
    attachment_urls: order.attachment_urls || [],
    order_status: order.order_status,
    assigned_delivery_name: order.assigned_delivery_name || "",
    product_cost: Number(order.product_cost || 0),
    transport_cost: Number(order.transport_cost || 0),
    service_cost: Number(order.service_cost || 0),
    total: Number(order.total || 0),
    payment_status: order.payment_status,
    payment_method: order.payment_method || "",
    payment_link: order.payment_link || "",
    paid_at: order.paid_at || "",
    status_history: order.status_history || [],
    created_date: order.created_date,
    updated_date: order.updated_date,
  };
}

function safeMessage(message: any) {
  return {
    id: message.id,
    order_id: message.order_id || "",
    direction: message.direction,
    sender_type: message.sender_type
      || (message.direction === "inbound" ? "customer" : message.direction === "outbound" ? "admin" : "system"),
    channel: message.channel || "in_app",
    body: message.body,
    status: message.status || "",
    media_urls: message.media_urls || [],
    sent_at: message.sent_at || message.created_date,
    created_date: message.created_date,
  };
}

async function findCustomerForUser(service: any, user: any) {
  const matches = await service.entities.Customer.filter({ user_id: user.id }, "created_date", 2);
  if (matches.length > 1) {
    throw new HttpError(409, "Hay más de un perfil vinculado a esta cuenta", "DUPLICATE_CUSTOMER_PROFILE");
  }
  return matches[0] || null;
}

export async function ensureSingleConversation(service: any, user: any, customer: any) {
  const byUser = await service.entities.Conversation.filter({ user_id: user.id }, "created_date", 2);
  if (byUser.length > 1) {
    throw new HttpError(409, "Hay más de una conversación vinculada a esta cuenta", "DUPLICATE_CONVERSATION");
  }
  if (byUser[0]) return byUser[0];

  const byCustomer = await service.entities.Conversation.filter({ customer_id: customer.id }, "created_date", 2);
  if (byCustomer.length > 1) {
    throw new HttpError(409, "Hay más de una conversación vinculada al cliente", "DUPLICATE_CONVERSATION");
  }
  if (byCustomer[0]) {
    return await service.entities.Conversation.update(byCustomer[0].id, {
      user_id: user.id,
      phone: customer.phone,
      display_name: customer.display_name,
      language: customer.language || "es",
    });
  }

  return await service.entities.Conversation.create({
    user_id: user.id,
    customer_id: customer.id,
    phone: customer.phone,
    display_name: customer.display_name,
    language: customer.language || "es",
    order_ids: [],
    unread_count: 0,
    admin_unread_count: 0,
    customer_unread_count: 0,
    last_message_at: new Date().toISOString(),
    automation_enabled: false,
    intake_status: "idle",
    intake_draft: {},
    intake_missing_fields: [],
  });
}

export async function completeProfile(base44: any, input: ProfileInput) {
  const user = await requireCustomer(base44);
  const service = base44.asServiceRole;
  const existing = await findCustomerForUser(service, user);
  const phone = normalizePhone(input.phone ?? existing?.phone ?? user.phone);
  const displayName = text(input.display_name ?? existing?.display_name ?? user.full_name, 120);
  const selectedLanguage = language(input.language ?? existing?.language ?? user.language, "es");
  const marketingConsent = typeof input.marketing_consent === "boolean"
    ? input.marketing_consent
    : existing?.marketing_consent === true;

  if (!phone || phone.replace(/\D/g, "").length < 8) {
    throw new HttpError(400, "Introduce un teléfono válido", "INVALID_PHONE");
  }
  if (!displayName) {
    throw new HttpError(400, "Introduce tu nombre", "INVALID_DISPLAY_NAME");
  }

  const phoneMatches = await service.entities.Customer.filter({ phone }, "created_date", 5);
  const conflicting = phoneMatches.find((candidate: any) =>
    candidate.id !== existing?.id && candidate.user_id && candidate.user_id !== user.id
  );
  if (conflicting) {
    throw new HttpError(409, "Este teléfono ya está vinculado a otra cuenta", "PHONE_ALREADY_LINKED");
  }

  let customer = existing;
  if (customer) {
    customer = await service.entities.Customer.update(customer.id, {
      user_id: user.id,
      email: user.email,
      phone,
      display_name: displayName,
      language: selectedLanguage,
      marketing_consent: marketingConsent,
    });
  } else {
    const legacy = phoneMatches.find((candidate: any) =>
      !candidate.user_id && candidate.email && candidate.email.toLowerCase() === String(user.email).toLowerCase()
    );
    customer = legacy
      ? await service.entities.Customer.update(legacy.id, {
          user_id: user.id,
          email: user.email,
          phone,
          display_name: displayName,
          language: selectedLanguage,
          marketing_consent: marketingConsent,
        })
      : await service.entities.Customer.create({
          user_id: user.id,
          email: user.email,
          phone,
          display_name: displayName,
          language: selectedLanguage,
          order_count: 0,
          marketing_consent: marketingConsent,
        });
  }

  await service.entities.User.update(user.id, {
    app_role: "customer",
    phone,
    language: selectedLanguage,
    customer_id: customer.id,
  });
  const conversation = await ensureSingleConversation(service, user, customer);

  return {
    customer: {
      id: customer.id,
      email: user.email,
      phone: customer.phone,
      display_name: customer.display_name,
      language: customer.language,
      marketing_consent: customer.marketing_consent === true,
      order_count: Number(customer.order_count || 0),
      last_order_at: customer.last_order_at || "",
    },
    conversation_id: conversation.id,
  };
}

async function customerContext(base44: any, profileFallback?: ProfileInput) {
  const user = await requireCustomer(base44);
  const service = base44.asServiceRole;
  let customer = await findCustomerForUser(service, user);
  if (!customer && profileFallback) {
    await completeProfile(base44, profileFallback);
    customer = await findCustomerForUser(service, user);
  }
  if (!customer) {
    throw new HttpError(409, "Completa tu perfil antes de continuar", "PROFILE_INCOMPLETE");
  }
  const conversation = await ensureSingleConversation(service, user, customer);
  return { user, service, customer, conversation };
}

export async function createOrder(base44: any, input: OrderInput) {
  if (input.website) return { ignored: true };

  const { user, service, customer, conversation } = await customerContext(base44, input);
  const originalText = text(input.original_text, 4000);
  const deliveryAddress = text(input.delivery_address, 500);
  const selectedLanguage = language(input.client_language ?? customer.language, customer.language || "es");
  const serviceType = text(input.service_type, 50);

  if (!originalText || !deliveryAddress) {
    throw new HttpError(400, "Faltan la lista o la dirección de entrega", "ORDER_FIELDS_REQUIRED");
  }
  if (!ALLOWED_SERVICES.has(serviceType)) {
    throw new HttpError(400, "Tipo de servicio no válido", "INVALID_SERVICE_TYPE");
  }

  let translatedText = originalText;
  let translationMode = "original";
  if (selectedLanguage !== "es") {
    translatedText = "";
    translationMode = "pending";
    try {
      const translation = await service.integrations.Core.InvokeLLM({
        model: "gpt_5_mini",
        prompt: [
          "Traduce al español esta lista de compra o recado.",
          "Conserva cantidades, marcas, nombres propios y saltos de línea.",
          "Devuelve únicamente la traducción, sin comentarios ni formato adicional.",
          `Idioma de origen: ${selectedLanguage}`,
          `Texto: ${originalText}`,
        ].join("\n"),
      });
      if (typeof translation === "string" && translation.trim()) {
        translatedText = translation.trim().slice(0, 4000);
        translationMode = "base44_ai";
      }
    } catch {
      translatedText = "";
    }
  }

  const now = new Date().toISOString();
  const orderNumber = `${String(new Date().getUTCFullYear()).slice(-2)}${String(Date.now()).slice(-8)}${crypto.randomUUID().slice(0, 4).toUpperCase()}`;
  const order = await service.entities.Order.create({
    order_number: orderNumber,
    user_id: user.id,
    customer_id: customer.id,
    service_type: serviceType,
    original_text: originalText,
    translated_text: translatedText,
    translation_mode: translationMode,
    original_language: selectedLanguage,
    client_language: selectedLanguage,
    delivery_address: deliveryAddress,
    client_phone: customer.phone,
    client_name: customer.display_name,
    preferred_schedule: text(input.preferred_schedule, 100),
    client_notes: text(input.client_notes, 1000),
    business_assignments: [],
    package_ids: [],
    attachment_urls: Array.isArray(input.attachment_urls)
      ? input.attachment_urls.map((value: unknown) => text(value, 1000)).filter(Boolean).slice(0, 3)
      : [],
    public_tracking_token: crypto.randomUUID().replaceAll("-", ""),
    payment_token: crypto.randomUUID().replaceAll("-", ""),
    order_status: "nuevo",
    payment_status: "sin_presupuestar",
    status_history: [{ status: "nuevo", at: now, actor: "Cliente web" }],
  });

  await service.entities.Customer.update(customer.id, {
    language: selectedLanguage,
    order_count: Number(customer.order_count || 0) + 1,
    last_order_at: now,
  });
  await service.entities.Conversation.update(conversation.id, {
    order_ids: [order.id, ...(conversation.order_ids || []).filter((id: string) => id !== order.id)],
    unread_count: Number(conversation.unread_count || conversation.admin_unread_count || 0) + 1,
    admin_unread_count: Number(conversation.admin_unread_count || 0) + 1,
    last_message_at: now,
  });
  await service.entities.Message.create({
    user_id: user.id,
    customer_id: customer.id,
    conversation_id: conversation.id,
    order_id: order.id,
    direction: "system",
    sender_type: "system",
    channel: "system",
    body: `Pedido #${orderNumber} creado desde la web.`,
    status: "recorded",
    sent_at: now,
  });

  return { order: safeOrder(order), conversation_id: conversation.id };
}

export async function getPortal(base44: any) {
  const { user, service, customer, conversation } = await customerContext(base44);
  const orders = await service.entities.Order.filter({ user_id: user.id }, "-created_date", 500);
  const messages = await service.entities.Message.filter(
    { conversation_id: conversation.id },
    "sent_at",
    1000,
  );

  if (Number(conversation.customer_unread_count || 0) > 0) {
    await service.entities.Conversation.update(conversation.id, { customer_unread_count: 0 });
  }

  const safeOrders = orders.map(safeOrder);
  return {
    profile: {
      id: customer.id,
      email: user.email,
      phone: customer.phone,
      display_name: customer.display_name,
      language: customer.language,
      marketing_consent: customer.marketing_consent === true,
      order_count: Number(customer.order_count || safeOrders.length),
      last_order_at: customer.last_order_at || "",
    },
    orders: safeOrders,
    payments: safeOrders.map((order: any) => ({
      order_id: order.id,
      order_number: order.order_number,
      total: order.total,
      status: order.payment_status,
      method: order.payment_method,
      payment_link: order.payment_link,
      paid_at: order.paid_at,
      created_date: order.created_date,
    })),
    conversation: {
      id: conversation.id,
      last_message_at: conversation.last_message_at || "",
      unread_count: Number(conversation.customer_unread_count || 0),
    },
    messages: messages.map(safeMessage),
  };
}

export async function sendCustomerChatMessage(base44: any, input: any) {
  const { user, service, customer, conversation } = await customerContext(base44);
  const body = text(input.body, 4000);
  const orderId = text(input.order_id, 200);
  if (!body) throw new HttpError(400, "Escribe un mensaje", "MESSAGE_REQUIRED");

  if (orderId) {
    const order = await service.entities.Order.get(orderId);
    if (!order || order.user_id !== user.id) {
      throw new HttpError(404, "Pedido no encontrado", "ORDER_NOT_FOUND");
    }
  }

  const sentAt = new Date().toISOString();
  const message = await service.entities.Message.create({
    user_id: user.id,
    customer_id: customer.id,
    conversation_id: conversation.id,
    order_id: orderId,
    direction: "inbound",
    sender_type: "customer",
    channel: "in_app",
    body,
    status: "sent",
    sent_at: sentAt,
  });
  await service.entities.Conversation.update(conversation.id, {
    unread_count: Number(conversation.unread_count || conversation.admin_unread_count || 0) + 1,
    admin_unread_count: Number(conversation.admin_unread_count || 0) + 1,
    last_message_at: sentAt,
  });

  return { message: safeMessage(message) };
}
