# W Recados · Las Playitas

MVP web multilingüe para digitalizar un servicio de recados. El cliente escribe libremente lo que necesita; administración revisa la solicitud, prepara el presupuesto, coordina el pago y asigna un repartidor; el repartidor compra lo necesario y completa la entrega.

No es un ecommerce: no existe catálogo de productos ni se guardan o asignan comercios. Un pedido puede incluir artículos comprados en varios establecimientos sin modelar esas paradas.

## Aplicación real en Base44

La versión con registros reales está publicada en:

**https://w-recados-b4e8afba.base44.app**

En esta modalidad:

- los clientes crean una cuenta con correo y contraseña y verifican el alta por código;
- cada cliente ve únicamente sus pedidos, pagos, datos básicos y su único chat con Administración;
- Administración dispone del panel global de pedidos y conversaciones;
- los datos se guardan en Base44 y se mantienen entre dispositivos;
- WhatsApp está desactivado mediante `VITE_WHATSAPP_ENABLED=false`, pero el código de Twilio y sus funciones se conservan para una fase posterior.

El usuario propietario `pauovidi@gmail.com` figura en Base44 con rol `admin`.

## Demostración local end-to-end

La configuración predeterminada usa un almacén local del navegador con datos ficticios. Permite enseñar el recorrido completo sin cuentas externas, mensajes reales ni tarjetas:

1. Cliente: la portada integra el formulario de pedido y `/acceso` permite entrar en el área personal con historial de pedidos y conversaciones.
2. Administración: `/admin` busca y filtra pedidos, revisa original/traducción, presupuesta, asigna repartidor y gestiona notas.
3. Conversaciones: `/admin/conversaciones` muestra la bandeja de chats cliente–Administración.
4. Pago: el enlace generado abre una simulación de Stripe que no solicita tarjeta ni cobra.
5. Repartidor: `/repartidor` está diseñado primero para móvil y avanza por `Asignado → Recogido → En camino → Entregado`.

El selector inferior permite saltar entre perfiles y restaurar los datos iniciales. No introduzcas datos personales reales en este modo: el contenido se guarda únicamente en `localStorage` y no se sincroniza entre dispositivos.

Para probar el área de cliente en la demo usa `anna@demo.wrecados.es` y la contraseña `demo1234`. En producción, Base44 sustituirá esta sesión local por autenticación y persistencia reales.

### Simulador de WhatsApp conservado

1. Abre `/admin/conversaciones` y selecciona **Lucía · prueba WhatsApp**.
2. Usa **Simular mensaje entrante del cliente** para escribir qué necesita.
3. El asistente pregunta, uno a uno, por la dirección y el horario que falten.
4. Cuando dispone de lista, dirección y horario, crea el pedido y lo vincula automáticamente a la conversación.

Este simulador solo está visible en modo demo. En Base44, WhatsApp permanece
desactivado y la comunicación se realiza mediante el chat privado de la cuenta.

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

Compilación y despliegue en la aplicación Base44 vinculada:

```bash
npm run build:base44
npm run deploy:base44
```

`sync:base44` replica dentro de cada función los módulos compartidos que Base44
necesita empaquetar de forma independiente.

La compilación de producción mantiene el front como una SPA de Vite y añade la
entrada de servidor mínima que exige OpenAI Sites. Las rutas internas se
resuelven hacia `index.html`, por lo que enlaces directos como
`/admin/conversaciones` o `/repartidor` funcionan al recargar.

## Backend Base44

`base44/entities` define usuarios, clientes, pedidos, repartidores, negocios,
paquetes, conversaciones y mensajes con reglas de acceso por rol. Las funciones
principales incluyen:

- `completeCustomerProfile`: vincula el usuario autenticado con su ficha de cliente y su conversación única.
- `createAuthenticatedOrder`: crea pedidos asociados al cliente autenticado.
- `getCustomerPortal`: devuelve solo los pedidos, pagos, perfil y chat del usuario actual.
- `sendCustomerMessage` y `sendAdminMessage`: gestionan el chat privado en ambos sentidos.
- `createStripeCheckout` y `stripeWebhook`: generan Stripe Checkout en servidor y confirman el pago por webhook firmado.
- `twilioInbound`, `sendWhatsApp` y `twilioStatus`: reciben, envían y actualizan estados de mensajes de WhatsApp verificando las firmas de Twilio. El webhook entrante reconoce al cliente por teléfono, extrae los campos del pedido con IA, pregunta mediante TwiML por los datos ausentes y crea el pedido cuando la comanda está completa.

Las funciones de Twilio responden como desactivadas mientras
`WHATSAPP_ENABLED` no sea `true`. Las claves de Stripe y Twilio se configuran
como secretos del backend y nunca como variables `VITE_*`.

## Dominio y siguiente puesta en producción

La aplicación está en el espacio personal gratuito de Base44. Cuando exista el
dominio, habrá que mejorar ese espacio a un plan que admita dominios o transferir
la app al espacio de Cuchara Digital una vez que el propietario conceda permisos
para crear/recibir aplicaciones. Después se añade el dominio desde **Dominios**
y se configuran los registros DNS indicados por Base44.

Antes de cobrar o abrir tráfico comercial también deben configurarse Stripe,
aviso legal/privacidad y la política de conservación de datos.
