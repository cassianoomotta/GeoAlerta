import { withSession } from '@/server/access/session';
import { requireCapability } from '@/server/access/context';
import { ClimateEventAdminPanel } from '@/features/climate-events/ui/ClimateEventAdminPanel';

export default async function ClimateEventsPage() {
  try {
    await withSession(async (_tx, actor) => requireCapability(actor, 'reclassify'));
  } catch {
    return <main className="mx-auto max-w-3xl p-6"><h1 className="text-2xl font-bold">Gestão de eventos climáticos</h1><p role="alert" className="mt-3 text-sm text-muted-foreground">Esta área está disponível para gestores e administradores ativos do município.</p></main>;
  }
  return <ClimateEventAdminPanel />;
}
