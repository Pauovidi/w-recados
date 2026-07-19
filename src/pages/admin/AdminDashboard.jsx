import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ChevronRight,
  CircleDollarSign,
  Clock3,
  FilterX,
  Globe2,
  MapPin,
  PackageSearch,
  Phone,
  Search,
  ShoppingBag,
  Truck,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useDemoStore } from '@/lib/DemoStore';
import {
  formatCurrency,
  formatDateTime,
  getStatus,
  ORDER_STATUSES,
  PAYMENT_STATUSES,
  SERVICE_LABELS,
} from '@/lib/domain';

const ACTIVE_ORDER_STATUSES = new Set(['pagado', 'asignado', 'recogido', 'en_camino']);

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

const PAYMENT_TONE_CLASSES = {
  sin_presupuestar: 'border-slate-200 bg-slate-50 text-slate-700',
  pendiente: 'border-amber-200 bg-amber-50 text-amber-700',
  pagado: 'border-emerald-200 bg-emerald-50 text-emerald-700',
  reembolsado: 'border-violet-200 bg-violet-50 text-violet-700',
};

function timestamp(value) {
  const parsed = Date.parse(value || '');
  return Number.isNaN(parsed) ? 0 : parsed;
}

function MetricCard({ icon: Icon, label, value, hint, iconClassName }) {
  return (
    <Card className="rounded-3xl border-border/70 p-4 shadow-sm sm:p-5">
      <div className="flex items-center gap-2.5">
        <span className={`flex h-9 w-9 items-center justify-center rounded-2xl ${iconClassName}`}>
          <Icon className="h-4 w-4" />
        </span>
        <p className="text-xs font-semibold uppercase tracking-[0.12em] text-muted-foreground">{label}</p>
      </div>
      <p className="mt-4 font-heading text-3xl font-extrabold tracking-tight">{value}</p>
      <p className="mt-1 text-xs text-muted-foreground">{hint}</p>
    </Card>
  );
}

