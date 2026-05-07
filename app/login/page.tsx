'use client';
import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Input, Label } from '@/components/ui/Input';
import { createClient } from '@/lib/supabase/client';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: { emailRedirectTo: `${window.location.origin}/auth/callback` },
    });
    setLoading(false);
    if (error) setError(error.message);
    else setSent(true);
  }

  return (
    <main className="min-h-screen flex items-center justify-center p-4">
      <Card tone="white" className="w-full max-w-md p-8">
        <div className="border-3 border-ink bg-mint inline-block px-3 py-1 mb-6 font-black text-2xl">
          PLATAS·CASA
        </div>
        <h1 className="text-2xl font-black mb-2">Entra a tu casa</h1>
        <p className="text-sm mb-6">Te mandamos un link mágico por correo. Sin contraseñas.</p>

        {sent ? (
          <Card tone="lemon" className="p-4">
            <p className="font-bold">📬 Revisa tu correo</p>
            <p className="text-sm mt-1">Te enviamos un link a <b>{email}</b>. Haz click y entras.</p>
          </Card>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="email">Correo</Label>
              <Input
                id="email"
                type="email"
                required
                placeholder="tu@correo.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
            </div>
            {error && <p className="text-sm font-bold text-red-700">{error}</p>}
            <Button type="submit" full disabled={loading}>
              {loading ? 'Enviando...' : 'Enviar link'}
            </Button>
          </form>
        )}
      </Card>
    </main>
  );
}
