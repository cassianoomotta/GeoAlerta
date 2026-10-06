import Link from 'next/link';
import { ManualOccurrenceForm } from '@/features/occurrences/ui/ManualOccurrenceForm';
import { withSession } from '@/server/access/session';

type FormOptions = { groups: { id: string; name: string }[]; types: string[] };

export default async function NewOccurrencePage() {
  let options: FormOptions | null;
  try {
    options = await withSession(async (tx, actor) => {
      if (actor.role === 'CONSULTA') return null;
      const groups = await tx.$queryRaw<{ id: string; name: string }[]>`SELECT id,name FROM public.groups ORDER BY name,id`;
      const types = await tx.$queryRaw<{ name: string }[]>`SELECT name FROM public.occurrence_types WHERE active ORDER BY display_order,name`;
      return { groups, types: types.map(type => type.name) };
    });
  } catch {
    return <section className="space-y-5 p-4 md:p-6">
      <h1 className="text-2xl font-bold">Nova ocorrência</h1>
      <p role="alert">Não foi possível carregar o formulário. Tente novamente.</p>
      <Link className="text-primary underline underline-offset-4" href="/painel/ocorrencias/nova">Tentar novamente</Link>
    </section>;
  }

  return <section className="space-y-5 p-4 md:p-6">
    <h1 className="text-2xl font-bold">Nova ocorrência</h1>
    <Link className="inline-flex text-sm text-primary underline underline-offset-4" href="/painel/ocorrencias">Voltar para a lista de ocorrências</Link>
    {!options ? <p role="alert">Seu perfil não tem permissão para registrar ocorrências.</p>
      : !options.groups.length ? <p role="alert">Nenhum grupo autorizado está disponível para registrar a ocorrência.</p>
      : <ManualOccurrenceForm groups={options.groups} types={options.types} />}
  </section>;
}
