'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

type Phase = 'email' | 'code';

export default function LoginPage() {
  const router = useRouter();
  const [phase, setPhase] = useState<Phase>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const codeRef = useRef<HTMLInputElement>(null);

  async function sendCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    // Sin emailRedirectTo → Supabase manda código OTP en lugar de link
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { shouldCreateUser: false },
    });
    setLoading(false);
    if (error) { setError(error.message); return; }
    setPhase('code');
    setTimeout(() => codeRef.current?.focus(), 100);
  }

  async function verifyCode(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.verifyOtp({
      email,
      token: code.replace(/\s/g, ''),
      type: 'email',
    });
    if (error) { setError(error.message); setLoading(false); return; }
    router.push('/');
    router.refresh();
  }

  async function loginWithGoogle() {
    setLoading(true); setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
        queryParams: { access_type: 'offline', prompt: 'select_account' },
      },
    });
    if (error) { setError(error.message); setLoading(false); }
    // Si todo OK, Supabase redirige solo a Google.
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card tone="white" className="w-full max-w-md p-8">
        <div className="border-3 border-ink bg-mint inline-block px-3 py-1 mb-6 font-black text-2xl shadow-brut">
          PLATAS·CASA
        </div>
        <h1 className="text-2xl font-black mb-2">Entra a tu casa</h1>
        <p className="text-sm mb-6">
          {phase === 'email'
            ? 'Te enviamos un código de 6 dígitos a tu correo.'
            : `Código enviado a ${email}. Pégalo aquí.`}
        </p>

        {phase === 'email' && (
          <div className="space-y-4">
            <button
              type="button"
              onClick={loginWithGoogle}
              disabled={loading}
              className="w-full border-3 border-ink rounded-md bg-white shadow-brut py-3 px-4 font-black text-base flex items-center justify-center gap-2 active:translate-x-[1px] active:translate-y-[1px] active:shadow-brutSm disabled:opacity-50"
            >
              <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
                <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
              </svg>
              Continuar con Google
            </button>

            <div className="flex items-center gap-3 text-xs font-bold text-ink/50">
              <div className="flex-1 h-0.5 bg-ink/20" />
              <span>O CON CORREO</span>
              <div className="flex-1 h-0.5 bg-ink/20" />
            </div>

            <form onSubmit={sendCode} className="space-y-4">
              <div>
                <Label htmlFor="email">Correo</Label>
                <Input
                  id="email"
                  type="email"
                  inputMode="email"
                  autoComplete="email"
                  required
                  placeholder="tu@correo.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
              </div>
              {error && <p className="text-sm font-bold text-red-700">{error}</p>}
              <Button type="submit" full disabled={loading || !email}>
                {loading ? 'Enviando…' : 'Enviar código'}
              </Button>
            </form>
          </div>
        )}

        {phase === 'code' && (
          <form onSubmit={verifyCode} className="space-y-4">
            <Card tone="lemon" className="p-3">
              <p className="font-bold text-sm">📬 Revisa tu correo</p>
              <p className="text-xs mt-1">
                Te enviamos un código a <b>{email}</b>. Vuelve aquí y escríbelo abajo.
              </p>
            </Card>
            <div>
              <Label htmlFor="code">Código (6-8 dígitos)</Label>
              <input
                ref={codeRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                required
                placeholder="00000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 8))}
                className="w-full text-3xl font-black text-center border-3 border-ink rounded-md py-3 bg-white shadow-brutSm focus:outline-none tabular-nums tracking-widest"
                maxLength={8}
              />
            </div>
            {error && <p className="text-sm font-bold text-red-700">{error}</p>}
            <Button type="submit" full disabled={loading || code.length < 6}>
              {loading ? 'Verificando…' : 'Entrar'}
            </Button>
            <button
              type="button"
              onClick={() => { setPhase('email'); setCode(''); setError(null); }}
              className="w-full text-xs underline font-bold"
            >
              ← Cambiar correo / re-enviar
            </button>
          </form>
        )}
      </Card>
    </main>
  );
}
