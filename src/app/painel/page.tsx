import { CoreDashboardIndicators } from '@/features/occurrences/ui/CoreDashboardIndicators';
import { EventDashboard } from '@/features/occurrences/ui/EventDashboard';
import { PageHeader } from '@/components/ui/page-header';

export default function DashboardPage() {
  return <main className="space-y-6"><PageHeader title="Quadro de situação" description="Panorama das ocorrências para acompanhamento e passagem de situação."/><EventDashboard/><CoreDashboardIndicators /></main>;
}
