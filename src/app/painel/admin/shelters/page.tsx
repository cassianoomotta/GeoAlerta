import { withSession } from '@/server/access/session';
import { AccessError, requireCapability } from '@/server/access/context';
import { ShelterAdminPanel } from '@/features/shelters/ui/ShelterAdminPanel';

export default async function SheltersPage() {
  try {
    await withSession(async (_tx, actor) => requireCapability(actor, 'administer'));
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    return <main className="p-6"><h1 className="text-2xl font-bold text-foreground">Administração de abrigos</h1><p role="alert" className="mt-4 text-danger">{status === 401 ? 'Entre com uma conta administradora para continuar.' : status === 403 ? 'Esta área está disponível somente para administradores ativos.' : 'Não foi possível validar o acesso agora.'}</p></main>;
  }
  return <ShelterAdminPanel />;
}
