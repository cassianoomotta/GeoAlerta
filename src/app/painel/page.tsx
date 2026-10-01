import { CoreMapOverview } from '@/features/occurrences/ui/CoreMapOverview';

export default function DashboardPage() {
  return <main className="space-y-5 p-4 md:p-6"><h1 className="text-2xl font-bold text-white">Central de ocorrências</h1><CoreMapOverview /></main>;
}
