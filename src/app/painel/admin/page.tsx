import { withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import { AdminPanel } from '@/features/access/ui/AdminPanel';

export default async function AdminPage() {
  try {
    await withSession(async (_tx, actor) => requireCapability(actor, 'administer'));
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    return <main className="mx-auto w-full max-w-4xl p-6"><h1 className="text-2xl font-bold text-white">Administração de acessos</h1><p role="alert" className="mt-4 text-red-200">{status === 401 ? 'Entre com uma conta administradora para continuar.' : status === 403 ? 'Esta área está disponível somente para administradores ativos.' : 'Não foi possível validar o acesso agora.'}</p></main>;
  }
  return <AdminPanel />;
}
