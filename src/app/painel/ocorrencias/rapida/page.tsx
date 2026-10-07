import Link from 'next/link';
import { can } from '@/features/access/domain/permissions';
import { BattalionOccurrenceForm } from '@/features/occurrences/ui/BattalionOccurrenceForm';
import { withSession } from '@/server/access/session';

type PageData = { allowed: boolean; configured: boolean; types: string[] };

export default async function BattalionOccurrencePage() {
  let data: PageData;
  try {
    data = await withSession(async (tx, actor) => {
      if (!['OPERADOR', 'GESTOR', 'ADMINISTRADOR'].includes(actor.role)) {
        return { allowed: false, configured: true, types: [] };
      }
      const groups = await tx.$queryRaw<{ id: string }[]>`
        SELECT id::text AS id FROM public.groups
        WHERE municipality_id=${actor.municipalityId} AND is_default
      `;
      const group = groups[0];
      const allowed = !!group && groups.length === 1 && can(actor, 'operate', { municipalityId: actor.municipalityId, groupId: group.id });
      if (!group || groups.length !== 1 || !allowed) return { allowed, configured: !!group && groups.length === 1, types: [] };
      const types = await tx.$queryRaw<{ name: string }[]>`
        SELECT name FROM public.occurrence_types WHERE active ORDER BY display_order,name
      `;
      return { allowed: true, configured: true, types: types.map(type => type.name) };
    });
  } catch {
    return <section className="space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Registro rápido do batalhão</h1>
      <p role="alert">Não foi possível carregar o formulário. Tente novamente.</p>
      <Link className="text-primary underline underline-offset-4" href="/painel/ocorrencias">Voltar para ocorrências</Link>
    </section>;
  }

  return <section className="mx-auto max-w-5xl space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-bold">Registro rápido do batalhão</h1>
    {!data.configured ? <p role="alert" className="rounded border border-warning/30 p-4">O grupo padrão não está configurado para este município. Solicite ajuste a um administrador.</p>
      : !data.allowed ? <p role="alert" className="rounded border border-warning/30 p-4">Seu perfil não está autorizado a registrar no grupo padrão. Solicite ajuste de acesso a um administrador.</p>
        : !data.types.length ? <p role="alert" className="rounded border border-warning/30 p-4">Nenhum tipo ativo está disponível no catálogo.</p>
          : <BattalionOccurrenceForm types={data.types} />}
    <Link className="inline-flex text-sm text-primary underline underline-offset-4" href="/painel/ocorrencias">Voltar para ocorrências</Link>
  </section>;
}
