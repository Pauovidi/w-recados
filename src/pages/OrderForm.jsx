import React, { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { AlertCircle, FileUp, Loader2, LockKeyhole, Send, Sparkles, UserRound } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { useLanguage } from '@/hooks/useLanguage';
import { useDemoStore } from '@/lib/DemoStore';
import { DEMO_EXAMPLES } from '@/lib/domain';

const DRAFT_KEY = 'w-recados-order-draft';

function loadDraft(language) {
  try {
    const stored = JSON.parse(window.sessionStorage.getItem(DRAFT_KEY));
    return {
      service_type: '',
      original_text: '',
      delivery_address: '',
      preferred_schedule: '',
      client_notes: '',
      client_language: language,
      ...(stored || {}),
    };
  } catch {
    return {
      service_type: '',
      original_text: '',
      delivery_address: '',
      preferred_schedule: '',
      client_notes: '',
      client_language: language,
    };
  }
}

export function OrderFormPanel({ embedded = false }) {
  const navigate = useNavigate();
  const { language, dictionary, t, languages } = useLanguage();
  const { createOrder, currentAccount, currentCustomer } = useDemoStore();
  const [form, setForm] = useState(() => loadDraft(language));
  const [files, setFiles] = useState([]);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!currentCustomer) return;
    setForm((current) => ({ ...current, client_language: currentCustomer.language || current.client_language }));
  }, [currentCustomer]);

  const scheduleOptions = [
    { value: 'mañana', label: t('form.scheduleOptions.morning') },
    { value: 'mediodía', label: t('form.scheduleOptions.midday') },
    { value: 'tarde', label: t('form.scheduleOptions.afternoon') },
    { value: 'lo_antes_posible', label: t('form.scheduleOptions.asap') },
    { value: 'flexible', label: t('form.scheduleOptions.flexible') },
  ];

  const handleChange = (field, value) => setForm((current) => ({ ...current, [field]: value }));

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

  const goToAccess = () => {
    window.sessionStorage.setItem(DRAFT_KEY, JSON.stringify(form));
    navigate('/acceso?return=%2F%23pedido');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!currentAccount || !currentCustomer) {
      goToAccess();
      return;
    }
    setError('');
    setSending(true);
    try {
      const attachments = await Promise.all(files.map(fileToAttachment));
      const order = createOrder({
        ...form,
        client_name: currentCustomer.display_name,
        client_phone: currentCustomer.phone,
        attachments,
      });
      window.sessionStorage.removeItem(DRAFT_KEY);
      navigate(`/pedido/confirmacion?pedido=${order.id}`);
    } catch (submitError) {
      setError(submitError?.message || t('form.submitError'));
      setSending(false);
    }
  };

  const isValid = form.service_type && form.original_text && form.delivery_address && form.client_language;

  return (
    <form
      id="pedido"
      onSubmit={handleSubmit}
      className={`rounded-[2rem] border border-blue-100 bg-white p-5 shadow-2xl shadow-blue-950/15 md:p-8 ${embedded ? 'scroll-mt-24' : ''}`}
    >
      <div className="mb-6 flex flex-col gap-4 border-b pb-6 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <div className="mb-3 flex flex-wrap gap-2">
            <span className="rounded-full bg-blue-50 px-3 py-1.5 text-xs font-bold text-primary">{t('form.noRegistration')}</span>
            <span className="rounded-full bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-800">{t('form.demoWarning')}</span>
          </div>
          <h2 className="font-heading text-3xl font-extrabold">{t('form.title')}</h2>
          <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">{t('form.subtitle')}</p>
        </div>
        {currentCustomer && (
          <Link to="/mi-cuenta" className="flex shrink-0 items-center gap-3 rounded-2xl bg-slate-950 px-4 py-3 text-white">
            <UserRound className="h-5 w-5 text-blue-300" />
            <span><span className="block text-xs text-white/55">{t('account.myAccount')}</span><span className="block text-sm font-bold">{currentCustomer.display_name}</span></span>
          </Link>
        )}
      </div>

      {!currentAccount && (
        <div className="mb-6 flex flex-col gap-4 rounded-3xl border border-blue-200 bg-blue-50 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary text-white"><LockKeyhole className="h-5 w-5" /></div>
            <p className="max-w-xl text-sm font-medium leading-6 text-blue-950">{t('account.loginRequired')}</p>
          </div>
          <Button type="button" onClick={goToAccess} className="shrink-0 rounded-full">{t('account.continue')}</Button>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="space-y-2">
          <Label>{t('form.serviceType')}</Label>
          <Select value={form.service_type} onValueChange={(value) => handleChange('service_type', value)}>
            <SelectTrigger data-testid="order-service" className="h-12 rounded-2xl"><SelectValue placeholder={t('form.serviceType')} /></SelectTrigger>
            <SelectContent>{dictionary.services.list.map((option) => <SelectItem key={option.value} value={option.value}>{option.title}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('form.schedule')}</Label>
          <Select value={form.preferred_schedule} onValueChange={(value) => handleChange('preferred_schedule', value)}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue placeholder={t('form.schedule')} /></SelectTrigger>
            <SelectContent>{scheduleOptions.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
        <div className="space-y-2">
          <Label>{t('form.language')}</Label>
          <Select value={form.client_language} onValueChange={(value) => handleChange('client_language', value)}>
            <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
            <SelectContent>{languages.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
          </Select>
        </div>
      </div>

      <div className="mt-5 space-y-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <Label>{t('form.orderText')}</Label>
          <button type="button" onClick={() => handleChange('original_text', DEMO_EXAMPLES[form.client_language] || DEMO_EXAMPLES.es)} className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 px-3 py-1.5 text-xs font-semibold text-violet-700 hover:bg-violet-100">
            <Sparkles className="h-3.5 w-3.5" /> {t('form.loadExample')}
          </button>
        </div>
        <Textarea data-testid="order-text" placeholder={t('form.orderPlaceholder')} value={form.original_text} onChange={(event) => handleChange('original_text', event.target.value)} className="min-h-32 resize-none rounded-3xl" />
        <p className="text-xs text-muted-foreground">{t('form.orderHelp')}</p>
      </div>

      <div className="mt-5 grid gap-5 md:grid-cols-[1fr_0.8fr]">
        <div className="space-y-2">
          <Label>{t('form.address')}</Label>
          <Input data-testid="order-address" value={form.delivery_address} onChange={(event) => handleChange('delivery_address', event.target.value)} placeholder={t('form.addressPlaceholder')} className="h-12 rounded-2xl" />
        </div>
        <div className="space-y-2">
          <Label>{t('form.notes')}</Label>
          <Input value={form.client_notes} onChange={(event) => handleChange('client_notes', event.target.value)} placeholder={t('form.notesPlaceholder')} className="h-12 rounded-2xl" />
        </div>
      </div>

      <div className="mt-5 flex flex-col gap-4 rounded-3xl border border-dashed border-primary/30 bg-primary/5 p-4 md:flex-row md:items-center">
        <div className="flex min-w-0 flex-1 items-center gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-primary/10"><FileUp className="h-5 w-5 text-primary" /></div>
          <div><Label>{t('form.images')}</Label><p className="text-xs text-muted-foreground">{t('form.imagesHelp')}</p></div>
        </div>
        <Input type="file" accept="image/*,.pdf" multiple onChange={handleFileChange} className="max-w-md rounded-2xl bg-white" />
      </div>

      {files.length > 0 && <p className="mt-2 text-xs text-muted-foreground">{files.map((file) => file.name).join(' · ')}</p>}
      {error && <div className="mt-5 flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900"><AlertCircle className="mt-0.5 h-5 w-5 shrink-0" /><p>{error}</p></div>}

      <Button data-testid="order-submit" type={currentAccount ? 'submit' : 'button'} onClick={currentAccount ? undefined : goToAccess} size="lg" disabled={Boolean(currentAccount) && (!isValid || sending)} className="mt-6 h-14 w-full rounded-full text-base font-semibold shadow-lg">
        {sending ? <><Loader2 className="h-4 w-4 animate-spin" /> {t('form.sending')}</> : currentAccount ? <><Send className="h-4 w-4" /> {t('form.submit')}</> : <><LockKeyhole className="h-4 w-4" /> {t('account.continue')}</>}
      </Button>
    </form>
  );
}

export default function OrderForm() {
  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <PublicHeader />
      <main className="flex-1 py-8 md:py-12">
        <div className="mx-auto max-w-4xl px-4"><OrderFormPanel /></div>
      </main>
      <PublicFooter />
    </div>
  );
}
