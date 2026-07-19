import React, { useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { CheckCircle2, CreditCard, LockKeyhole, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { useDemoStore } from '@/lib/DemoStore';
import { formatCurrency } from '@/lib/domain';

export default function PaymentDemo() {
  const { token } = useParams();
  const { orders, markDemoPaid } = useDemoStore();
  const order = orders.find((item) => item.payment_token === token);
  const [processing, setProcessing] = useState(false);
  const [paid, setPaid] = useState(order?.payment_status === 'pagado');

  if (!order) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
        <Card className="max-w-md rounded-[2rem]">
          <CardContent className="p-8 text-center">
            <h1 className="text-2xl font-bold">Enlace no válido</h1>
            <p className="mt-3 text-sm text-muted-foreground">No encontramos este pago.</p>
            <Link to="/" className="mt-6 inline-block text-sm font-semibold text-primary">Volver al inicio</Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  const handlePay = () => {
    setProcessing(true);
    window.setTimeout(() => {
      markDemoPaid(token);
      setPaid(true);
      setProcessing(false);
    }, 700);
  };

  return (
    <div className="min-h-screen bg-slate-100 px-4 py-10 pb-28">
      <div className="mx-auto max-w-lg">
        <div className="mb-5 flex items-center justify-between px-2">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-blue-600 font-heading text-xl font-black text-white">W</div>
            <div>
              <p className="font-bold">Pago del pedido #{order.order_number}</p>
              <p className="text-xs text-muted-foreground">Entorno seguro de demostración</p>
            </div>
          </div>
          <LockKeyhole className="h-5 w-5 text-emerald-600" />
        </div>

        <Card className="overflow-hidden rounded-[2rem] border-0 shadow-xl">
          <CardHeader className="bg-slate-950 text-white">
            <CardTitle className="flex items-center justify-between text-lg">
              Total a pagar
              <span className="text-3xl font-black">{formatCurrency(order.total)}</span>
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6 p-6 md:p-8">
            <div className="space-y-3 rounded-2xl bg-slate-50 p-4 text-sm">
              <div className="flex justify-between"><span className="text-muted-foreground">Productos y compras</span><strong>{formatCurrency(order.product_cost)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Transporte</span><strong>{formatCurrency(order.transport_cost)}</strong></div>
              <div className="flex justify-between"><span className="text-muted-foreground">Servicio</span><strong>{formatCurrency(order.service_cost)}</strong></div>
            </div>

            {paid ? (
              <div className="rounded-3xl border border-emerald-200 bg-emerald-50 p-6 text-center">
                <CheckCircle2 className="mx-auto h-12 w-12 text-emerald-600" />
                <h1 className="mt-3 text-xl font-extrabold text-emerald-950">Pago confirmado</h1>
                <p className="mt-2 text-sm text-emerald-800">Administración ya puede asignar y ejecutar tu recado.</p>
              </div>
            ) : (
              <>
                <div className="rounded-2xl border border-blue-100 bg-blue-50 p-4 text-sm text-blue-900">
                  <div className="flex gap-3">
                    <ShieldCheck className="mt-0.5 h-5 w-5 shrink-0" />
                    <p>Esta pantalla simula Stripe Checkout. No solicita tarjeta ni realiza ningún cargo real.</p>
                  </div>
                </div>
                <Button onClick={handlePay} disabled={processing} className="h-14 w-full rounded-full text-base font-bold">
                  <CreditCard className="h-5 w-5" />
                  {processing ? 'Confirmando…' : `Simular pago de ${formatCurrency(order.total)}`}
                </Button>
              </>
            )}
          </CardContent>
        </Card>

        <p className="mt-5 text-center text-xs text-muted-foreground">En producción, este paso se sustituirá por Stripe Checkout y confirmación mediante webhook.</p>
      </div>
    </div>
  );
}
