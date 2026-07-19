import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import {
  ArrowLeft,
  CheckCheck,
  Clock3,
  Globe2,
  Inbox,
  MessageCircle,
  Phone,
  Search,
  Send,
  ShoppingBag,
} from 'lucide-react';

import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Textarea } from '@/components/ui/textarea';
import { useDemoStore } from '@/lib/DemoStore';
import {
  formatCurrency,
  formatDateTime,
  getStatus,
  LANGUAGE_LABELS,
  SERVICE_LABELS,
} from '@/lib/domain';

function toTimestamp(value) {
  const timestamp = Date.parse(value);
  return Number.isNaN(timestamp) ? 0 : timestamp;
}

function getInitials(name) {
  const initials = String(name || '')
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase();

  return initials || 'CL';
}

function getLastMessage(conversation) {
  const messages = conversation.messages || [];
  return messages[messages.length - 1];
}

function getMessagePreview(message) {
  if (!message) return 'Sin mensajes todavía';
  if (message.direction === 'outbound') return `Tú: ${message.body}`;
  if (message.direction === 'system') return `Sistema: ${message.body}`;
  return message.body;
}

function getDeliveryLabel(status) {
  if (status === 'delivered') return 'Entregado';
  if (status === 'received') return 'Recibido';
  if (status === 'simulated') return 'Simulado';
  return 'Registrado';
}

