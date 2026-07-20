import React from 'react';
import {
  CheckCircle2,
  Clock3,
  MapPin,
  MessageCircle,
  Navigation,
  NotebookText,
  PackageCheck,
  Phone,
  ReceiptText,
  ShoppingBag,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { formatCurrency, getStatus, normalizePhone, SERVICE_LABELS } from '@/lib/domain';

const SCHEDULE_LABELS = {
  'mañana': 'Por la mañana (9–13 h)',
  mediodia: 'Al mediodía (13–16 h)',
  'mediodía': 'Al mediodía (13–16 h)',
  tarde: 'Por la tarde (16–20 h)',
  lo_antes_posible: 'Lo antes posible',
};

const STATUS_TONE_CLASSES = {
  blue: 'border-blue-200 bg-blue-50 text-blue-700',
  violet: 'border-violet-200 bg-violet-50 text-violet-700',
  amber: 'border-amber-200 bg-amber-50 text-amber-700',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  indigo: 'border-indigo-200 bg-indigo-50 text-indigo-700',
  cyan: 'border-cyan-200 bg-cyan-50 text-cyan-700',
  orange: 'border-orange-200 bg-orange-50 text-orange-700',
  green: 'border-green-200 bg-green-50 text-green-700',
  red: 'border-red-200 bg-red-50 text-red-700',
};

const NEXT_ACTION = {
  en_proceso: {
    status: 'recogido',
    label: 'Confirmar recogida',
    hint: 'Ya tengo todos los productos',
    icon: PackageCheck,
  },
  recogido: {
    status: 'en_camino',
    label: 'Empezar la entrega',
    hint: 'Salgo hacia el cliente',
    icon: Navigation,
  },
  en_camino: {
    status: 'entregado',
    label: 'Confirmar entrega',
    hint: 'El cliente ha recibido el pedido',
    icon: CheckCircle2,
  },
};

function DetailRow({ icon: Icon, label, children }) {
  return (
    <div className="flex items-start gap-3 rounded-2xl bg-muted/55 p-3.5">
      <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-background text-primary shadow-sm">
        <Icon className="h-4 w-4" />
      </span>
      <div className="min-w-0 pt-0.5">
        <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{label}</p>
        <div className="mt-0.5 break-words text-sm font-semibold leading-5 text-foreground">{children}</div>
      </div>
    </div>
  );
}

export default function AssignedOrderCard({ order, onUpdateStatus }) {
  const status = getStatus(order.order_status);
  const nextAction = NEXT_ACTION[order.order_status];
  const ActionIcon = nextAction?.icon;
  const phone = normalizePhone(order.client_phone);
  const whatsappPhone = phone.replace(/\D/g, '');
  const orderReference = order.order_number || order.id?.slice(-6) || '—';
  const translatedText = order.translated_text || order.original_text || 'Sin descripción del recado.';
  const schedule = SCHEDULE_LABELS[order.preferred_schedule]
    || order.preferred_schedule
    || 'Sin horario indicado';
  const whatsappText = encodeURIComponent(
    `Hola, soy tu repartidor. Te contacto por el pedido #${orderReference}.`,
  );
  const whatsappHref = whatsappPhone
    ? `https://wa.me/${whatsappPhone}?text=${whatsappText}`
    : '';
  const demoNavigatorVisible = import.meta.env.VITE_DEMO_MODE !== 'false';

  return (
    <Card data-testid={`courier-order-${order.id}`} className="overflow-visible rounded-3xl border-border/80 shadow-sm">
      <CardContent className="space-y-4 p-4 sm:p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-xl font-extrabold">#{orderReference}</span>
              <span className={`rounded-full border px-2.5 py-1 text-xs font-bold ${STATUS_TONE_CLASSES[status.tone] || STATUS_TONE_CLASSES.blue}`}>
                {status.label}
              </span>
            </div>
            <p className="mt-1.5 flex items-center gap-1.5 text-sm font-medium text-muted-foreground">
              <ShoppingBag className="h-4 w-4" />
              {SERVICE_LABELS[order.service_type] || order.service_type || 'Recado'}
            </p>
          </div>
          <div className="shrink-0 text-right">
            <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">Importe</p>
            <p className="mt-0.5 text-lg font-extrabold text-foreground">{formatCurrency(order.total)}</p>
          </div>
        </div>

        <section className="rounded-2xl border border-primary/15 bg-primary/5 p-4" aria-label="Descripción traducida del pedido">
          <div className="mb-2 flex items-center gap-2 text-sm font-bold text-primary">
            <ReceiptText className="h-4 w-4" />
            Lista traducida al español
          </div>
          <p className="whitespace-pre-wrap text-[15px] font-medium leading-6 text-foreground">{translatedText}</p>
        </section>

        <div className="grid gap-2 sm:grid-cols-2">
          <DetailRow icon={MapPin} label="Entrega">
            {order.delivery_address || 'Sin dirección indicada'}
          </DetailRow>
          <DetailRow icon={Clock3} label="Horario">
            {schedule}
          </DetailRow>
          <DetailRow icon={Phone} label="Teléfono">
            {order.client_phone || 'Sin teléfono indicado'}
          </DetailRow>
          <DetailRow icon={ReceiptText} label="Total">
            {formatCurrency(order.total)}
          </DetailRow>
        </div>

        {(order.client_notes || order.internal_notes) && (
          <section className="space-y-2 rounded-2xl border border-amber-200/80 bg-amber-50 p-4 text-amber-950">
            <div className="flex items-center gap-2 text-sm font-bold">
              <NotebookText className="h-4 w-4" />
              Notas importantes
            </div>
            {order.client_notes && (
              <div>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/75">Cliente</p>
                <p className="mt-1 whitespace-pre-wrap text-sm leading-5">{order.client_notes}</p>
              </div>
            )}
            {order.internal_notes && (
              <div className={order.client_notes ? 'border-t border-amber-200 pt-2' : ''}>
                <p className="text-xs font-semibold uppercase tracking-wide text-amber-800/75">Administración</p>
                <p className="mt-1 whitespace-pre-wrap text-sm font-medium leading-5">{order.internal_notes}</p>
              </div>
            )}
          </section>
        )}

        <div className="grid grid-cols-2 gap-2">
          {phone ? (
            <Button asChild variant="outline" className="h-12 rounded-2xl text-sm font-bold">
              <a href={`tel:${phone}`} aria-label={`Llamar al cliente del pedido ${orderReference}`}>
                <Phone className="h-5 w-5" />
                Llamar
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline" className="h-12 rounded-2xl text-sm font-bold">
              <Phone className="h-5 w-5" />
              Llamar
            </Button>
          )}
          {whatsappHref ? (
            <Button asChild variant="outline" className="h-12 rounded-2xl border-emerald-300 text-sm font-bold text-emerald-700 hover:bg-emerald-50 hover:text-emerald-800">
              <a
                href={whatsappHref}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={`Abrir WhatsApp con el cliente del pedido ${orderReference}`}
              >
                <MessageCircle className="h-5 w-5" />
                WhatsApp
              </a>
            </Button>
          ) : (
            <Button disabled variant="outline" className="h-12 rounded-2xl text-sm font-bold">
              <MessageCircle className="h-5 w-5" />
              WhatsApp
            </Button>
          )}
        </div>

        {nextAction ? (
          <div className={`sticky z-20 -mx-1 rounded-[1.25rem] border border-border/80 bg-card/95 p-2 shadow-lg backdrop-blur sm:static sm:mx-0 sm:border-0 sm:bg-transparent sm:p-0 sm:shadow-none ${demoNavigatorVisible ? 'bottom-20' : 'bottom-3'}`}>
            <Button
              size="lg"
              className="h-14 w-full rounded-2xl text-base font-extrabold shadow-md"
              onClick={() => onUpdateStatus(order.id, nextAction.status)}
            >
              <ActionIcon className="h-5 w-5" />
              <span className="flex flex-col items-start leading-tight">
                <span>{nextAction.label}</span>
                <span className="text-[11px] font-medium opacity-80">{nextAction.hint}</span>
              </span>
            </Button>
          </div>
        ) : order.order_status === 'entregado' ? (
          <div className="flex items-center justify-center gap-2 rounded-2xl bg-emerald-50 px-4 py-3.5 text-sm font-bold text-emerald-700">
            <CheckCircle2 className="h-5 w-5" />
            Pedido entregado
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
