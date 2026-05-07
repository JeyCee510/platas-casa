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
              <Label htmlFor="code">Código (6 dígitos)</Label>
              <input
                ref={codeRef}
                id="code"
                type="text"
                inputMode="numeric"
                autoComplete="one-time-code"
                pattern="[0-9]*"
                required
                placeholder="000000"
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
                className="w-full text-3xl font-black text-center border-3 border-ink rounded-md py-3 bg-white shadow-brutSm focus:outline-none tabular-nums tracking-widest"
                maxLength={6}
              />
            </div>
            {error && <p className="text-sm font-bold text-red-700">{error}</p>}
            <Button type="submit" full disabled={loading || code.length !== 6}>
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
