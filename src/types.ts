export interface Match {
  id?: number;
  date: string;
  time?: string;
  club: string;
  team: string;
  result: string;
  status?: 'Pendiente' | 'Ganado' | 'Perdido';
}
