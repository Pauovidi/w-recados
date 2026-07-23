import React, { useMemo, useState } from 'react';
import { Link, Navigate } from 'react-router-dom';
import { ArrowRight, LogOut, MessageCircle, PackageCheck, Plus, Send, UserRound } from 'lucide-react';
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

export default function ClientArea() {
  const { t } = useLanguage();
  const {
    currentAccount, currentCustomer, orders, conversations, logoutClient, sendClientPortalMessage,
  } = useDemoStore();
  const [message, setMessage] = useState('');

  const customerOrders = useMemo(
    () => orders.filter((order) => order.customer_id === currentCustomer?.id),
    [orders, currentCustomer?.id],
  );
  const conversation = conversations.find((item) => item.customer_id === currentCustomer?.id);

  if (!currentAccount || !currentCustomer) return <Navigate to="/acceso?return=/mi-cuenta" replace />;

  const sendMessage = (event) => {
    event.preventDefault();
    if (!message.trim()) return;
    sendClientPortalMessage(message);
    setMessage('');
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <PublicHeader />
      <main className="flex-1 px-4 py-8 md:py-12">
        <div className="mx-auto max-w-6xl">
          <section className="mb-8 flex flex-col gap-5 rounded-[2rem] bg-slate-950 p-6 text-white shadow-xl md:flex-row md:items-center md:justify-between md:p-8">
            <div className="flex items-center gap-4">
              <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-primary"><UserRound className="h-6 w-6" /></div>
              <div>
                <p className="text-sm text-white/60">{currentAccount.email}</p>
                <h1 className="font-heading text-3xl font-extrabold">{currentCustomer.display_name}</h1>
              </div>
            </div>
            <div className="flex flex-wrap gap-2">
              <Button asChild className="rounded-full"><Link to="/#pedido"><Plus className="h-4 w-4" /> {t('account.newOrder')}</Link></Button>
              <Button variant="outline" onClick={logoutClient} className="rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"><LogOut className="h-4 w-4" /> {t('account.logout')}</Button>
            </div>
          </section>

          <div className="grid gap-6 lg:grid-cols-[1.15fr_0.85fr]">
            <Card className="rounded-[2rem] shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><PackageCheck className="h-5 w-5 text-primary" /> {t('account.historyTitle')}</CardTitle></CardHeader>
              <CardContent className="space-y-3">
                {customerOrders.length === 0 ? <p className="py-10 text-center text-sm text-muted-foreground">{t('account.emptyOrders')}</p> : customerOrders.map((order) => (
                  <article key={order.id} className="rounded-3xl border bg-white p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <p className="text-xs font-bold uppercase tracking-[0.15em] text-primary">Pedido #{order.order_number}</p>
                        <h2 className="mt-1 font-heading text-lg font-bold">{SERVICE_LABELS[order.service_type] || order.service_type}</h2>
                        <p className="mt-1 text-xs text-muted-foreground">{formatDateTime(order.created_date)}</p>
                      </div>
                      <div className="flex flex-wrap gap-2"><OrderStatusBadge status={order.order_status} /><PaymentStatusBadge status={order.payment_status} /></div>
                    </div>
                    <p className="mt-4 line-clamp-2 text-sm leading-6 text-muted-foreground">{order.original_text}</p>
                    <div className="mt-4 flex items-center justify-between border-t pt-4">
                      <span className="text-sm font-semibold">{order.total ? formatCurrency(order.total) : 'Presupuesto pendiente'}</span>
                      <span className="inline-flex items-center gap-1 text-xs font-semibold text-primary">Actualizaciones en esta cuenta <ArrowRight className="h-3.5 w-3.5" /></span>
                    </div>
                  </article>
                ))}
              </CardContent>
            </Card>

            <Card className="flex min-h-[540px] flex-col rounded-[2rem] shadow-sm">
              <CardHeader><CardTitle className="flex items-center gap-2"><MessageCircle className="h-5 w-5 text-emerald-600" /> {t('account.conversationsTitle')}</CardTitle></CardHeader>
              <CardContent className="flex min-h-0 flex-1 flex-col">
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
                  <Button type="submit" size="icon" className="h-12 w-12 shrink-0 rounded-full" aria-label={t('account.send')}><Send className="h-4 w-4" /></Button>
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
