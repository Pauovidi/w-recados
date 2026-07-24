import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Eye, EyeOff, KeyRound, LogIn, UserPlus } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PublicHeader from '@/components/public/PublicHeader';
import PublicFooter from '@/components/public/PublicFooter';
import { useDemoStore } from '@/lib/DemoStore';
import { useLanguage } from '@/hooks/useLanguage';

export default function ClientAccess() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { language, languages, t } = useLanguage();
  const {
    loginClient, registerClient, verifyClient, resendOtp, isProduction,
  } = useDemoStore();
  const [mode, setMode] = useState('login');
  const [showPassword, setShowPassword] = useState(false);
  const [sending, setSending] = useState(false);
  const [error, setError] = useState('');
  const [pendingRegistration, setPendingRegistration] = useState(null);
  const [otpCode, setOtpCode] = useState('');
  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    password: '',
    language,
  });

  useEffect(() => {
    if (!isProduction) {
      setForm((current) => ({
        ...current,
        email: current.email || 'anna@demo.wrecados.es',
        password: current.password || 'demo1234',
      }));
    }
  }, [isProduction]);

  const setField = (field, value) => setForm((current) => ({ ...current, [field]: value }));
  const returnTo = searchParams.get('return');
  const safeReturnTo = returnTo?.startsWith('/') ? returnTo : '/mi-cuenta';

  const submit = async (event) => {
    event.preventDefault();
    setSending(true);
    setError('');
    try {
      if (mode === 'verify') {
        const verifiedUser = await verifyClient({
          email: pendingRegistration.email,
          otpCode,
          profile: pendingRegistration.profile,
        });
        navigate(verifiedUser?.role === 'admin' ? '/admin' : safeReturnTo);
        return;
      } else if (mode === 'login') {
        const signedInUser = await loginClient(form);
        navigate(signedInUser?.role === 'admin' ? '/admin' : safeReturnTo);
        return;
      } else {
        const registration = await registerClient(form);
        if (registration?.verificationRequired) {
          setPendingRegistration(registration);
          setMode('verify');
          setSending(false);
          return;
        }
      }
      navigate(safeReturnTo);
    } catch (submitError) {
      setError(submitError?.message || 'No se ha podido completar el acceso.');
      setSending(false);
    }
  };

  return (
    <div className="flex min-h-screen flex-col bg-secondary/30">
      <PublicHeader />
      <main className="flex-1 px-4 py-10 md:py-16">
        <div className="mx-auto max-w-lg">
          <Link to="/" className="mb-5 inline-flex items-center gap-2 text-sm font-semibold text-muted-foreground hover:text-foreground">
            <ArrowLeft className="h-4 w-4" /> W Recados
          </Link>

          <Card className="overflow-hidden rounded-[2rem] border-blue-100 shadow-xl shadow-blue-950/10">
            <CardHeader className="bg-slate-950 p-7 text-white">
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl bg-primary">
                <KeyRound className="h-5 w-5" />
              </div>
              <CardTitle className="font-heading text-3xl font-extrabold">{t('account.title')}</CardTitle>
              <p className="mt-2 text-sm leading-6 text-white/65">{t('account.subtitle')}</p>
            </CardHeader>
            <CardContent className="p-6 md:p-8">
              {mode !== 'verify' && <div className="mb-6 grid grid-cols-2 rounded-2xl bg-muted p-1">
                <button type="button" onClick={() => setMode('login')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${mode === 'login' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}>
                  {t('account.login')}
                </button>
                <button type="button" onClick={() => setMode('register')} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition ${mode === 'register' ? 'bg-white shadow-sm' : 'text-muted-foreground'}`}>
                  {t('account.register')}
                </button>
              </div>}

              <form onSubmit={submit} className="space-y-4">
                {mode === 'verify' && (
                  <div className="space-y-4">
                    <div className="rounded-2xl border border-blue-200 bg-blue-50 p-4 text-sm leading-6 text-blue-950">
                      Hemos enviado un código de verificación a <strong>{pendingRegistration?.email}</strong>.
                    </div>
                    <div className="space-y-2">
                      <Label>Código de verificación</Label>
                      <Input
                        value={otpCode}
                        onChange={(event) => setOtpCode(event.target.value.replace(/\D/g, '').slice(0, 8))}
                        inputMode="numeric"
                        autoComplete="one-time-code"
                        required
                        className="h-14 rounded-2xl text-center text-xl tracking-[0.35em]"
                        placeholder="000000"
                      />
                    </div>
                  </div>
                )}
                {mode === 'register' && (
                  <>
                    <div className="space-y-2">
                      <Label>{t('account.name')}</Label>
                      <Input value={form.name} onChange={(event) => setField('name', event.target.value)} required className="h-12 rounded-2xl" />
                    </div>
                    <div className="grid gap-4 sm:grid-cols-2">
                      <div className="space-y-2">
                        <Label>{t('account.phone')}</Label>
                        <Input type="tel" value={form.phone} onChange={(event) => setField('phone', event.target.value)} required className="h-12 rounded-2xl" placeholder="+34 600 000 000" />
                      </div>
                      <div className="space-y-2">
                        <Label>{t('form.language')}</Label>
                        <Select value={form.language} onValueChange={(value) => setField('language', value)}>
                          <SelectTrigger className="h-12 rounded-2xl"><SelectValue /></SelectTrigger>
                          <SelectContent>{languages.map((item) => <SelectItem key={item.value} value={item.value}>{item.label}</SelectItem>)}</SelectContent>
                        </Select>
                      </div>
                    </div>
                  </>
                )}

                {mode !== 'verify' && <div className="space-y-2">
                  <Label>{t('account.email')}</Label>
                  <Input data-testid="client-email" type="email" value={form.email} onChange={(event) => setField('email', event.target.value)} required className="h-12 rounded-2xl" />
                </div>}
                {mode !== 'verify' && <div className="space-y-2">
                  <Label>{t('account.password')}</Label>
                  <div className="relative">
                    <Input data-testid="client-password" type={showPassword ? 'text' : 'password'} value={form.password} onChange={(event) => setField('password', event.target.value)} minLength={8} required className="h-12 rounded-2xl pr-12" />
                    <button type="button" onClick={() => setShowPassword((value) => !value)} className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-2 text-muted-foreground" aria-label={showPassword ? 'Ocultar contraseña' : 'Mostrar contraseña'}>
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </div>}

                {mode === 'login' && !isProduction && (
                  <div className="rounded-2xl border border-violet-200 bg-violet-50 p-4 text-sm text-violet-950">
                    <p className="font-bold">{t('account.demoAccess')}</p>
                    <p className="mt-1">anna@demo.wrecados.es · demo1234</p>
                  </div>
                )}

                {error && <p className="rounded-2xl bg-rose-50 p-3 text-sm font-medium text-rose-800">{error}</p>}

                <Button data-testid="client-access-submit" type="submit" disabled={sending} className="h-12 w-full rounded-full">
                  {mode === 'login' ? <LogIn className="h-4 w-4" /> : <UserPlus className="h-4 w-4" />}
                  {mode === 'verify' ? 'Verificar y entrar' : mode === 'login' ? t('account.login') : t('account.register')}
                </Button>
                {mode === 'verify' && (
                  <div className="flex flex-wrap justify-center gap-3 text-sm">
                    <button type="button" className="font-semibold text-primary" onClick={() => resendOtp(pendingRegistration.email)}>Reenviar código</button>
                    <button type="button" className="text-muted-foreground" onClick={() => setMode('register')}>Cambiar datos</button>
                  </div>
                )}
              </form>
            </CardContent>
          </Card>
        </div>
      </main>
      <PublicFooter />
    </div>
  );
}
