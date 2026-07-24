import React, { useMemo, useState } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Check, Clock3, CreditCard, LogOut, MessageCircle, PackageCheck, Plus,
  ReceiptText, Send, Truck, UserRound,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Textarea } from '@/components/ui/textarea';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';
import PaymentStatusBadge from '@/components/admin/PaymentStatusBadge';
import { useDemoStore } from '@/lib/DemoStore';
import { useLanguage } from '@/hooks/useLanguage';
import { formatCurrency, formatDateTime, SERVICE_LABELS } from '@/lib/domain';

const ACTIVE_STATUSES = new Set(['nuevo', 'pendiente_pago', 'confirmado', 'en_proceso', 'recogido', 'en_camino']);
const STATUS_STEPS = ['confirmado', 'en_proceso', 'en_camino', 'entregado'];

function statusProgress(status) {
  if (status === 'nuevo' || status === 'pendiente_pago') return 0;
  return Math.max(0, STATUS_STEPS.indexOf(status));
}

export default function ClientArea() {
  const { t } = useLanguage();
  const {
    currentAccount,
    currentCustomer,
    orders,
    conversations,
    logoutClient,
    sendClientPortalMessage,
    authLoading,
    dataLoading,
  } = useDemoStore();
  const [message, setMessage] = useState('');
  const [sending, setSending] = useState(false);

  const customerOrders = useMemo(
    () => orders
      .filter((order) => order.customer_id === currentCustomer?.id)
      .sort((a, b) => new Date(b.created_date) - new Date(a.created_date)),
    [orders, currentCustomer?.id],
  );
  const activeOrder = customerOrders.find((order) => ACTIVE_STATUSES.has(order.order_status));
  const previousOrders = customerOrders.filter((order) => order.id !== activeOrder?.id);
  const paidOrders = customerOrders.filter((order) => order.payment_status === 'pagado');
  const conversation = conversations.find((item) => item.customer_id === currentCustomer?.id);
  const progress = statusProgress(activeOrder?.order_status);

  if (authLoading) {
    return <div className="flex min-h-screen items-center justify-center bg-secondary/30 text-sm text-muted-foreground">Cargando tu cuenta…</div>;
  }
  if (!currentAccount) return <Navigate to="/acceso?return=/mi-cuenta" replace />;
  if (currentAccount.role === 'admin') return <Navigate to="/admin" replace />;
  if (!currentCustomer && !dataLoading) return <Navigate to="/acceso?return=/mi-cuenta" replace />;

  const sendMessage = async (event) => {
    event.preventDefault();
    if (!message.trim() || sending) return;
    setSending(true);
    try {
      await sendClientPortalMessage(message.trim());
      setMessage('');
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <PublicHeader />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl space-y-6">
          <section className="flex flex-col gap-5 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary"><UserRound className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-white/60">{currentAccount.email}</p>
                <h1 className="font-heading text-3xl font-extrabold">Hola, {currentCustomer?.display_name || currentAccount.full_name || 'cliente'}</h1>
                <p className="mt-1 text-sm text-white/65">{activeOrder ? 'Tienes un pedido en curso' : 'Todo listo para tu próximo recado'}</p>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-full"><a href="/#pedido"><Plus className="h-4 w-4" /> {t('account.newOrder')}</a></Button>
              <Button variant="outline" onClick={logoutClient} className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /> {t('account.logout')}</Button>
            </div>
          </section>

          {activeOrder ? (
            <Card className="overflow-hidden rounded-[2rem] border-blue-100 shadow-sm">
              <CardHeader className="gap-4 border-b bg-white md:flex-row md:items-center md:justify-between">
                <div>
                  <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Pedido #{activeOrder.order_number}</p>
                  <CardTitle className="mt-1">{SERVICE_LABELS[activeOrder.service_type] || activeOrder.service_type}</CardTitle>
                  <p className="mt-1 text-sm text-muted-foreground">{activeOrder.preferred_schedule || 'Horario pendiente de confirmación'}</p>
                </div>
                <div className="flex flex-wrap gap-2"><OrderStatusBadge status={activeOrder.order_status} /><PaymentStatusBadge status={activeOrder.payment_status} /></div>
              </CardHeader>
              <CardContent className="p-6 md:p-8">
                <div className="grid gap-5 md:grid-cols-4">
                  {[
                    { label: 'Confirmado', icon: Check },
                    { label: 'En gestión', icon: PackageCheck },
                    { label: 'En camino', icon: Truck },
                    { label: 'Entregado', icon: Check },
                  ].map((step, index) => {
                    const Icon = step.icon;
                    const completed = index <= progress && !['nuevo', 'pendiente_pago'].includes(activeOrder.order_status);
                    return (
                      <div key={step.label} className="relative">
                        <div className={`mb-3 h-1 rounded-full ${completed ? 'bg-primary' : 'bg-muted'}`} />
                        <div className={`flex items-center gap-2 text-sm font-semibold ${completed ? 'text-foreground' : 'text-muted-foreground'}`}>
                          <span className={`flex h-8 w-8 items-center justify-center rounded-full ${completed ? 'bg-primary text-white' : 'bg-muted'}`}><Icon className="h-4 w-4" /></span>
                          {step.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
                <div className="mt-7 grid gap-4 rounded-3xl bg-muted/60 p-5 sm:grid-cols-3">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Entrega</p><p className="mt-1 text-sm font-medium">{activeOrder.delivery_address}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Total</p><p className="mt-1 text-sm font-medium">{activeOrder.total ? formatCurrency(activeOrder.total) : 'Presupuesto pendiente'}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Última actualización</p><p className="mt-1 text-sm font-medium">{formatDateTime(activeOrder.updated_date || activeOrder.created_date)}</p></div>
                </div>
              </CardContent>
            </Card>
          ) : (
            <Card className="rounded-[2rem] border-dashed shadow-sm">
              <CardContent className="flex flex-col items-center py-12 text-center">
                <Clock3 className="mb-4 h-9 w-9 text-primary" />
                <h2 className="font-heading text-xl font-bold">No tienes pedidos en curso</h2>
                <p className="mt-2 text-sm text-muted-foreground">Aquí aparecerá el seguimiento de tu próximo pedido.</p>
              </CardContent>
            </Card>
          )}

          <div className="grid gap-6 lg:grid-cols-[0.85fr_1.15fr]">
            <div className="space-y-6">
              <Card className="rounded-[2rem] shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /> {t('account.historyTitle')}</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {previousOrders.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">{t('account.emptyOrders')}</p> : previousOrders.slice(0, 5).map((order) => (
                    <article key={order.id} className="flex items-center justify-between gap-3 border-b py-3 last:border-0">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-bold">#{order.order_number} · {SERVICE_LABELS[order.service_type] || order.service_type}</p>
                        <p className="text-xs text-muted-foreground">{formatDateTime(order.created_date)}</p>
                      </div>
                      <OrderStatusBadge status={order.order_status} />
                    </article>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><ReceiptText className="h-5 w-5 text-primary" /> Historial de pagos</CardTitle></CardHeader>
                <CardContent className="space-y-2">
                  {paidOrders.length === 0 ? <p className="py-6 text-center text-sm text-muted-foreground">Todavía no hay pagos registrados.</p> : paidOrders.map((order) => (
                    <div key={order.id} className="flex items-center justify-between border-b py-3 last:border-0">
                      <div><p className="text-sm font-semibold">Pedido #{order.order_number}</p><p className="text-xs capitalize text-muted-foreground">{order.payment_method || 'Pago registrado'} · {formatDateTime(order.paid_at || order.updated_date)}</p></div>
                      <strong className="text-sm">{formatCurrency(order.total || 0)}</strong>
                    </div>
                  ))}
                </CardContent>
              </Card>

              <Card className="rounded-[2rem] shadow-sm">
                <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Información básica</CardTitle></CardHeader>
                <CardContent className="space-y-3 text-sm">
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Correo</p><p>{currentAccount.email}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Teléfono</p><p>{currentCustomer?.phone}</p></div>
                  <div><p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Idioma</p><p className="uppercase">{currentCustomer?.language || 'es'}</p></div>
                </CardContent>
              </Card>
            </div>

            <Card className="flex min-h-[620px] flex-col rounded-[2rem] shadow-sm">
              <CardHeader className="border-b">
                <CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> Chat con Administración</CardTitle>
                <p className="text-sm text-muted-foreground">Un único canal para consultar cualquier pedido, pago o entrega.</p>
              </CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col p-4 md:p-6">
                <div className="min-h-0 flex-1 space-y-3 overflow-y-auto rounded-3xl bg-muted/60 p-4">
                  {!conversation?.messages?.length ? <p className="py-10 text-center text-sm text-muted-foreground">{t('account.emptyConversation')}</p> : conversation.messages.map((item) => (
                    <div key={item.id} className={`flex ${item.direction === 'inbound' ? 'justify-end' : 'justify-start'}`}>
                      <div className={`max-w-[88%] rounded-2xl px-4 py-3 text-sm leading-6 ${item.direction === 'inbound' ? 'bg-primary text-primary-foreground' : item.direction === 'system' ? 'border bg-white text-muted-foreground' : 'bg-emerald-100 text-emerald-950'}`}>
                        <p>{item.body}</p>
                        <p className={`mt-1 text-[10px] ${item.direction === 'inbound' ? 'text-white/65' : 'text-muted-foreground'}`}>{formatDateTime(item.at)}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <form onSubmit={sendMessage} className="mt-4 flex items-end gap-2">
                  <Textarea value={message} onChange={(event) => setMessage(event.target.value)} placeholder={t('account.messagePlaceholder')} className="min-h-12 resize-none rounded-2xl" rows={1} />
                  <Button type="submit" size="icon" disabled={sending || !message.trim()} className="h-12 w-12 shrink-0 rounded-full" aria-label={t('account.send')}><Send className="h-4 w-4" /></Button>
                </form>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
