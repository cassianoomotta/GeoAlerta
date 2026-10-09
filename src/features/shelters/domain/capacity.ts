import type { ShelterStatus } from '../contracts';

export function availableShelterPlaces(capacity: number, occupied: number): number {
  return Math.max(0, capacity - occupied);
}

export function effectiveShelterStatus(status: ShelterStatus, capacity: number, occupied: number): ShelterStatus {
  if (status === 'Encerrado') return 'Encerrado';
  if (capacity > 0 && occupied >= capacity) return 'Lotado';
  return 'Aberto';
}