export default function Conversations() {
  const [searchParams] = useSearchParams();
  const {
    conversations = [],
    orders = [],
    sendMessage,
    markConversationRead,
  } = useDemoStore();
  const [search, setSearch] = useState('');
  const [selectedConversationId, setSelectedConversationId] = useState(searchParams.get('chat'));
  const [draft, setDraft] = useState('');
  const messagesEndRef = useRef(null);

  const orderedConversations = useMemo(
    () => [...conversations].sort((left, right) => (
      toTimestamp(right.updated_at) - toTimestamp(left.updated_at)
    )),
    [conversations],
  );

  const filteredConversations = useMemo(() => {
    const query = search.trim().toLocaleLowerCase('es');
    const compactQuery = query.replace(/\s/g, '');
    if (!query) return orderedConversations;

    return orderedConversations.filter((conversation) => {
      const name = String(conversation.display_name || '').toLocaleLowerCase('es');
      const phone = String(conversation.phone || '').toLocaleLowerCase('es');
      return name.includes(query) || phone.includes(query) || phone.replace(/\s/g, '').includes(compactQuery);
    });
  }, [orderedConversations, search]);

  const selectedConversation = useMemo(
    () => conversations.find((conversation) => conversation.id === selectedConversationId) || null,
    [conversations, selectedConversationId],
  );

  const ordersById = useMemo(
    () => new Map(orders.map((order) => [order.id, order])),
    [orders],
  );

  const relatedOrders = useMemo(
    () => (selectedConversation?.order_ids || [])
      .map((orderId) => ordersById.get(orderId))
      .filter(Boolean),
    [ordersById, selectedConversation],
  );

  const selectedMessages = useMemo(
    () => [...(selectedConversation?.messages || [])].sort((left, right) => (
      toTimestamp(left.at) - toTimestamp(right.at)
    )),
    [selectedConversation],
  );

  const unreadTotal = useMemo(
    () => conversations.reduce((total, conversation) => total + Number(conversation.unread_count || 0), 0),
    [conversations],
  );
  const freeFormWindowOpen = Boolean(
    selectedConversation?.service_window_expires_at
      && toTimestamp(selectedConversation.service_window_expires_at) > Date.now(),
  );

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ block: 'end' });
  }, [selectedConversationId, selectedMessages.length]);

  useEffect(() => {
    if (selectedConversationId && !selectedConversation) {
      setSelectedConversationId(null);
      setDraft('');
    }
  }, [selectedConversation, selectedConversationId]);

  const handleSelectConversation = (conversationId) => {
    if (conversationId !== selectedConversationId) setDraft('');
    setSelectedConversationId(conversationId);
    markConversationRead(conversationId);
  };

  const handleBackToInbox = () => {
    setSelectedConversationId(null);
    setDraft('');
  };

  const handleSend = (event) => {
    event.preventDefault();
    const body = draft.trim();
    if (!selectedConversation || !body) return;

    markConversationRead(selectedConversation.id);
    sendMessage(selectedConversation.id, body);
    setDraft('');
  };

  const handleComposerKeyDown = (event) => {
    if (event.key !== 'Enter' || event.shiftKey || event.nativeEvent.isComposing) return;
    event.preventDefault();
    event.currentTarget.form?.requestSubmit();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-heading text-3xl font-extrabold">Conversaciones WhatsApp</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Atiende al cliente y consulta sus pedidos desde una sola bandeja.
          </p>
        </div>
        <Badge
          variant="outline"
          className="w-fit gap-2 rounded-full border-emerald-200 bg-emerald-50 px-3 py-1.5 text-emerald-800"
        >
          <span className="h-2 w-2 rounded-full bg-emerald-500" />
          Twilio · modo demo
        </Badge>
      </div>

      <Card className="overflow-hidden rounded-[2rem] shadow-sm">
        <div className="grid h-[calc(100dvh-12.5rem)] min-h-[560px] lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside
            className={`${selectedConversation ? 'hidden lg:flex' : 'flex'} min-h-0 flex-col bg-card lg:border-r lg:border-border`}
            aria-label="Bandeja de conversaciones"
          >
            <div className="border-b border-border p-4">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <p className="font-heading text-lg font-bold">Bandeja</p>
                  <p className="text-xs text-muted-foreground">{orderedConversations.length} conversaciones</p>
                </div>
                <Badge className="rounded-full px-2.5 py-1">
                  {unreadTotal} sin leer
                </Badge>
              </div>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  type="search"
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Buscar nombre o teléfono"
                  aria-label="Buscar conversaciones por nombre o teléfono"
                  className="h-11 rounded-2xl bg-background pl-10"
                />
              </div>
            </div>

            <ScrollArea className="min-h-0 flex-1">
              {filteredConversations.length === 0 ? (
                <div className="flex min-h-64 flex-col items-center justify-center px-6 text-center">
                  <Search className="mb-3 h-8 w-8 text-muted-foreground/50" />
                  <p className="font-medium">No hay coincidencias</p>
                  <p className="mt-1 text-sm text-muted-foreground">Prueba con otro nombre o teléfono.</p>
                </div>
              ) : (
                <div className="divide-y divide-border">
                  {filteredConversations.map((conversation) => {
                    const lastMessage = getLastMessage(conversation);
                    const unreadCount = Number(conversation.unread_count || 0);
                    const isSelected = conversation.id === selectedConversationId;

                    return (
                      <button
                        key={conversation.id}
                        type="button"
                        onClick={() => handleSelectConversation(conversation.id)}
                        aria-pressed={isSelected}
                        className={`flex w-full gap-3 px-4 py-4 text-left transition-colors hover:bg-secondary/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring ${
                          isSelected ? 'bg-primary/5' : 'bg-card'
                        }`}
                      >
                        <Avatar className="h-11 w-11 border border-border">
                          <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                            {getInitials(conversation.display_name)}
                          </AvatarFallback>
                        </Avatar>

                        <div className="min-w-0 flex-1">
                          <div className="flex items-start justify-between gap-2">
                            <p className={`truncate text-sm ${unreadCount ? 'font-bold' : 'font-semibold'}`}>
                              {conversation.display_name || 'Cliente sin nombre'}
                            </p>
                            <span className={`shrink-0 text-[11px] ${unreadCount ? 'font-semibold text-primary' : 'text-muted-foreground'}`}>
                              {formatDateTime(conversation.updated_at)}
                            </span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-muted-foreground">{conversation.phone}</p>
                          <div className="mt-1.5 flex items-center gap-2">
                            <p className={`min-w-0 flex-1 truncate text-xs ${unreadCount ? 'font-medium text-foreground' : 'text-muted-foreground'}`}>
                              {getMessagePreview(lastMessage)}
                            </p>
                            {unreadCount > 0 && (
                              <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary px-1.5 text-[10px] font-bold text-primary-foreground">
                                {unreadCount > 99 ? '99+' : unreadCount}
                              </span>
                            )}
                          </div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
            </ScrollArea>
          </aside>

          <section
            className={`${selectedConversation ? 'flex' : 'hidden lg:flex'} min-h-0 flex-col bg-secondary/30`}
            aria-label="Conversación seleccionada"
          >
            {selectedConversation ? (
              <>
                <header className="flex items-center gap-3 border-b border-border bg-card px-3 py-3 sm:px-5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    onClick={handleBackToInbox}
                    className="shrink-0 rounded-full lg:hidden"
                    aria-label="Volver a la bandeja"
                  >
                    <ArrowLeft />
                  </Button>
                  <Avatar className="h-10 w-10 border border-border">
                    <AvatarFallback className="bg-primary/10 text-xs font-bold text-primary">
                      {getInitials(selectedConversation.display_name)}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-heading text-sm font-bold sm:text-base">
                      {selectedConversation.display_name || 'Cliente sin nombre'}
                    </p>
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-muted-foreground">
                      <a href={`tel:${selectedConversation.phone}`} className="flex items-center gap-1 hover:text-foreground">
                        <Phone className="h-3 w-3" />
                        {selectedConversation.phone}
                      </a>
                      <span className="flex items-center gap-1">
                        <Globe2 className="h-3 w-3" />
                        {LANGUAGE_LABELS[selectedConversation.language] || selectedConversation.language?.toUpperCase() || 'Idioma sin indicar'}
                      </span>
                    </div>
                  </div>
                  <Badge
                    variant="outline"
                    className={`hidden shrink-0 rounded-full sm:inline-flex ${freeFormWindowOpen
                      ? 'border-emerald-200 bg-emerald-50 text-emerald-800'
                      : 'border-amber-200 bg-amber-50 text-amber-800'}`}
                  >
                    {freeFormWindowOpen ? 'Ventana 24 h abierta' : 'Plantilla en producción'}
                  </Badge>
                </header>

                <div className="border-b border-border bg-card/90 px-4 py-3 sm:px-5">
                  <div className="flex items-center gap-2 text-xs font-semibold text-muted-foreground">
                    <ShoppingBag className="h-4 w-4" />
                    Pedidos relacionados
                  </div>
                  {relatedOrders.length > 0 ? (
                    <div className="mt-2 flex gap-2 overflow-x-auto pb-1">
                      {relatedOrders.map((order) => {
                        const status = getStatus(order.order_status);
                        return (
                          <Link
                            key={order.id}
                            to={`/admin/pedido/${order.id}`}
                            className="min-w-[210px] rounded-2xl border border-border bg-background px-3 py-2.5 transition-colors hover:border-primary/30 hover:bg-primary/5"
                          >
                            <div className="flex items-center justify-between gap-3">
                              <span className="font-heading text-xs font-bold">Pedido #{order.order_number || order.id}</span>
                              <span className="text-xs font-semibold">{formatCurrency(order.total)}</span>
                            </div>
                            <div className="mt-1 flex items-center justify-between gap-3 text-[11px] text-muted-foreground">
                              <span className="truncate">{SERVICE_LABELS[order.service_type] || order.service_type || 'Servicio'}</span>
                              <span className="shrink-0">{status.label}</span>
                            </div>
                          </Link>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 text-xs text-muted-foreground">Esta conversación no tiene pedidos vinculados.</p>
                  )}
                </div>

                <ScrollArea className="min-h-0 flex-1 bg-[#efeae2]">
                  <div className="min-h-full space-y-3 px-3 py-5 sm:px-6">
                    {selectedMessages.length === 0 ? (
                      <div className="flex min-h-56 flex-col items-center justify-center text-center text-muted-foreground">
                        <MessageCircle className="mb-3 h-9 w-9 opacity-50" />
                        <p className="text-sm font-medium">Aún no hay mensajes</p>
                        <p className="mt-1 text-xs">Escribe debajo para iniciar la conversación demo.</p>
                      </div>
                    ) : (
                      selectedMessages.map((message) => {
                        if (message.direction === 'system') {
                          return (
                            <div key={message.id} className="flex justify-center py-1">
                              <div className="max-w-[92%] rounded-xl bg-white/80 px-3 py-2 text-center text-[11px] text-slate-600 shadow-sm">
                                <p>{message.body}</p>
                                <span className="mt-1 inline-flex items-center gap-1 text-[10px] text-slate-500">
                                  <Clock3 className="h-3 w-3" />
                                  {formatDateTime(message.at)}
                                </span>
                              </div>
                            </div>
                          );
                        }

                        const isOutbound = message.direction === 'outbound';
                        return (
                          <div key={message.id} className={`flex ${isOutbound ? 'justify-end' : 'justify-start'}`}>
                            <div
                              className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 shadow-sm sm:max-w-[74%] ${
                                isOutbound
                                  ? 'rounded-br-md bg-[#d9fdd3] text-slate-900'
                                  : 'rounded-bl-md bg-white text-slate-900'
                              }`}
                            >
                              <p className="whitespace-pre-wrap break-words text-sm leading-5">{message.body}</p>
                              <div className="mt-1 flex items-center justify-end gap-1 text-[10px] text-slate-500">
                                <span>{formatDateTime(message.at)}</span>
                                {isOutbound && <CheckCheck className="h-3.5 w-3.5 text-sky-600" />}
                                <span className="sr-only">{getDeliveryLabel(message.status)}</span>
                              </div>
                            </div>
                          </div>
                        );
                      })
                    )}
                    <div ref={messagesEndRef} />
                  </div>
                </ScrollArea>

                <form onSubmit={handleSend} className="border-t border-border bg-card p-3 sm:p-4">
                  <div className="mb-2 flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
                    <span className="flex items-center gap-1.5">
                      <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                      {freeFormWindowOpen
                        ? 'Twilio demo · respuesta libre disponible durante 24 h.'
                        : 'Twilio demo · en producción el primer contacto exige una plantilla aprobada.'}
                    </span>
                    <span>Intro para enviar · Mayús + Intro para salto de línea</span>
                  </div>
                  <div className="flex items-end gap-2">
                    <Textarea
                      value={draft}
                      onChange={(event) => setDraft(event.target.value)}
                      onKeyDown={handleComposerKeyDown}
                      rows={1}
                      maxLength={2000}
                      placeholder="Escribe una respuesta..."
                      aria-label="Respuesta de WhatsApp"
                      className="min-h-12 max-h-32 resize-y rounded-2xl bg-background px-4 py-3"
                    />
                    <Button
                      type="submit"
                      size="icon"
                      disabled={!draft.trim()}
                      className="h-12 w-12 shrink-0 rounded-2xl"
                      aria-label="Enviar respuesta en modo demo"
                    >
                      <Send />
                    </Button>
                  </div>
                </form>
              </>
            ) : (
              <div className="flex h-full flex-col items-center justify-center px-8 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-3xl bg-primary/10 text-primary">
                  <Inbox className="h-8 w-8" />
                </div>
                <h2 className="mt-5 font-heading text-xl font-bold">Selecciona una conversación</h2>
                <p className="mt-2 max-w-sm text-sm leading-6 text-muted-foreground">
                  Consulta el historial, abre sus pedidos relacionados y responde desde la bandeja de WhatsApp.
                </p>
                <Badge variant="outline" className="mt-4 rounded-full border-emerald-200 bg-emerald-50 text-emerald-800">
                  Entorno Twilio de demostración
                </Badge>
              </div>
            )}
          </section>
        </div>
      </Card>
    </div>
  );
}
