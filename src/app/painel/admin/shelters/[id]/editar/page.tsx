import Link from 'next/link';
import type { AdminShelter } from '@/features/shelters/contracts';
import { ShelterAdminPanel } from '@/features/shelters/ui/ShelterAdminPanel';
import { AccessError, requireCapability } from '@/server/access/context';
import { withSession } from '@/server/access/session';

export const dynamic = 'force-dynamic';

type ShelterRow = {
  id: string;
  name: string;
  type: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  capacity: number;
  occupied: number;
  phone: string | null;
  manager: string | null;
  status: AdminShelter['status'];
  is_active: boolean;
  created_at: Date | null;
};

function present(row: ShelterRow): AdminShelter {
  return {
    id: row.id,
    name: row.name,
    type: row.type as AdminShelter['type'],
    address: row.address,
    lat: row.lat,
    lng: row.lng,
    capacity: row.capacity,
    occupied: row.occupied,
    phone: row.phone,
    manager: row.manager,
    status: row.status,
    isActive: row.is_active,
    createdAt: row.created_at?.toISOString() ?? null,
  };
}

export default async function ShelterEditPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  let shelter: AdminShelter | null = null;
  let failureMessage = '';

  try {
    shelter = await withSession(async (tx, actor) => {
      requireCapability(actor, 'administer');
      if (!/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(id)) {
        throw new AccessError(404, 'NOT_FOUND');
      }

      const rows = await tx.$queryRaw<ShelterRow[]>`
        SELECT id::text,name,type,address,lat,lng,capacity,occupied,phone,manager,status,is_active,created_at
        FROM public.shelters
        WHERE id=${id}::uuid AND municipio='sa_patrulha'
      `;
      if (!rows[0]) throw new AccessError(404, 'NOT_FOUND');
      return present(rows[0]);
    });

  } catch (error) {
    const status = error instanceof AccessError ? error.status : 503;
    failureMessage = status === 401
      ? 'Entre com uma conta administradora para continuar.'
      : status === 403
        ? 'Esta área está disponível somente para administradores ativos.'
        : status === 404
          ? 'Abrigo não encontrado.'
          : 'Não foi possível carregar este abrigo agora.';

  }

  if (shelter) return <ShelterAdminPanel key={shelter.id} initialShelter={shelter} />;

  return (
    <main className="p-6">
      <h1 className="text-2xl font-bold text-white">Editar abrigo</h1>
      <p role="alert" className="mt-4 text-red-200">{failureMessage}</p>
      <Link href="/painel/admin/shelters" className="mt-4 inline-flex text-sm text-blue-200 underline">Voltar à lista</Link>
    </main>
  );
}
