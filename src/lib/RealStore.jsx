import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { base44 } from '@/api/base44Client';
import { DemoStoreContext } from '@/lib/DemoStore';

const emptyState = {
  orders: [],
  customers: [],
  couriers: [],
  businesses: [],
  packages: [],
  conversations: [],
  settings: { active_courier_id: '' },
};

const entityList = (name, sort = '-created_date') => base44.entities[name].list(sort, 250);

function mapMessages(conversations, messages) {
  return conversations.map((conversation) => ({
    ...conversation,
    updated_at: conversation.last_message_at || conversation.updated_date,
    messages: messages
      .filter((message) => message.conversation_id === conversation.id)
      .map((message) => ({ ...message, at: message.sent_at || message.created_date }))
      .sort((a, b) => new Date(a.at) - new Date(b.at)),
  }));
}

function responseData(response) {
  return response?.data ?? response;
}

export default function RealStoreProvider({ children }) {
  const [state, setState] = useState(emptyState);
  const [user, setUser] = useState(null);
  const [currentCustomer, setCurrentCustomer] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [dataLoading, setDataLoading] = useState(false);

  const loadForUser = useCallback(async (nextUser) => {
    if (!nextUser) {
      setState(emptyState);
      setCurrentCustomer(null);
      return;
    }
    setDataLoading(true);
    try {
      if (nextUser.role === 'admin') {
        const [orders, customers, couriers, businesses, packages, conversations, messages] = await Promise.all([
          entityList('Order'),
          entityList('Customer'),
          entityList('DeliveryPerson'),
          entityList('Business', 'name'),
          entityList('ProductPackage', 'name'),
          entityList('Conversation', '-last_message_at'),
          entityList('Message', 'sent_at'),
        ]);
        setState((current) => ({
          ...current,
          orders,
          customers,
          couriers,
          businesses,
          packages,
          conversations: mapMessages(conversations, messages),
        }));
        setCurrentCustomer(null);
      } else if (nextUser.app_role === 'courier') {
        const [orders, couriers] = await Promise.all([
          entityList('Order'),
          entityList('DeliveryPerson'),
        ]);
        setState((current) => ({ ...current, orders, couriers }));
      } else {
        const portalResponse = await base44.functions.invoke('getCustomerPortal');
        const portal = responseData(portalResponse);
        const profile = portal.profile || null;
        setCurrentCustomer(profile);
        setState((current) => ({
          ...current,
          orders: (portal.orders || []).map((order) => ({ ...order, customer_id: profile?.id })),
          customers: profile ? [profile] : [],
          conversations: portal.conversation ? [{
            ...portal.conversation,
            customer_id: profile?.id,
            updated_at: portal.conversation.last_message_at || portal.conversation.updated_date,
            messages: (portal.messages || []).map((message) => ({
              ...message,
              at: message.sent_at || message.created_date,
            })),
          }] : [],
        }));
      }
    } finally {
      setDataLoading(false);
    }
  }, []);

  const refresh = useCallback(async () => {
    if (user) await loadForUser(user);
  }, [loadForUser, user]);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const authenticated = await base44.auth.isAuthenticated();
        if (!authenticated) return;
        const me = await base44.auth.me();
        if (!active) return;
        setUser(me);
        await loadForUser(me);
      } catch {
        if (active) {
          setUser(null);
          setCurrentCustomer(null);
        }
      } finally {
        if (active) setAuthLoading(false);
      }
    })();
    return () => { active = false; };
  }, [loadForUser]);

  useEffect(() => {
    if (!user) return undefined;
    const timer = window.setInterval(() => {
      loadForUser(user).catch(() => {});
    }, 10000);
    return () => window.clearInterval(timer);
  }, [loadForUser, user]);

  const loginClient = useCallback(async ({ email, password }) => {
    const result = await base44.auth.loginViaEmailPassword(String(email).trim().toLowerCase(), password);
    setUser(result.user);
    await loadForUser(result.user);
    return result.user;
  }, [loadForUser]);

  const registerClient = useCallback(async ({ name, email, phone, password, language }) => {
    const normalizedEmail = String(email).trim().toLowerCase();
    await base44.auth.register({ email: normalizedEmail, password });
    return {
      verificationRequired: true,
      email: normalizedEmail,
      profile: { name, phone, language, email: normalizedEmail, password },
    };
  }, []);

  const verifyClient = useCallback(async ({ email, otpCode, profile }) => {
    const verification = await base44.auth.verifyOtp({ email, otpCode });
    if (verification?.access_token) base44.auth.setToken(verification.access_token);
    let me;
    try {
      me = await base44.auth.me();
    } catch {
      const login = await base44.auth.loginViaEmailPassword(email, profile.password);
      me = login.user;
    }
    await base44.functions.invoke('completeCustomerProfile', {
      display_name: profile.name,
      phone: profile.phone,
      language: profile.language,
    });
    me = await base44.auth.me();
    setUser(me);
    await loadForUser(me);
    return me;
  }, [loadForUser]);

  const resendOtp = useCallback((email) => base44.auth.resendOtp(email), []);

  const logoutClient = useCallback(() => {
    setUser(null);
    setCurrentCustomer(null);
    setState(emptyState);
    base44.auth.logout('/');
  }, []);

  const createOrder = useCallback(async (payload) => {
    const result = responseData(await base44.functions.invoke('createAuthenticatedOrder', payload));
    await refresh();
    return result.order;
  }, [refresh]);

  const sendClientPortalMessage = useCallback(async (body) => {
    await base44.functions.invoke('sendCustomerMessage', { body });
    await refresh();
  }, [refresh]);

  const updateOrder = useCallback(async (id, changes) => {
    await base44.entities.Order.update(id, changes);
    await refresh();
  }, [refresh]);

  const assignCourier = useCallback(async (orderId, courierId) => {
    const courier = state.couriers.find((item) => item.id === courierId);
    await base44.entities.Order.update(orderId, {
      assigned_delivery: courierId || '',
      assigned_delivery_name: courier?.name || '',
    });
    await refresh();
  }, [refresh, state.couriers]);

  const assignBusinesses = useCallback(async (orderId, businessIds) => {
    const assignments = state.businesses
      .filter((business) => businessIds.includes(business.id))
      .map((business) => ({
        business_id: business.id,
        business_name: business.name,
        business_phone: business.phone,
        business_email: business.email || '',
        preferred_channel: business.preferred_channel || 'whatsapp',
      }));
    await base44.entities.Order.update(orderId, { business_assignments: assignments });
    await refresh();
  }, [refresh, state.businesses]);

  const assignPackages = useCallback(async (orderId, packageIds) => {
    await base44.entities.Order.update(orderId, { package_ids: packageIds });
    await refresh();
  }, [refresh]);

  const quoteOrder = useCallback(async (orderId, costs, paymentMethod = 'stripe') => {
    const order = state.orders.find((item) => item.id === orderId);
    if (!order) return;
    const productCost = Number(costs.product_cost || 0);
    const transportCost = Number(costs.transport_cost || 0);
    const serviceCost = Number(costs.service_cost || 0);
    const total = Number((productCost + transportCost + serviceCost).toFixed(2));
    const updatedAt = new Date().toISOString();
    const changes = {
      product_cost: productCost,
      transport_cost: transportCost,
      service_cost: serviceCost,
      total,
      payment_status: 'pendiente',
      payment_method: paymentMethod,
      order_status: 'pendiente_pago',
      status_history: [
        ...(order.status_history || []),
        { status: 'pendiente_pago', at: updatedAt, actor: 'Administración' },
      ],
    };
    await base44.entities.Order.update(orderId, changes);
    const conversation = state.conversations.find((item) => item.customer_id === order.customer_id);
    if (conversation) {
      await base44.entities.Message.create({
        conversation_id: conversation.id,
        order_id: order.id,
        user_id: order.user_id,
        customer_id: order.customer_id,
        direction: 'outbound',
        body: `Pedido #${order.order_number} revisado. Total: ${total.toFixed(2)} €. Método de pago: ${paymentMethod}.`,
        status: 'sent',
        sent_at: updatedAt,
      });
      await base44.entities.Conversation.update(conversation.id, { last_message_at: updatedAt });
    }
    await refresh();
  }, [refresh, state.conversations, state.orders]);

  const markManualPaid = useCallback(async (orderId, paymentMethod) => {
    await base44.functions.invoke('markManualPayment', { order_id: orderId, payment_method: paymentMethod });
    await refresh();
  }, [refresh]);

  const markDemoPaid = useCallback(async () => null, []);

  const sendMessage = useCallback(async (conversationId, body) => {
    await base44.functions.invoke('sendAdminMessage', {
      conversation_id: conversationId,
      body: String(body).trim(),
    });
    await refresh();
  }, [refresh]);

  const markConversationRead = useCallback(async (conversationId) => {
    await base44.entities.Conversation.update(conversationId, { unread_count: 0 });
    await refresh();
  }, [refresh]);

  const setActiveCourier = useCallback((courierId) => {
    setState((current) => ({ ...current, settings: { ...current.settings, active_courier_id: courierId } }));
  }, []);

  const createEntity = useCallback(async (entity, payload) => {
    const created = await base44.entities[entity].create(payload);
    await refresh();
    return created;
  }, [refresh]);
  const updateEntity = useCallback(async (entity, id, payload) => {
    await base44.entities[entity].update(id, payload);
    await refresh();
  }, [refresh]);

  const value = useMemo(() => ({
    ...state,
    isProduction: true,
    authLoading,
    dataLoading,
    currentAccount: user,
    currentCustomer,
    currentUser: user,
    refresh,
    createOrder,
    loginClient,
    registerClient,
    verifyClient,
    resendOtp,
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
    markConversationRead,
    setActiveCourier,
    createCourier: (payload) => createEntity('DeliveryPerson', payload),
    updateCourier: (id, payload) => updateEntity('DeliveryPerson', id, payload),
    deactivateCourier: (id) => updateEntity('DeliveryPerson', id, { is_active: false }),
    createBusiness: (payload) => createEntity('Business', payload),
    updateBusiness: (id, payload) => updateEntity('Business', id, payload),
    deactivateBusiness: (id) => updateEntity('Business', id, { is_active: false }),
    createPackage: (payload) => createEntity('ProductPackage', payload),
    updatePackage: (id, payload) => updateEntity('ProductPackage', id, payload),
    deactivatePackage: (id) => updateEntity('ProductPackage', id, { is_active: false }),
    resetDemo: () => {},
  }), [
    state, authLoading, dataLoading, user, currentCustomer, refresh, createOrder, loginClient,
    registerClient, verifyClient, resendOtp, logoutClient, sendClientPortalMessage, updateOrder,
    assignCourier, assignBusinesses, assignPackages, quoteOrder, markDemoPaid, markManualPaid,
    sendMessage, markConversationRead, setActiveCourier, createEntity, updateEntity,
  ]);

  return <DemoStoreContext.Provider value={value}>{children}</DemoStoreContext.Provider>;
}
