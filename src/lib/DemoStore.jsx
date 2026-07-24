import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_VERSION, initialDemoState } from '@/lib/demo-data';
import { makeId, normalizePhone, translateForDemo } from '@/lib/domain';
import {
  getWhatsAppIntakeConfirmation,
  processDemoWhatsAppIntake,
} from '@/lib/whatsapp-intake';

const STORAGE_KEY = 'w-recados-demo-v4';
export const DemoStoreContext = createContext(null);

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialDemoState));
}

async function hashPassword(value) {
  const encoded = new TextEncoder().encode(String(value || ''));
  const digest = await crypto.subtle.digest('SHA-256', encoded);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, '0')).join('');
}

function loadState() {
  if (typeof window === 'undefined') return cloneInitialState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    if (parsed?.version === DEMO_VERSION) return parsed;
    if ([4, 5, 6].includes(parsed?.version)) {
      const initial = cloneInitialState();
      const mergeDemoRecords = (existing = [], defaults = []) => [
        ...existing,
        ...defaults.filter((item) => !existing.some((current) => current.id === item.id)),
      ];
      const migrateStatus = (status) => ({ pagado: 'confirmado', asignado: 'en_proceso' }[status] || status);
      const orders = (parsed.orders || []).map((order) => ({
        ...order,
        order_status: migrateStatus(order.order_status),
        payment_method: order.payment_method || 'stripe',
        business_assignments: order.business_assignments || [],
        package_ids: order.package_ids || [],
        status_history: (order.status_history || []).map((event) => ({ ...event, status: migrateStatus(event.status) })),
      }));
      return {
        ...parsed,
        version: DEMO_VERSION,
        orders,
        couriers: mergeDemoRecords(parsed.couriers, initial.couriers),
        businesses: mergeDemoRecords(parsed.businesses, initial.businesses),
        packages: mergeDemoRecords(parsed.packages, initial.packages),
        client_accounts: mergeDemoRecords(parsed.client_accounts, initial.client_accounts),
        customers: mergeDemoRecords(parsed.customers, initial.customers),
        conversations: mergeDemoRecords(parsed.conversations, initial.conversations),
        settings: {
          ...initial.settings,
          ...(parsed.settings || {}),
          active_client_account_id: parsed.settings?.active_client_account_id || '',
        },
      };
    }
    return cloneInitialState();
  } catch {
    return cloneInitialState();
  }
}

function nextOrderNumber(orders) {
  const highest = orders.reduce((max, order) => Math.max(max, Number(order.order_number) || 0), 1000);
  return String(highest + 1);
}

