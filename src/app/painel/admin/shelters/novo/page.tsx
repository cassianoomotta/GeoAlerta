import Link from 'next/link';
import { ShelterAdminPanel } from '@/features/shelters/ui/ShelterAdminPanel';
import { AccessError, requireCapability } from '@/server/access/context';
import { withSession } from '@/server/access/session';

export const dynamic = 'force-dynamic';

export default async function NewShelterPage() {
  let authorized = false;
  let failureMessage = '';

  try {
    await withSession(async (_tx, actor) => requireCapability(actor, 'administer'));
    authorized = true;
  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    failureMessage = status === 401
      ? 'Entre com uma conta administradora para continuar.'
      : status === 403
        ? 'Esta área está disponível somente para administradores ativos.'
        : 'Não foi possível validar o acesso agora.';
  }

  if (authorized) return <ShelterAdminPanel mode="create" />;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-white">Cadastrar abrigo</h1>
      <p role="alert" className="mt-4 text-red-200">{failureMessage}</p>
      <Link href="/painel/admin/shelters" className="mt-4 inline-flex text-sm text-blue-200 underline">Voltar à lista</Link>
    </main>
  );
}
