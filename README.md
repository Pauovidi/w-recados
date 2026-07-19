# W Recados · Las Playitas

MVP web multilingüe para digitalizar un servicio de recados. El cliente escribe libremente lo que necesita; administración revisa la solicitud, prepara el presupuesto, coordina el pago y asigna un repartidor; el repartidor compra lo necesario y completa la entrega.

No es un ecommerce: no existe catálogo de productos ni se guardan o asignan comercios. Un pedido puede incluir artículos comprados en varios establecimientos sin modelar esas paradas.

## Demostración end-to-end

La configuración predeterminada usa un almacén local del navegador con datos ficticios. Permite enseñar el recorrido completo sin cuentas externas, mensajes reales ni tarjetas:

1. Cliente: `/pedido` crea una solicitud en español, inglés, alemán o francés.
2. Administración: `/admin` busca y filtra pedidos, revisa original/traducción, presupuesta, asigna repartidor y gestiona notas.
3. Conversaciones: `/admin/conversaciones` simula la bandeja WhatsApp.
4. Pago: el enlace generado abre una simulación de Stripe que no solicita tarjeta ni cobra.
5. Repartidor: `/repartidor` está diseñado primero para móvil y avanza por `Asignado → Recogido → En camino → Entregado`.

El selector inferior permite saltar entre perfiles y restaurar los datos iniciales. No introduzcas datos personales reales en este modo: el contenido se guarda únicamente en `localStorage` y no se sincroniza entre dispositivos.

## Ejecutar en local

Requisitos: Node.js 20 o superior.

```bash
npm ci
npm run dev
```

Validación completa:

```bash
npm run check
```

La compilación de producción mantiene el front como una SPA de Vite y añade la
entrada de servidor mínima que exige OpenAI Sites. Las rutas internas se
resuelven hacia `index.html`, por lo que enlaces directos como
`/admin/conversaciones` o `/repartidor` funcionan al recargar.

## Backend preparado para Base44

`base44/entities` define pedidos, clientes identificados por teléfono, repartidores, conversaciones y mensajes. `base44/functions` incluye:

- `createPublicOrder`: valida la solicitud anónima, reconoce el teléfono y traduce al español mediante la integración de Base44.
- `createStripeCheckout` y `stripeWebhook`: generan Stripe Checkout en servidor y confirman el pago por webhook firmado.
- `twilioInbound`, `sendWhatsApp` y `twilioStatus`: reciben, envían y actualizan estados de mensajes de WhatsApp verificando las firmas de Twilio.

Las claves de Stripe y Twilio deben configurarse como secretos del backend. Nunca deben exponerse en variables `VITE_*` ni subirse al repositorio. Consulta `.env.example` para ver los nombres previstos.

## Paso de demo a producción

Antes de activar tráfico real faltan datos externos, no código de interfaz:

- ID y URL del proyecto Base44, despliegue de entidades/funciones y reglas de acceso.
- Número final del negocio y alta del remitente de WhatsApp en Twilio.
- Claves de prueba de Stripe, URL pública y registro de su webhook.
- Sustituir el proveedor local de demostración por el adaptador Base44 y probar dos dispositivos reales.
- Añadir aviso legal/privacidad, política de conservación y protección anti-spam al formulario público.

La demo debe mantenerse en modo simulado hasta completar esa lista.
