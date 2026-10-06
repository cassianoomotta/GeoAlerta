"use client";

import { useState, useSyncExternalStore } from "react";
import { supabase } from "@/lib/supabase";
import { useRouter } from "next/navigation";
import { ShieldAlert } from "lucide-react";
import { Field } from '@/components/ui/field';
import { Button } from '@/components/ui/button';
import { InlineNotice } from '@/components/ui/inline-notice';
import { ThemeSelect } from '@/components/theme/theme-select';
const subscribe=()=>()=>{};

export default function Login() {
  const ready=useSyncExternalStore(subscribe,()=>true,()=>false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      setError(error.message);
      setLoading(false);
    } else {
      const access=await fetch('/api/core/session',{cache:'no-store'});
      if(!access.ok) {
        await supabase.auth.signOut();
        setError(access.status===403?'Conta sem autorização para acessar o painel.':'Não foi possível verificar o acesso.');
        setLoading(false);
        return;
      }
      router.replace("/painel");
      router.refresh();
    }
  };

  return <main className="flex min-h-dvh flex-col items-center justify-center gap-8 bg-background px-4 py-8">
    <div className="w-full max-w-sm">
      <header className="mb-6">
        <p className="text-xl font-semibold text-primary">GeoAlerta</p>
        <h1 className="mt-6 text-2xl font-semibold">Gabinete de Crise</h1>
        <p className="mt-2 text-sm text-muted-foreground">Acesso restrito a servidores autorizados</p>
      </header>
      <form onSubmit={handleLogin} className="surface-panel space-y-5 p-6" aria-busy={loading}>
        {error && <InlineNotice tone="danger" role="alert">{error}</InlineNotice>}
        <Field label="E-mail Institucional" type="email" autoComplete="username" value={email} onChange={event => setEmail(event.target.value)} required placeholder="operador@prefeitura.gov.br" disabled={loading} />
        <Field label="Senha de Acesso" type="password" autoComplete="current-password" placeholder="••••••••" value={password} onChange={event => setPassword(event.target.value)} required disabled={loading} />
        <Button type="submit" disabled={!ready} loading={loading} loadingLabel="Autenticando…" className="w-full"><ShieldAlert size={18} aria-hidden="true" />Entrar no Painel</Button>
      </form>
      <p className="mt-6 text-sm leading-5 text-muted-foreground">Sistema desenvolvido para a Prefeitura de Santo Antônio da Patrulha. Uso exclusivo de órgãos oficiais.</p>
      <div className="mt-6"><ThemeSelect /></div>
    </div>
  </main>;
}
