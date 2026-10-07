export type ClimateEventState = 'PLANEJADO' | 'EM_ANDAMENTO' | 'ENCERRADO';

export type ClimateEvent = {
  id: string;
  municipalityId: string;
  name: string;
  plannedStart: string;
  plannedEnd: string;
  state: ClimateEventState;
  startedAt: string | null;
  endedAt: string | null;
  createdAt: string;
  updatedAt: string;
  version: number;
};
