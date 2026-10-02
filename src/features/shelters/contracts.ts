export type ShelterStatus = 'Aberto' | 'Lotado' | 'Encerrado';
export type ShelterType = 'humano' | 'pet' | 'misto';

export interface ShelterInput {
  name: string;
  type: ShelterType;
  address: string;
  lat: number;
  lng: number;
  capacity: number;
  occupied: number;
  phone: string | null;
  manager: string | null;
  status: ShelterStatus;
  isActive: boolean;
}

export interface PublicShelter {
  id: string;
  name: string;
  type: ShelterType;
  address: string;
  lat: number;
  lng: number;
  status: 'Aberto';
}

export interface AdminShelter extends Omit<ShelterInput, 'address' | 'lat' | 'lng'> {
  id: string;
  address: string | null;
  lat: number | null;
  lng: number | null;
  createdAt: string | null;
}
