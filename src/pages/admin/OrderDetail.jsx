import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import {
  ArrowLeft, Boxes, Building2, Clock3, Copy, CreditCard, ExternalLink, FileText, Globe2,
  History, Mail, MapPin, MessageCircle, PackageCheck, Phone, Save, Send, Truck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Textarea } from '@/components/ui/textarea';
import OrderStatusBadge from '@/components/admin/OrderStatusBadge';
import PaymentStatusBadge from '@/components/admin/PaymentStatusBadge';
import { useDemoStore } from '@/lib/DemoStore';
import {
  formatCurrency, formatDateTime, LANGUAGE_LABELS, normalizePhone, ORDER_STATUSES, PAYMENT_METHODS, SERVICE_LABELS,
} from '@/lib/domain';

export default function OrderDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const {
    orders, couriers, businesses = [], packages = [], conversations, updateOrder, assignCourier,
    assignBusinesses, assignPackages, quoteOrder, markManualPaid,
  } = useDemoStore();
  const order = orders.find((item) => item.id === id);
  const [form, setForm] = useState(null);
  const [copied, setCopied] = useState(false);
  const [businessIds, setBusinessIds] = useState([]);
  const [packageIds, setPackageIds] = useState([]);

  useEffect(() => {
    if (order) {
      setForm({ ...order, payment_method: order.payment_method || 'stripe' });
      setBusinessIds((order.business_assignments || []).map((assignment) => assignment.business_id));
      setPackageIds(order.package_ids || []);
    }
  }, [order]);

  const conversation = useMemo(
    () => conversations.find((item) => item.phone === order?.client_phone),
    [conversations, order?.client_phone],
  );

  if (!order || !form) {
    return (
      <div className="rounded-3xl border border-border bg-card p-10 text-center">
        <p className="font-bold">Pedido no encontrado</p>
        <Button variant="outline" className="mt-4 rounded-full" onClick={() => navigate('/admin')}>Volver</Button>
      </div>
    );
  }

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));

  const save = () => {
    updateOrder(order.id, {
      internal_notes: form.internal_notes,
      client_notes: form.client_notes,
      product_cost: Number(form.product_cost || 0),
      transport_cost: Number(form.transport_cost || 0),
      service_cost: Number(form.service_cost || 0),
      payment_method: form.payment_method || 'stripe',
    });
  };

  const createQuote = () => {
    save();
    quoteOrder(order.id, {
      product_cost: form.product_cost,
      transport_cost: form.transport_cost,
      service_cost: form.service_cost,
    }, form.payment_method || 'stripe');
  };

  const registerManualPayment = () => {
    save();
    markManualPaid(order.id, form.payment_method);
  };

  const total = Number(form.product_cost || 0) + Number(form.transport_cost || 0) + Number(form.service_cost || 0);
  const paymentMethod = form.payment_method || 'stripe';
  const paymentMethodLabel = PAYMENT_METHODS.find((method) => method.value === paymentMethod)?.label || paymentMethod;
  const activeBusinesses = businesses.filter((business) => business.is_active || businessIds.includes(business.id));
  const activePackages = packages.filter((productPackage) => productPackage.is_active || packageIds.includes(productPackage.id));
  const assignedBusinesses = order.business_assignments || [];
  const assignedPackages = packages.filter((productPackage) => packageIds.includes(productPackage.id));
  const businessMessage = [
    `Pedido #${order.order_number}`,
    '',
    'Lista en español:',
    order.translated_text || order.original_text,
    '',
    `Entrega: ${order.delivery_address || 'Sin dirección indicada'}`,
    order.client_notes ? `Notas del cliente: ${order.client_notes}` : '',
  ].filter(Boolean).join('\n');
  const toggleId = (ids, setIds, targetId, checked) => setIds(checked
    ? [...new Set([...ids, targetId])]
    : ids.filter((item) => item !== targetId));
  const getBusinessWhatsAppUrl = (assignment) => assignment.business_phone
    ? `https://wa.me/${normalizePhone(assignment.business_phone).replace(/\D/g, '')}?text=${encodeURIComponent(businessMessage)}`
    : '';
  const getBusinessEmailUrl = (assignment) => assignment.business_email
    ? `mailto:${assignment.business_email}?subject=${encodeURIComponent(`Pedido #${order.order_number}`)}&body=${encodeURIComponent(businessMessage)}`
    : '';
  const whatsappUrl = `https://wa.me/${normalizePhone(order.client_phone).replace(/\D/g, '')}?text=${encodeURIComponent(`Hola, te contactamos por tu pedido #${order.order_number}.`)}`;

  const copyPaymentLink = async () => {
    if (!order.payment_link) return;
    await navigator.clipboard.writeText(order.payment_link);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1500);
  };

  return (
    <div className="space-y-5 pb-24">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <Button variant="outline" size="icon" className="rounded-full" onClick={() => navigate('/admin')}>
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <div>
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="font-heading text-2xl font-black">Pedido #{order.order_number}</h1>
              <OrderStatusBadge status={order.order_status} />
              <PaymentStatusBadge status={order.payment_status} />
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Recibido {formatDateTime(order.created_date)}</p>
          </div>
        </div>
        <Button className="rounded-full" onClick={save}><Save className="h-4 w-4" /> Guardar cambios</Button>
      </div>

      <div className="grid gap-5 xl:grid-cols-[1.35fr_0.85fr]">
        <div className="space-y-5">
          <Card className="rounded-[2rem]">
            <CardHeader><CardTitle className="flex items-center gap-2"><FileText className="h-5 w-5 text-primary" /> Solicitud del cliente</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="rounded-3xl bg-blue-50 p-5">
                <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.16em] text-blue-700">
                  <Globe2 className="h-4 w-4" /> Traducción al español
                </div>
                <p className="whitespace-pre-wrap text-sm font-medium leading-6 text-blue-950">{order.translated_text}</p>
                {order.translation_mode === 'demo' && <p className="mt-3 text-[11px] text-blue-600">Traducción demostrativa · en producción se validará mediante el servicio configurado.</p>}
              </div>
              {order.original_text !== order.translated_text && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Original · {LANGUAGE_LABELS[order.client_language] || order.client_language}</p>
                  <p className="whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{order.original_text}</p>
                </div>
              )}
              <div className="grid gap-3 sm:grid-cols-2">
                <Info icon={PackageCheck} label="Servicio" value={SERVICE_LABELS[order.service_type] || order.service_type} />
                <Info icon={Clock3} label="Horario" value={order.preferred_schedule || 'Flexible'} />
                <Info icon={MapPin} label="Entrega" value={order.delivery_address} />
                <Info icon={Phone} label="Teléfono" value={order.client_phone} />
              </div>

              {order.attachments?.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-bold uppercase tracking-[0.16em] text-muted-foreground">Adjuntos</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    {order.attachments.map((attachment) => (
                      <a
                        key={attachment.id}
                        href={attachment.data_url || undefined}
                        target={attachment.data_url ? '_blank' : undefined}
                        rel="noreferrer"
                        className={`flex items-center gap-3 rounded-2xl border p-3 text-sm ${attachment.data_url ? 'hover:border-primary' : 'cursor-default opacity-75'}`}
                      >
                        <FileText className="h-4 w-4 text-primary" />
                        <span className="min-w-0 flex-1 truncate">{attachment.name}</span>
                        {attachment.data_url && <ExternalLink className="h-3.5 w-3.5" />}
                      </a>
                    ))}
                  </div>
                </div>
              )}

              <div className="space-y-2">
                <Label>Notas del cliente</Label>
                <Textarea value={form.client_notes || ''} onChange={(event) => setField('client_notes', event.target.value)} className="min-h-24 rounded-2xl" />
              </div>
              <div className="space-y-2">
                <Label>Notas internas</Label>
                <Textarea value={form.internal_notes || ''} onChange={(event) => setField('internal_notes', event.target.value)} placeholder="Aclaraciones, sustituciones, compras en distintos establecimientos…" className="min-h-28 rounded-2xl" />
              </div>

              <div className="rounded-3xl border border-violet-200 bg-violet-50/60 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <p className="flex items-center gap-2 text-sm font-bold text-violet-950"><Boxes className="h-4 w-4" /> Paquetes de referencia</p>
                    <p className="mt-1 text-xs leading-5 text-violet-800">Opcionales y solo internos: no sustituyen la lista libre del cliente.</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-full" onClick={() => assignPackages(order.id, packageIds)}>Guardar paquetes</Button>
                </div>
                <div className="mt-4 grid gap-2">
                  {activePackages.length === 0 ? <p className="text-sm text-muted-foreground">No hay paquetes activos.</p> : activePackages.map((productPackage) => (
                    <label key={productPackage.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border border-violet-100 bg-white p-3">
                      <Checkbox checked={packageIds.includes(productPackage.id)} onCheckedChange={(checked) => toggleId(packageIds, setPackageIds, productPackage.id, checked)} />
                      <span className="min-w-0"><span className="block text-sm font-semibold">{productPackage.name}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{productPackage.contents}</span></span>
                    </label>
                  ))}
                </div>
                {assignedPackages.length > 0 && <p className="mt-3 text-xs font-medium text-violet-800">Aplicados: {assignedPackages.map((productPackage) => productPackage.name).join(', ')}.</p>}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem]">
            <CardHeader><CardTitle className="flex items-center gap-2"><History className="h-5 w-5 text-primary" /> Historial</CardTitle></CardHeader>
            <CardContent>
              <div className="space-y-4">
                {[...(order.status_history || [])].reverse().map((event, index) => (
                  <div key={`${event.status}-${event.at}-${index}`} className="flex gap-3">
                    <div className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-primary" />
                    <div>
                      <p className="text-sm font-semibold">{ORDER_STATUSES.find((item) => item.value === event.status)?.label || event.status}</p>
                      <p className="text-xs text-muted-foreground">{event.actor} · {formatDateTime(event.at)}</p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-5">
          <Card className="rounded-[2rem]">
            <CardHeader><CardTitle>Operación</CardTitle></CardHeader>
            <CardContent className="space-y-5">
              <div className="space-y-2">
                <Label>Estado del pedido</Label>
                <Select value={order.order_status} onValueChange={(value) => updateOrder(order.id, { order_status: value })}>
                  <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                  <SelectContent>{ORDER_STATUSES.map((status) => <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>)}</SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Repartidor asignado</Label>
                <Select value={order.assigned_delivery || 'none'} onValueChange={(value) => assignCourier(order.id, value === 'none' ? '' : value)}>
                  <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder="Sin asignar" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">Sin asignar</SelectItem>
                    {couriers.filter((courier) => courier.is_active).map((courier) => <SelectItem key={courier.id} value={courier.id}>{courier.name}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              <div className="grid gap-2">
                <a href={whatsappUrl} target="_blank" rel="noreferrer"><Button variant="outline" className="h-12 w-full rounded-full"><MessageCircle className="h-4 w-4 text-emerald-600" /> WhatsApp cliente</Button></a>
                {conversation && <Link to={`/admin/conversaciones?chat=${conversation.id}`}><Button variant="outline" className="h-12 w-full rounded-full"><MessageCircle className="h-4 w-4" /> Abrir conversación</Button></Link>}
              </div>
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-emerald-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><Building2 className="h-5 w-5 text-emerald-600" /> Negocios asignados</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm leading-6 text-muted-foreground">El cliente no ve esta asignación. Puedes enviar a cada negocio la lista traducida, entrega y notas.</p>
              <div className="space-y-2">
                {activeBusinesses.length === 0 ? <p className="text-sm text-muted-foreground">No hay negocios activos.</p> : activeBusinesses.map((business) => (
                  <label key={business.id} className="flex cursor-pointer items-start gap-3 rounded-2xl border p-3">
                    <Checkbox checked={businessIds.includes(business.id)} onCheckedChange={(checked) => toggleId(businessIds, setBusinessIds, business.id, checked)} />
                    <span className="min-w-0"><span className="block text-sm font-semibold">{business.name}</span><span className="mt-0.5 block text-xs text-muted-foreground">{business.category || 'Sin categoría'} · {business.preferred_channel === 'email' ? 'Email' : business.preferred_channel === 'both' ? 'WhatsApp y email' : 'WhatsApp'}</span></span>
                  </label>
                ))}
              </div>
              <Button data-testid="business-assignment-save" variant="outline" className="h-11 w-full rounded-full" onClick={() => assignBusinesses(order.id, businessIds)}><Save className="h-4 w-4" /> Guardar asignación</Button>
              {assignedBusinesses.length > 0 && <div className="space-y-2 border-t pt-4">
                <p className="text-xs font-bold uppercase tracking-[0.14em] text-muted-foreground">Enviar pedido en español</p>
                {assignedBusinesses.map((assignment) => {
                  const whatsappHref = getBusinessWhatsAppUrl(assignment);
                  const emailHref = getBusinessEmailUrl(assignment);
                  return <div key={assignment.business_id} className="rounded-2xl bg-emerald-50 p-3"><p className="text-sm font-semibold text-emerald-950">{assignment.business_name}</p><div className="mt-2 flex flex-wrap gap-2">{whatsappHref && assignment.preferred_channel !== 'email' && <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 bg-white"><a href={whatsappHref} target="_blank" rel="noreferrer"><MessageCircle className="h-3.5 w-3.5 text-emerald-600" /> WhatsApp</a></Button>}{emailHref && assignment.preferred_channel !== 'whatsapp' && <Button asChild variant="outline" size="sm" className="rounded-full border-emerald-200 bg-white"><a href={emailHref}><Mail className="h-3.5 w-3.5" /> Email</a></Button>}{!whatsappHref && !emailHref && <span className="text-xs text-muted-foreground">Sin canal de contacto.</span>}</div></div>;
                })}
              </div>}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] border-blue-100">
            <CardHeader><CardTitle className="flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Presupuesto y pago</CardTitle></CardHeader>
            <CardContent className="space-y-4">
              <MoneyInput label="Compras" value={form.product_cost} onChange={(value) => setField('product_cost', value)} />
              <MoneyInput label="Transporte" value={form.transport_cost} onChange={(value) => setField('transport_cost', value)} />
              <MoneyInput label="Servicio" value={form.service_cost} onChange={(value) => setField('service_cost', value)} />
              <div className="space-y-2"><Label>Método de pago</Label><Select value={paymentMethod} onValueChange={(value) => setField('payment_method', value)}><SelectTrigger data-testid="payment-method" className="h-12 rounded-2xl"><SelectValue /></SelectTrigger><SelectContent>{PAYMENT_METHODS.map((method) => <SelectItem key={method.value} value={method.value}>{method.label}</SelectItem>)}</SelectContent></Select></div>
              <div className="flex items-center justify-between rounded-2xl bg-slate-950 p-4 text-white">
                <span className="text-sm font-semibold">Total</span>
                <strong className="text-2xl">{formatCurrency(total)}</strong>
              </div>
              <Button className="h-12 w-full rounded-full" onClick={createQuote} disabled={total <= 0 || order.payment_status === 'pagado'}>
                <CreditCard className="h-4 w-4" /> {paymentMethod === 'stripe' ? (order.payment_link ? 'Actualizar enlace Stripe' : 'Generar enlace de pago') : 'Registrar solicitud de pago'}
              </Button>
              {paymentMethod !== 'stripe' && order.payment_status !== 'pagado' && <Button variant="outline" className="h-12 w-full rounded-full" onClick={registerManualPayment} disabled={total <= 0}><Send className="h-4 w-4" /> Marcar cobrado por {paymentMethodLabel}</Button>}
              {order.payment_status === 'pagado' && <p className="rounded-2xl bg-emerald-50 p-3 text-sm font-semibold text-emerald-800">Pago registrado · {PAYMENT_METHODS.find((method) => method.value === order.payment_method)?.label || order.payment_method || 'sin método'}</p>}
              {order.payment_link && (
                <div className="rounded-2xl border bg-slate-50 p-3">
                  <p className="text-[11px] font-bold uppercase tracking-[0.16em] text-muted-foreground">Enlace Stripe demo</p>
                  <div className="mt-2 flex items-center gap-2">
                    <Input readOnly value={order.payment_link} className="h-10 min-w-0 rounded-xl bg-white text-xs" />
                    <Button variant="outline" size="icon" className="shrink-0 rounded-xl" onClick={copyPaymentLink} title="Copiar enlace">
                      <Copy className="h-4 w-4" />
                    </Button>
                  </div>
                  {copied && <p className="mt-2 text-xs font-semibold text-emerald-700">Enlace copiado</p>}
                  <a href={order.payment_link} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-primary">Abrir pago <ExternalLink className="h-3 w-3" /></a>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="rounded-[2rem] bg-slate-950 text-white">
            <CardContent className="p-5">
              <div className="flex items-start gap-3">
                <Truck className="mt-0.5 h-5 w-5 text-blue-400" />
                <div>
                  <p className="font-bold">Operativa multi-negocio</p>
                  <p className="mt-1 text-sm leading-6 text-white/60">Puedes asignar varios negocios y compartir con cada uno la misma solicitud traducida, entrega y notas del cliente.</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}

function Info({ icon: Icon, label, value }) {
  return (
    <div className="rounded-2xl border p-4">
      <p className="flex items-center gap-2 text-xs font-medium text-muted-foreground"><Icon className="h-4 w-4" /> {label}</p>
      <p className="mt-2 text-sm font-semibold leading-5">{value || '—'}</p>
    </div>
  );
}

function MoneyInput({ label, value, onChange }) {
  const testId = `cost-${label.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-')}`;
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <div className="relative">
        <Input data-testid={testId} type="number" min="0" step="0.01" value={value || ''} onChange={(event) => onChange(event.target.value)} className="h-12 rounded-2xl pr-10" placeholder="0,00" />
        <span className="absolute right-4 top-1/2 -translate-y-1/2 text-sm font-bold text-muted-foreground">€</span>
      </div>
    </div>
  );
}
