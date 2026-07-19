import React, { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import { DEMO_VERSION, initialDemoState } from '@/lib/demo-data';
import { makeId, normalizePhone, translateForDemo } from '@/lib/domain';

const STORAGE_KEY = 'w-recados-demo-v4';
const DemoStoreContext = createContext(null);

function cloneInitialState() {
  return JSON.parse(JSON.stringify(initialDemoState));
}

function loadState() {
  if (typeof window === 'undefined') return cloneInitialState();
  try {
    const parsed = JSON.parse(window.localStorage.getItem(STORAGE_KEY));
    return parsed?.version === DEMO_VERSION ? parsed : cloneInitialState();
  } catch {
    return cloneInitialState();
  }
}

function nextOrderNumber(orders) {
  const highest = orders.reduce((max, order) => Math.max(max, Number(order.order_number) || 0), 1000);
  return String(highest + 1);
}

export function DemoStoreProvider({ children }) {
  const [state, setState] = useState(loadState);

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
      const phone = normalizePhone(payload.client_phone);
      const existingCustomer = current.customers.find((customer) => customer.phone === phone);
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
        assigned_delivery: '',
        assigned_delivery_name: '',
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
          order_status: courier ? 'asignado' : order.order_status,
          updated_date: updatedAt,
          status_history: courier
            ? [...(order.status_history || []), { status: 'asignado', at: updatedAt, actor: 'Administración' }]
            : order.status_history,
        } : order),
      };
    });
  }, []);

  const quoteOrder = useCallback((orderId, costs) => {
    const updatedAt = new Date().toISOString();
    setState((current) => {
      const order = current.orders.find((item) => item.id === orderId);
      if (!order) return current;
      const productCost = Number(costs.product_cost || 0);
      const transportCost = Number(costs.transport_cost || 0);
      const serviceCost = Number(costs.service_cost || 0);
      const total = Number((productCost + transportCost + serviceCost).toFixed(2));
      const paymentLink = `${window.location.origin}/pago/${order.payment_token}`;
      const body = `Pedido #${order.order_number} revisado. Total: ${total.toFixed(2)} €. Enlace de pago: ${paymentLink}`;

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
      paidOrder = { ...order, payment_status: 'pagado', order_status: 'pagado', paid_at: updatedAt };
      return {
        ...current,
        orders: current.orders.map((item) => item.id === order.id ? {
          ...item,
          payment_status: 'pagado',
          order_status: 'pagado',
          paid_at: updatedAt,
          updated_date: updatedAt,
          status_history: [...(item.status_history || []), { status: 'pagado', at: updatedAt, actor: 'Stripe demo' }],
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

  const resetDemo = useCallback(() => setState(cloneInitialState()), []);

  const value = useMemo(() => ({
    ...state,
    createOrder,
    updateOrder,
    assignCourier,
    quoteOrder,
    markDemoPaid,
    sendMessage,
    markConversationRead,
    setActiveCourier,
    createCourier,
    updateCourier,
    deactivateCourier,
    resetDemo,
  }), [state, createOrder, updateOrder, assignCourier, quoteOrder, markDemoPaid, sendMessage, markConversationRead, setActiveCourier, createCourier, updateCourier, deactivateCourier, resetDemo]);

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}

export function useDemoStore() {
  const context = useContext(DemoStoreContext);
  if (!context) throw new Error('useDemoStore must be used inside DemoStoreProvider');
  return context;
}
