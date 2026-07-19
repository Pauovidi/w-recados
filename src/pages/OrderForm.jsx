import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { AlertCircle, FileUp, Loader2, Package, Pill, Send, ShoppingBag, ShoppingCart, Sparkles, Truck } from 'lucide-react';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { useLanguage } from '@/hooks/useLanguage';
import { useDemoStore } from '@/lib/DemoStore';
import { DEMO_EXAMPLES, normalizePhone } from '@/lib/domain';

const serviceIcons = {
  supermercado: ShoppingCart,
  farmacia: Pill,
  compras_personales: ShoppingBag,
  recados: Package,
  transporte_productos: Truck,
};

export default function OrderForm() {
  const navigate = useNavigate();
  const { language, dictionary, t, languages } = useLanguage();
  const { createOrder, customers } = useDemoStore();
  const urlParams = new URLSearchParams(window.location.search);
  const preselectedService = urlParams.get('servicio') || '';

  const [form, setForm] = useState({
    client_name: '',
    service_type: preselectedService,
    original_text: '',
    delivery_address: '',
    client_phone: '',
    preferred_schedule: '',
    client_notes: '',
    client_language: language,
  });
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  const serviceOptions = dictionary.services.list;

  const scheduleOptions = [
    { value: 'mañana', label: t('form.scheduleOptions.morning') },
    { value: 'mediodía', label: t('form.scheduleOptions.midday') },
    { value: 'tarde', label: t('form.scheduleOptions.afternoon') },
    { value: 'lo_antes_posible', label: t('form.scheduleOptions.asap') },
    { value: 'flexible', label: t('form.scheduleOptions.flexible') },
  ];

  const handleChange = (field, value) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const handleFileChange = (event) => {
    const selected = Array.from(event.target.files || []).slice(0, 3);
    setFiles(selected);
    setError(selected.some((file) => file.size > 800_000) ? t('form.fileTooLarge') : '');
  };

  const fileToAttachment = (file) => new Promise((resolve) => {
    const metadata = { id: `${file.name}-${file.lastModified}`, name: file.name, type: file.type, size: file.size };
    if (file.size > 800_000) {
      resolve(metadata);
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve({ ...metadata, data_url: reader.result });
    reader.onerror = () => resolve(metadata);
    reader.readAsDataURL(file);
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const order = createOrder({ ...form, attachments });
      navigate(`/pedido/confirmacion?pedido=${order.id}`);
    } catch (submitError) {
      setError(submitError?.message || t('form.submitError'));
      setSending(false);
    }
  };

  const isValid = form.service_type && form.original_text && form.delivery_address && form.client_phone && form.client_language;
  const recognizedCustomer = customers.find((customer) => customer.phone === normalizePhone(form.client_phone));

  return (
    <div className="min-h-screen flex flex-col bg-background">
      <PublicHeader />

      <div className="flex-1 py-8 md:py-12">
        <div className="max-w-3xl mx-auto px-4">
          <div className="mb-8 rounded-[2rem] bg-foreground p-6 text-background md:p-8">
            <div className="inline-flex rounded-full bg-white/10 px-4 py-2 text-xs font-medium text-white/80">
              {t('form.noRegistration')}
            </div>
            <div className="ml-2 inline-flex rounded-full bg-amber-400/15 px-4 py-2 text-xs font-semibold text-amber-200">
              {t('form.demoWarning')}
            </div>
            <h1 className="mt-4 font-heading text-3xl font-extrabold md:text-4xl">{t('form.title')}</h1>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/70 md:text-base">{t('form.subtitle')}</p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6 rounded-[2rem] border border-border bg-card p-5 shadow-sm md:p-8">
            <div className="space-y-3">
              <Label className="font-medium">{t('form.serviceType')}</Label>
              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
                {serviceOptions.map((option) => {
                  const Icon = serviceIcons[option.value];
                  const isActive = form.service_type === option.value;
                  return (
                    <button
                      key={option.value}
                      type="button"
                      onClick={() => handleChange('service_type', option.value)}
                      className={`rounded-3xl border p-4 text-left transition-all ${
                        isActive ? 'border-primary bg-primary/5 shadow-sm' : 'border-border hover:border-primary/30'
                      }`}
                    >
                      <Icon className={`mb-3 w-5 h-5 ${isActive ? 'text-primary' : 'text-muted-foreground'}`} />
                      <p className="font-heading text-sm font-bold text-foreground">{option.title}</p>
                      <p className="mt-1 text-xs leading-5 text-muted-foreground">{option.description}</p>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">{t('form.name')}</Label>
                <Input
                  placeholder="Anna"
                  value={form.client_name}
                  onChange={(e) => handleChange('client_name', e.target.value)}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">{t('form.language')}</Label>
                <Select value={form.client_language} onValueChange={(value) => handleChange('client_language', value)}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {languages.map((item) => (
                      <SelectItem key={item.value} value={item.value}>
                        {item.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label className="font-medium">{t('form.schedule')}</Label>
                <Select value={form.preferred_schedule} onValueChange={(value) => handleChange('preferred_schedule', value)}>
                  <SelectTrigger className="h-12 rounded-2xl">
                    <SelectValue placeholder={t('form.schedule')} />
                  </SelectTrigger>
                  <SelectContent>
                    {scheduleOptions.map((option) => (
                      <SelectItem key={option.value} value={option.value}>
                        {option.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <Label className="font-medium">{t('form.orderText')}</Label>
                <button
                  type="button"
                  onClick={() => handleChange('original_text', DEMO_EXAMPLES[form.client_language] || DEMO_EXAMPLES.es)}
                  className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100"
                >
                  <Sparkles className="h-3.5 w-3.5" /> {t('form.loadExample')}
                </button>
              </div>
              <Textarea
                placeholder={t('form.orderPlaceholder')}
                value={form.original_text}
                onChange={(e) => handleChange('original_text', e.target.value)}
                className="min-h-[140px] resize-none rounded-3xl"
              />
              <p className="text-xs text-muted-foreground">{t('form.orderHelp')}</p>
            </div>

            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2">
                <Label className="font-medium">{t('form.address')}</Label>
                <Input
                  placeholder={t('form.addressPlaceholder')}
                  value={form.delivery_address}
                  onChange={(e) => handleChange('delivery_address', e.target.value)}
                  className="h-12 rounded-2xl"
                />
              </div>
              <div className="space-y-2">
                <Label className="font-medium">{t('form.phone')}</Label>
                <Input
                  type="tel"
                  placeholder={t('form.phonePlaceholder')}
                  value={form.client_phone}
                  onChange={(e) => handleChange('client_phone', e.target.value)}
                  className="h-12 rounded-2xl"
                />
                {recognizedCustomer && (
                  <p className="text-xs font-medium text-emerald-700">
                    {t('form.recognizedCustomer')} · {recognizedCustomer.order_count} {t('form.previousOrders')}
                  </p>
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label className="font-medium">{t('form.notes')}</Label>
              <Textarea
                placeholder={t('form.notesPlaceholder')}
                value={form.client_notes}
                onChange={(e) => handleChange('client_notes', e.target.value)}
                className="min-h-[100px] resize-none rounded-3xl"
              />
            </div>

            <div className="space-y-3 rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4">
              <div className="flex items-center gap-3">
                <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/10">
                  <FileUp className="w-5 h-5 text-primary" />
                </div>
                <div>
                  <Label className="font-medium">{t('form.images')}</Label>
                  <p className="text-xs text-muted-foreground">{t('form.imagesHelp')}</p>
                </div>
              </div>
              <Input type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} className="rounded-2xl bg-background" />
              {files.length > 0 && (
                <div>
                  <p className="mb-2 text-xs font-medium text-foreground">{t('form.selectedImages')}</p>
                  <div className="space-y-1">
                    {files.map((file) => (
                      <p key={file.name} className="text-xs text-muted-foreground">
                        {file.name}
                      </p>
                    ))}
                  </div>
                </div>
              )}
            </div>

            {error && (
              <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <AlertCircle className="mt-0.5 h-5 w-5 shrink-0" />
                <p>{error}</p>
              </div>
            )}

            <Button
              type="submit"
              size="lg"
              disabled={!isValid || sending}
              className="h-14 w-full rounded-full text-base font-semibold shadow-lg"
            >
              {sending ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" /> {t('form.sending')}
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" /> {t('form.submit')}
                </>
              )}
            </Button>
          </form>
        </div>
      </div>

      <PublicFooter />
    </div>
  );
}