export function LocalStoreProvider({ children }) {
  const [state, setState] = useState(loadState);

  const currentAccount = state.client_accounts?.find(
    (account) => account.id === state.settings?.active_client_account_id,
  ) || null;
  const currentCustomer = state.customers.find(
    (customer) => customer.id === currentAccount?.customer_id,
  ) || null;

  useEffect(() => {
    window.localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  }, [state]);

  useEffect(() => {
    const sync = (event) => {
      if (event.key !== STORAGE_KEY || !event.newValue) return;
      try {
        const next = JSON.parse(event.newValue);
        if (next?.version === DEMO_VERSION) setState(next);
      } catch {
        // Ignore malformed external storage events.
      }
    };
    window.addEventListener('storage', sync);
    return () => window.removeEventListener('storage', sync);
  }, []);

  const createOrder = useCallback((payload) => {
    const createdAt = new Date().toISOString();
    const id = makeId('ped');
    const customerId = makeId('cli');
    const conversationId = makeId('conv');
    const paymentToken = makeId('pay');
    let createdOrder;

    setState((current) => {
      const activeAccount = current.client_accounts?.find(
        (account) => account.id === current.settings?.active_client_account_id,
      );
      const accountCustomer = current.customers.find(
        (customer) => customer.id === activeAccount?.customer_id,
      );
      const phone = normalizePhone(accountCustomer?.phone || payload.client_phone);
      const existingCustomer = accountCustomer
        || current.customers.find((customer) => customer.phone === phone);
      const resolvedCustomerId = existingCustomer?.id || customerId;
      const orderNumber = nextOrderNumber(current.orders);
      const translatedText = translateForDemo(payload.original_text, payload.client_language);

      createdOrder = {
        ...payload,
        id,
        order_number: orderNumber,
        public_tracking_token: makeId('track'),
        payment_token: paymentToken,
        customer_id: resolvedCustomerId,
        client_phone: phone,
        original_language: payload.client_language,
        translated_text: translatedText,
        translation_mode: payload.client_language === 'es' ? 'original' : 'demo',
        order_status: 'nuevo',
        payment_status: 'sin_presupuestar',
        payment_method: 'stripe',
        assigned_delivery: '',
        assigned_delivery_name: '',
        business_assignments: [],
        package_ids: [],
        product_cost: 0,
        transport_cost: 0,
        service_cost: 0,
        total: 0,
        payment_link: '',
        internal_notes: '',
        created_date: createdAt,
        updated_date: createdAt,
        status_history: [{ status: 'nuevo', at: createdAt, actor: 'Cliente' }],
      };

      const customers = existingCustomer
        ? current.customers.map((customer) => customer.id === existingCustomer.id
          ? {
              ...customer,
              language: payload.client_language,
              display_name: payload.client_name || customer.display_name,
              last_order_at: createdAt,
              order_count: (customer.order_count || 0) + 1,
            }
          : customer)
        : [{
            id: resolvedCustomerId,
            phone,
            display_name: payload.client_name || `Cliente ${phone.slice(-4)}`,
            language: payload.client_language,
            last_order_at: createdAt,
            order_count: 1,
          }, ...current.customers];

      const existingConversation = current.conversations.find((conversation) => conversation.phone === phone);
      const inboundMessage = {
        id: makeId('msg'), direction: 'inbound', body: payload.original_text, at: createdAt,
        status: 'received', provider: 'web',
      };
      const systemMessage = {
        id: makeId('msg'), direction: 'system', body: `Pedido #${orderNumber} creado desde la web.`, at: createdAt,
        status: 'recorded', provider: 'system',
      };

      const conversations = existingConversation
        ? current.conversations.map((conversation) => conversation.id === existingConversation.id
          ? {
              ...conversation,
              display_name: payload.client_name || conversation.display_name,
              language: payload.client_language,
              order_ids: [...new Set([id, ...conversation.order_ids])],
              unread_count: (conversation.unread_count || 0) + 1,
              updated_at: createdAt,
              messages: [...conversation.messages, inboundMessage, systemMessage],
            }
          : conversation)
        : [{
            id: conversationId,
            customer_id: resolvedCustomerId,
            phone,
            display_name: payload.client_name || `Cliente ${phone.slice(-4)}`,
            language: payload.client_language,
            order_ids: [id],
            unread_count: 1,
            updated_at: createdAt,
            service_window_expires_at: '',
            messages: [inboundMessage, systemMessage],
          }, ...current.conversations];

      return { ...current, orders: [createdOrder, ...current.orders], customers, conversations };
    });

    return createdOrder || { id };
  }, []);

  const loginClient = useCallback(async ({ email, password }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const passwordHash = await hashPassword(password);
    const matched = (state.client_accounts || []).find(
      (account) => account.email === normalizedEmail && account.password_hash === passwordHash,
    ) || null;
    if (!matched) throw new Error('Correo o contraseña incorrectos.');
    setState((current) => {
      return {
        ...current,
        settings: { ...current.settings, active_client_account_id: matched.id },
      };
    });
    return matched;
  }, [state.client_accounts]);

  const registerClient = useCallback(async ({ name, email, phone, password, language }) => {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    const normalizedPhone = normalizePhone(phone);
    if (!normalizedEmail || !normalizedPhone || String(password || '').length < 8) {
      throw new Error('Revisa el correo, teléfono y una contraseña de al menos 8 caracteres.');
    }
    if ((state.client_accounts || []).some((account) => account.email === normalizedEmail)) {
      throw new Error('Ya existe una cuenta con ese correo.');
    }
    const passwordHash = await hashPassword(password);
    const accountId = makeId('acc');
    const customerId = makeId('cli');
    const created = {
      id: accountId,
      customer_id: customerId,
      email: normalizedEmail,
      password_hash: passwordHash,
      created_at: new Date().toISOString(),
    };
    setState((current) => {
      const existingCustomer = current.customers.find((customer) => customer.phone === normalizedPhone);
      const resolvedCustomerId = existingCustomer?.id || customerId;
      const resolvedAccount = { ...created, customer_id: resolvedCustomerId };
      const customers = existingCustomer
        ? current.customers.map((customer) => customer.id === existingCustomer.id
          ? { ...customer, email: normalizedEmail, display_name: name || customer.display_name, language }
          : customer)
        : [{
            id: resolvedCustomerId,
            phone: normalizedPhone,
            email: normalizedEmail,
            display_name: name || `Cliente ${normalizedPhone.slice(-4)}`,
            language,
            order_count: 0,
            last_order_at: '',
          }, ...current.customers];
      return {
        ...current,
        client_accounts: [resolvedAccount, ...(current.client_accounts || [])],
        customers,
        settings: { ...current.settings, active_client_account_id: accountId },
      };
    });
    return created;
  }, [state.client_accounts]);

  const logoutClient = useCallback(() => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, active_client_account_id: '' },
    }));
  }, []);

  const sendClientPortalMessage = useCallback((body) => {
    const cleanBody = String(body || '').trim();
    if (!cleanBody) return;
    const sentAt = new Date().toISOString();
    setState((current) => {
      const account = current.client_accounts?.find(
        (item) => item.id === current.settings?.active_client_account_id,
      );
      const customer = current.customers.find((item) => item.id === account?.customer_id);
      if (!customer) return current;
      return {
        ...current,
        conversations: current.conversations.map((conversation) => conversation.customer_id === customer.id
          ? {
              ...conversation,
              unread_count: Number(conversation.unread_count || 0) + 1,
              updated_at: sentAt,
              messages: [...(conversation.messages || []), {
                id: makeId('msg'),
                direction: 'inbound',
                body: cleanBody,
                at: sentAt,
                status: 'received',
                provider: 'client_portal',
              }],
            }
          : conversation),
      };
    });
  }, []);

  const receiveWhatsAppMessage = useCallback((conversationId, body) => {
    const incomingBody = body.trim();
    if (!incomingBody) return;

    const receivedAt = new Date().toISOString();
    const serviceWindowExpiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    setState((current) => {
      const conversation = current.conversations.find((item) => item.id === conversationId);
      if (!conversation) return current;

      const intake = processDemoWhatsAppIntake({ conversation, message: incomingBody });
      const inboundMessage = {
        id: makeId('msg'),
        direction: 'inbound',
        body: incomingBody,
        at: receivedAt,
        status: 'received',
        provider: 'twilio_demo',
      };
      const automationMessages = [];
      let orders = current.orders;
      let customers = current.customers;
      let orderIds = conversation.order_ids || [];
      let intakeStatus = 'collecting';
      let lastIntakeOrderId = conversation.last_intake_order_id || '';

      if (intake.complete) {
        const orderId = makeId('ped');
        const orderNumber = nextOrderNumber(current.orders);
        const paymentToken = makeId('pay');
        const customer = current.customers.find((item) => item.id === conversation.customer_id)
          || current.customers.find((item) => item.phone === conversation.phone);
        const customerId = customer?.id || conversation.customer_id || makeId('cli');
        const originalText = intake.draft.original_text;
        const order = {
          id: orderId,
          order_number: orderNumber,
          public_tracking_token: makeId('track'),
          payment_token: paymentToken,
          customer_id: customerId,
          service_type: intake.draft.service_type || 'recados',
          original_text: originalText,
          translated_text: translateForDemo(originalText, intake.language),
          translation_mode: intake.language === 'es' ? 'original' : 'demo',
          original_language: intake.language,
          client_language: intake.language,
          delivery_address: intake.draft.delivery_address,
          client_phone: conversation.phone,
          client_name: conversation.display_name,
          preferred_schedule: intake.draft.preferred_schedule,
          client_notes: intake.draft.client_notes || '',
          attachments: [],
          order_status: 'nuevo',
          payment_status: 'sin_presupuestar',
          payment_method: 'stripe',
          assigned_delivery: '',
          assigned_delivery_name: '',
          business_assignments: [],
          package_ids: [],
          product_cost: 0,
          transport_cost: 0,
          service_cost: 0,
          total: 0,
          payment_link: '',
          internal_notes: '',
          created_date: receivedAt,
          updated_date: receivedAt,
          status_history: [{ status: 'nuevo', at: receivedAt, actor: 'WhatsApp automático' }],
        };

        orders = [order, ...current.orders];
        orderIds = [orderId, ...orderIds.filter((id) => id !== orderId)];
        lastIntakeOrderId = orderId;
        intakeStatus = 'created';

        customers = customer
          ? current.customers.map((item) => item.id === customer.id ? {
              ...item,
              language: intake.language,
              last_order_at: receivedAt,
              order_count: Number(item.order_count || 0) + 1,
            } : item)
          : [{
              id: customerId,
              phone: conversation.phone,
              display_name: conversation.display_name || `Cliente ${conversation.phone.slice(-4)}`,
              language: intake.language,
              last_order_at: receivedAt,
              order_count: 1,
            }, ...current.customers];

        automationMessages.push(
          {
            id: makeId('msg'),
            direction: 'system',
            body: `Pedido #${orderNumber} creado automáticamente desde WhatsApp.`,
            at: receivedAt,
            status: 'recorded',
            provider: 'system',
          },
          {
            id: makeId('msg'),
            direction: 'outbound',
            body: getWhatsAppIntakeConfirmation(intake.language, orderNumber),
            at: receivedAt,
            status: 'simulated',
            provider: 'twilio_demo',
            automation: true,
          },
        );
      } else {
        automationMessages.push({
          id: makeId('msg'),
          direction: 'outbound',
          body: intake.reply,
          at: receivedAt,
          status: 'simulated',
          provider: 'twilio_demo',
          automation: true,
        });
      }

      return {
        ...current,
        orders,
        customers,
        conversations: current.conversations.map((item) => item.id === conversationId ? {
          ...item,
          language: intake.language,
          order_ids: orderIds,
          unread_count: Number(item.unread_count || 0) + 1,
          updated_at: receivedAt,
          service_window_expires_at: serviceWindowExpiresAt,
          automation_enabled: true,
          intake_status: intakeStatus,
          intake_draft: intake.draft,
          intake_missing_fields: intake.missingFields,
          last_intake_order_id: lastIntakeOrderId,
          messages: [...(item.messages || []), inboundMessage, ...automationMessages],
        } : item),
      };
    });
  }, []);

  const updateOrder = useCallback((id, changes, actor = 'Administración') => {
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      orders: current.orders.map((order) => {
        if (order.id !== id) return order;
        const statusChanged = changes.order_status && changes.order_status !== order.order_status;
        return {
          ...order,
          ...changes,
          updated_date: updatedAt,
          status_history: statusChanged
            ? [...(order.status_history || []), { status: changes.order_status, at: updatedAt, actor }]
            : order.status_history,
        };
      }),
    }));
  }, []);

  const assignCourier = useCallback((orderId, courierId) => {
    setState((current) => {
      const courier = current.couriers.find((item) => item.id === courierId);
      const updatedAt = new Date().toISOString();
      return {
        ...current,
        orders: current.orders.map((order) => order.id === orderId ? {
          ...order,
          assigned_delivery: courier?.id || '',
          assigned_delivery_name: courier?.name || '',
          order_status: courier ? 'en_proceso' : order.order_status,
          updated_date: updatedAt,
          status_history: courier
            ? [...(order.status_history || []), { status: 'en_proceso', at: updatedAt, actor: 'Administración' }]
            : order.status_history,
        } : order),
      };
    });
  }, []);

  const assignBusinesses = useCallback((orderId, businessIds) => {
    const updatedAt = new Date().toISOString();
    setState((current) => {
      const selected = current.businesses
        .filter((business) => businessIds.includes(business.id))
        .map((business) => ({
          business_id: business.id,
          business_name: business.name,
          business_phone: business.phone,
          business_email: business.email || '',
          preferred_channel: business.preferred_channel || 'whatsapp',
        }));
      return {
        ...current,
        orders: current.orders.map((order) => order.id === orderId ? {
          ...order,
          business_assignments: selected,
          updated_date: updatedAt,
        } : order),
      };
    });
  }, []);

  const assignPackages = useCallback((orderId, packageIds) => {
    const updatedAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      orders: current.orders.map((order) => order.id === orderId ? {
        ...order,
        package_ids: packageIds,
        updated_date: updatedAt,
      } : order),
    }));
  }, []);

  const quoteOrder = useCallback((orderId, costs, paymentMethod = 'stripe') => {
    const updatedAt = new Date().toISOString();
    setState((current) => {
      const order = current.orders.find((item) => item.id === orderId);
      if (!order) return current;
      const productCost = Number(costs.product_cost || 0);
      const transportCost = Number(costs.transport_cost || 0);
      const serviceCost = Number(costs.service_cost || 0);
      const total = Number((productCost + transportCost + serviceCost).toFixed(2));
      const paymentLink = paymentMethod === 'stripe' ? `${window.location.origin}/pago/${order.payment_token}` : '';
      const methodLabel = {
        bizum: 'Bizum',
        efectivo: 'efectivo',
        transferencia: 'transferencia',
      }[paymentMethod];
      const body = paymentMethod === 'stripe'
        ? `Pedido #${order.order_number} revisado. Total: ${total.toFixed(2)} €. Enlace de pago: ${paymentLink}`
        : `Pedido #${order.order_number} revisado. Total: ${total.toFixed(2)} €. Pago previsto por ${methodLabel}.`;

      return {
        ...current,
        orders: current.orders.map((item) => item.id === orderId ? {
          ...item,
          product_cost: productCost,
          transport_cost: transportCost,
          service_cost: serviceCost,
          total,
          payment_link: paymentLink,
          payment_status: 'pendiente',
          payment_method: paymentMethod,
          order_status: 'pendiente_pago',
          updated_date: updatedAt,
          status_history: [...(item.status_history || []), { status: 'pendiente_pago', at: updatedAt, actor: 'Administración' }],
        } : item),
        conversations: current.conversations.map((conversation) => conversation.phone === order.client_phone ? {
          ...conversation,
          updated_at: updatedAt,
          messages: [...conversation.messages, {
            id: makeId('msg'), direction: 'outbound', body, at: updatedAt,
            status: 'simulated', provider: 'twilio_demo',
          }],
        } : conversation),
      };
    });
  }, []);

  const markDemoPaid = useCallback((paymentToken) => {
    const updatedAt = new Date().toISOString();
    let paidOrder = null;
    setState((current) => {
      const order = current.orders.find((item) => item.payment_token === paymentToken);
      if (!order) return current;
      paidOrder = { ...order, payment_status: 'pagado', payment_method: 'stripe', order_status: 'confirmado', paid_at: updatedAt };
      return {
        ...current,
        orders: current.orders.map((item) => item.id === order.id ? {
          ...item,
          payment_status: 'pagado',
          payment_method: 'stripe',
          order_status: 'confirmado',
          paid_at: updatedAt,
          updated_date: updatedAt,
          status_history: [...(item.status_history || []), { status: 'confirmado', at: updatedAt, actor: 'Stripe demo' }],
        } : item),
        conversations: current.conversations.map((conversation) => conversation.phone === order.client_phone ? {
          ...conversation,
          updated_at: updatedAt,
          messages: [...conversation.messages, {
            id: makeId('msg'), direction: 'system', body: `Pago del pedido #${order.order_number} confirmado.`,
            at: updatedAt, status: 'recorded', provider: 'stripe_demo',
          }],
        } : conversation),
      };
    });
    return paidOrder;
  }, []);

  const markManualPaid = useCallback((orderId, paymentMethod) => {
    const updatedAt = new Date().toISOString();
    const methodLabel = {
      bizum: 'Bizum',
      efectivo: 'Efectivo',
      transferencia: 'Transferencia',
    }[paymentMethod] || 'Pago manual';
    setState((current) => {
      const order = current.orders.find((item) => item.id === orderId);
      if (!order) return current;
      return {
        ...current,
        orders: current.orders.map((item) => item.id === orderId ? {
          ...item,
          payment_status: 'pagado',
          payment_method: paymentMethod,
          order_status: 'confirmado',
          paid_at: updatedAt,
          updated_date: updatedAt,
          status_history: [...(item.status_history || []), { status: 'confirmado', at: updatedAt, actor: `Administración · ${methodLabel}` }],
        } : item),
        conversations: current.conversations.map((conversation) => conversation.phone === order.client_phone ? {
          ...conversation,
          updated_at: updatedAt,
          messages: [...conversation.messages, {
            id: makeId('msg'), direction: 'system', body: `Pago del pedido #${order.order_number} registrado por ${methodLabel}.`,
            at: updatedAt, status: 'recorded', provider: 'manual_payment',
          }],
        } : conversation),
      };
    });
  }, []);

  const sendMessage = useCallback((conversationId, body) => {
    const text = body.trim();
    if (!text) return;
    const sentAt = new Date().toISOString();
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId ? {
        ...conversation,
        unread_count: 0,
        updated_at: sentAt,
        messages: [...conversation.messages, {
          id: makeId('msg'), direction: 'outbound', body: text, at: sentAt,
          status: 'simulated', provider: 'twilio_demo',
        }],
      } : conversation),
    }));
  }, []);

  const markConversationRead = useCallback((conversationId) => {
    setState((current) => ({
      ...current,
      conversations: current.conversations.map((conversation) => conversation.id === conversationId
        ? { ...conversation, unread_count: 0 }
        : conversation),
    }));
  }, []);

  const setActiveCourier = useCallback((courierId) => {
    setState((current) => ({
      ...current,
      settings: { ...current.settings, active_courier_id: courierId },
    }));
  }, []);

  const createCourier = useCallback((payload) => {
    const courier = { ...payload, id: makeId('rep'), is_active: payload.is_active !== false };
    setState((current) => ({ ...current, couriers: [...current.couriers, courier] }));
    return courier;
  }, []);

  const updateCourier = useCallback((id, payload) => {
    setState((current) => {
      const previous = current.couriers.find((courier) => courier.id === id);
      const nextName = payload.name || previous?.name || '';
      return {
        ...current,
        couriers: current.couriers.map((courier) => courier.id === id ? { ...courier, ...payload } : courier),
        orders: current.orders.map((order) => order.assigned_delivery === id
          ? { ...order, assigned_delivery_name: nextName }
          : order),
      };
    });
  }, []);

  const deactivateCourier = useCallback((id) => {
    setState((current) => ({
      ...current,
      couriers: current.couriers.map((courier) => courier.id === id ? { ...courier, is_active: false } : courier),
    }));
  }, []);

  const createBusiness = useCallback((payload) => {
    const business = { ...payload, id: makeId('biz'), is_active: payload.is_active !== false };
    setState((current) => ({ ...current, businesses: [...current.businesses, business] }));
    return business;
  }, []);

  const updateBusiness = useCallback((id, payload) => {
    setState((current) => {
      const previous = current.businesses.find((business) => business.id === id);
      const next = { ...previous, ...payload };
      return {
        ...current,
        businesses: current.businesses.map((business) => business.id === id ? next : business),
        orders: current.orders.map((order) => ({
          ...order,
          business_assignments: (order.business_assignments || []).map((assignment) => assignment.business_id === id ? {
            ...assignment,
            business_name: next.name,
            business_phone: next.phone,
            business_email: next.email || '',
            preferred_channel: next.preferred_channel || 'whatsapp',
          } : assignment),
        })),
      };
    });
  }, []);

  const deactivateBusiness = useCallback((id) => {
    setState((current) => ({
      ...current,
      businesses: current.businesses.map((business) => business.id === id ? { ...business, is_active: false } : business),
    }));
  }, []);

  const createPackage = useCallback((payload) => {
    const productPackage = { ...payload, id: makeId('pkg'), is_active: payload.is_active !== false };
    setState((current) => ({ ...current, packages: [...current.packages, productPackage] }));
    return productPackage;
  }, []);

  const updatePackage = useCallback((id, payload) => {
    setState((current) => ({
      ...current,
      packages: current.packages.map((productPackage) => productPackage.id === id ? { ...productPackage, ...payload } : productPackage),
    }));
  }, []);

  const deactivatePackage = useCallback((id) => {
    setState((current) => ({
      ...current,
      packages: current.packages.map((productPackage) => productPackage.id === id ? { ...productPackage, is_active: false } : productPackage),
    }));
  }, []);

  const resetDemo = useCallback(() => setState(cloneInitialState()), []);

  const value = useMemo(() => ({
    ...state,
    isProduction: false,
    authLoading: false,
    currentAccount,
    currentCustomer,
    createOrder,
    loginClient,
    registerClient,
    logoutClient,
    sendClientPortalMessage,
    updateOrder,
    assignCourier,
    assignBusinesses,
    assignPackages,
    quoteOrder,
    markDemoPaid,
    markManualPaid,
    sendMessage,
    receiveWhatsAppMessage,
    markConversationRead,
    setActiveCourier,
    createCourier,
    updateCourier,
    deactivateCourier,
    createBusiness,
    updateBusiness,
    deactivateBusiness,
    createPackage,
    updatePackage,
    deactivatePackage,
    resetDemo,
  }), [state, currentAccount, currentCustomer, createOrder, loginClient, registerClient, logoutClient, sendClientPortalMessage, updateOrder, assignCourier, assignBusinesses, assignPackages, quoteOrder, markDemoPaid, markManualPaid, sendMessage, receiveWhatsAppMessage, markConversationRead, setActiveCourier, createCourier, updateCourier, deactivateCourier, createBusiness, updateBusiness, deactivateBusiness, createPackage, updatePackage, deactivatePackage, resetDemo]);

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const context = useContext(DemoStoreContext);
  if (!context) throw new Error('useDemoStore must be used inside DemoStoreProvider');
  return context;
}