function OrderStatusBadge({ value }) {
  const status = getStatus(value);

  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap text-[11px] font-semibold ${STATUS_TONE_CLASSES[status.tone] || STATUS_TONE_CLASSES.blue}`}
    >
      {status.label}
    </Badge>
  );
}

function PaymentBadge({ value }) {
  const payment = PAYMENT_STATUSES.find((item) => item.value === value);

  return (
    <Badge
      variant="outline"
      className={`whitespace-nowrap text-[11px] font-semibold ${PAYMENT_TONE_CLASSES[value] || PAYMENT_TONE_CLASSES.sin_presupuestar}`}
    >
      {payment?.label || value || 'Sin estado'}
    </Badge>
  );
}

function OrderCard({ order }) {
  const orderReference = order.order_number || order.id;
  const mainText = order.translated_text || order.original_text || 'Sin descripción';
  const hasDifferentOriginal = Boolean(
    order.original_text
      && order.translated_text
      && order.original_text !== order.translated_text,
  );

  return (
    <Link
      to={`/admin/pedido/${order.id}`}
      className="group block rounded-3xl outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2"
    >
      <Card className="rounded-3xl border-border/70 p-4 shadow-sm transition duration-200 group-hover:-translate-y-0.5 group-hover:border-primary/25 group-hover:shadow-md sm:p-5">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-center">
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2">
              <span className="font-heading text-sm font-extrabold">Pedido #{orderReference}</span>
              <Badge variant="secondary" className="text-[11px] font-semibold">
                {SERVICE_LABELS[order.service_type] || order.service_type || 'Sin tipo'}
              </Badge>
              <OrderStatusBadge value={order.order_status} />
              <PaymentBadge value={order.payment_status} />
              {(order.client_language || order.original_language) && (
                <Badge variant="outline" className="gap-1 text-[11px] font-semibold uppercase">
                  <Globe2 className="h-3 w-3" />
                  {order.client_language || order.original_language}
                </Badge>
              )}
            </div>

            <p className="mt-3 line-clamp-2 text-sm font-semibold leading-6 text-foreground sm:text-base">
              {mainText}
            </p>
            {hasDifferentOriginal && (
              <p className="mt-1 line-clamp-1 text-xs leading-5 text-muted-foreground">
                Original: {order.original_text}
              </p>
            )}

            <div className="mt-4 grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 xl:grid-cols-3">
              <span className="flex min-w-0 items-center gap-2">
                <Phone className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.client_phone || 'Sin teléfono'}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <MapPin className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.delivery_address || 'Sin dirección'}</span>
              </span>
              <span className="flex min-w-0 items-center gap-2">
                <Truck className="h-3.5 w-3.5 shrink-0" />
                <span className="truncate">{order.assigned_delivery_name || 'Sin repartidor'}</span>
              </span>
            </div>
          </div>

          <div className="flex items-center justify-between gap-4 border-t border-border/70 pt-4 lg:w-48 lg:shrink-0 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0">
            <div>
              <p className="text-xs text-muted-foreground">{formatDateTime(order.created_date)}</p>
              <p className="mt-1 font-heading text-lg font-extrabold">
                {Number(order.total) > 0 ? formatCurrency(order.total) : 'Sin presupuesto'}
              </p>
            </div>
            <ChevronRight className="h-5 w-5 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-1 group-hover:text-primary" />
          </div>
        </div>
      </Card>
    </Link>
  );
}

export default function AdminDashboard() {
  const { orders = [], couriers = [] } = useDemoStore();
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [serviceFilter, setServiceFilter] = useState('all');
  const [paymentFilter, setPaymentFilter] = useState('all');
  const [courierFilter, setCourierFilter] = useState('all');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const metrics = useMemo(() => ({
    total: orders.length,
    new: orders.filter((order) => order.order_status === 'nuevo').length,
    pendingPayment: orders.filter((order) => (
      order.payment_status === 'pendiente' || order.order_status === 'pendiente_pago'
    )).length,
    active: orders.filter((order) => ACTIVE_ORDER_STATUSES.has(order.order_status)).length,
    completed: orders.filter((order) => order.order_status === 'entregado').length,
  }), [orders]);

  const serviceOptions = useMemo(() => {
    const options = new Map(Object.entries(SERVICE_LABELS));
    orders.forEach((order) => {
      if (order.service_type && !options.has(order.service_type)) {
        options.set(order.service_type, order.service_type);
      }
    });
    return [...options.entries()];
  }, [orders]);

  const courierOptions = useMemo(() => {
    const options = new Map(couriers.map((courier) => [courier.id, courier.name]));
    orders.forEach((order) => {
      if (order.assigned_delivery && !options.has(order.assigned_delivery)) {
        options.set(order.assigned_delivery, order.assigned_delivery_name || order.assigned_delivery);
      }
    });
    return [...options.entries()];
  }, [couriers, orders]);

  const filteredOrders = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const queryDigits = search.replace(/\D/g, '');
    const fromTimestamp = dateFrom ? new Date(`${dateFrom}T00:00:00`).getTime() : null;
    const toTimestamp = dateTo ? new Date(`${dateTo}T23:59:59.999`).getTime() : null;

    return orders
      .filter((order) => {
        const searchableText = [
          order.id,
          order.order_number,
          order.order_number ? `#${order.order_number}` : '',
          order.client_phone,
          order.delivery_address,
          order.original_text,
          order.translated_text,
        ]
          .filter(Boolean)
          .join(' ')
          .toLocaleLowerCase('es');
        const phoneDigits = String(order.client_phone || '').replace(/\D/g, '');
        const orderTimestamp = timestamp(order.created_date);
        const matchesSearch = !query
          || searchableText.includes(query)
          || (queryDigits.length >= 3 && phoneDigits.includes(queryDigits));
        const matchesStatus = statusFilter === 'all' || order.order_status === statusFilter;
        const matchesService = serviceFilter === 'all' || order.service_type === serviceFilter;
        const matchesPayment = paymentFilter === 'all' || order.payment_status === paymentFilter;
        const matchesCourier = courierFilter === 'all'
          || (courierFilter === 'unassigned'
            ? !order.assigned_delivery
            : order.assigned_delivery === courierFilter);
        const matchesFrom = fromTimestamp === null || orderTimestamp >= fromTimestamp;
        const matchesTo = toTimestamp === null || orderTimestamp <= toTimestamp;

        return matchesSearch
          && matchesStatus
          && matchesService
          && matchesPayment
          && matchesCourier
          && matchesFrom
          && matchesTo;
      })
      .sort((first, second) => timestamp(second.created_date) - timestamp(first.created_date));
  }, [courierFilter, dateFrom, dateTo, orders, paymentFilter, search, serviceFilter, statusFilter]);

  const hasFilters = Boolean(
    search.trim()
      || statusFilter !== 'all'
      || serviceFilter !== 'all'
      || paymentFilter !== 'all'
      || courierFilter !== 'all'
      || dateFrom
      || dateTo,
  );
  const invalidDateRange = Boolean(dateFrom && dateTo && dateFrom > dateTo);

  const clearFilters = () => {
    setSearch('');
    setStatusFilter('all');
    setServiceFilter('all');
    setPaymentFilter('all');
    setCourierFilter('all');
    setDateFrom('');
    setDateTo('');
  };

  return (
    <div className="space-y-6 pb-8">
      <header className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-primary">Operación diaria</p>
          <h1 className="mt-1 font-heading text-3xl font-extrabold tracking-tight sm:text-4xl">Pedidos</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Revisa, filtra y abre cualquier solicitud desde un único panel.
          </p>
        </div>
        <p className="text-sm font-medium text-muted-foreground">
          {orders.length} {orders.length === 1 ? 'pedido registrado' : 'pedidos registrados'}
        </p>
      </header>

      <section aria-label="Métricas de pedidos" className="grid grid-cols-2 gap-3 lg:grid-cols-5">
        <MetricCard
          icon={ShoppingBag}
          label="Total"
          value={metrics.total}
          hint="Solicitudes registradas"
          iconClassName="bg-slate-100 text-slate-700"
        />
        <MetricCard
          icon={Clock3}
          label="Nuevos"
          value={metrics.new}
          hint="Pendientes de revisar"
          iconClassName="bg-blue-50 text-blue-700"
        />
        <MetricCard
          icon={CircleDollarSign}
          label="Pago pendiente"
          value={metrics.pendingPayment}
          hint="Esperando confirmación"
          iconClassName="bg-amber-50 text-amber-700"
        />
        <MetricCard
          icon={Truck}
          label="En curso"
          value={metrics.active}
          hint="Compra o entrega activa"
          iconClassName="bg-cyan-50 text-cyan-700"
        />
        <MetricCard
          icon={CheckCircle2}
          label="Entregados"
          value={metrics.completed}
          hint="Servicios completados"
          iconClassName="bg-emerald-50 text-emerald-700"
        />
      </section>

      <Card className="rounded-3xl border-border/70 p-4 shadow-sm sm:p-5">
        <div className="flex flex-col gap-3 lg:flex-row">
          <div className="relative min-w-0 flex-1">
            <Search className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              type="search"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Buscar por ID, teléfono, dirección o texto…"
              aria-label="Buscar pedidos"
              className="h-11 rounded-xl pl-10"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            onClick={clearFilters}
            disabled={!hasFilters}
            className="h-11 rounded-xl"
          >
            <FilterX className="h-4 w-4" />
            Limpiar filtros
          </Button>
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6">
          <div className="space-y-2">
            <Label htmlFor="status-filter" className="text-xs text-muted-foreground">Estado</Label>
            <Select value={statusFilter} onValueChange={setStatusFilter}>
              <SelectTrigger id="status-filter" className="h-11 rounded-xl">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {ORDER_STATUSES.map((status) => (
                  <SelectItem key={status.value} value={status.value}>{status.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="service-filter" className="text-xs text-muted-foreground">Servicio</Label>
            <Select value={serviceFilter} onValueChange={setServiceFilter}>
              <SelectTrigger id="service-filter" className="h-11 rounded-xl">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {serviceOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="payment-filter" className="text-xs text-muted-foreground">Pago</Label>
            <Select value={paymentFilter} onValueChange={setPaymentFilter}>
              <SelectTrigger id="payment-filter" className="h-11 rounded-xl">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                {PAYMENT_STATUSES.map((payment) => (
                  <SelectItem key={payment.value} value={payment.value}>{payment.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="courier-filter" className="text-xs text-muted-foreground">Repartidor</Label>
            <Select value={courierFilter} onValueChange={setCourierFilter}>
              <SelectTrigger id="courier-filter" className="h-11 rounded-xl">
                <SelectValue placeholder="Todos" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Todos</SelectItem>
                <SelectItem value="unassigned">Sin asignar</SelectItem>
                {courierOptions.map(([value, label]) => (
                  <SelectItem key={value} value={value}>{label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-from" className="text-xs text-muted-foreground">Desde</Label>
            <Input
              id="date-from"
              type="date"
              value={dateFrom}
              max={dateTo || undefined}
              onChange={(event) => setDateFrom(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="date-to" className="text-xs text-muted-foreground">Hasta</Label>
            <Input
              id="date-to"
              type="date"
              value={dateTo}
              min={dateFrom || undefined}
              onChange={(event) => setDateTo(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>
        </div>

        {invalidDateRange && (
          <p className="mt-3 text-xs font-medium text-destructive">
            La fecha inicial debe ser anterior o igual a la fecha final.
          </p>
        )}
      </Card>

      <section aria-labelledby="orders-list-title" className="space-y-3">
        <div className="flex items-center justify-between gap-3 px-1">
          <div>
            <h2 id="orders-list-title" className="font-heading text-xl font-extrabold">Listado de pedidos</h2>
            <p className="text-xs text-muted-foreground">Más recientes primero</p>
          </div>
          <Badge variant="secondary" className="rounded-full px-3 py-1 text-xs font-bold">
            {filteredOrders.length} {filteredOrders.length === 1 ? 'resultado' : 'resultados'}
          </Badge>
        </div>

        {filteredOrders.length === 0 ? (
          <Card className="rounded-3xl border-dashed border-border py-14 text-center shadow-none">
            <PackageSearch className="mx-auto h-10 w-10 text-muted-foreground/50" />
            <h3 className="mt-4 font-heading text-lg font-bold">No hay pedidos que coincidan</h3>
            <p className="mx-auto mt-1 max-w-sm text-sm text-muted-foreground">
              Prueba otra búsqueda o elimina alguno de los filtros aplicados.
            </p>
            {hasFilters && (
              <Button type="button" variant="outline" onClick={clearFilters} className="mt-5 rounded-xl">
                <FilterX className="h-4 w-4" />
                Mostrar todos
              </Button>
            )}
          </Card>
        ) : (
          <div className="space-y-3">
            {filteredOrders.map((order) => <OrderCard key={order.id} order={order} />)}
          </div>
        )}
      </section>
    </div>
  );
}
