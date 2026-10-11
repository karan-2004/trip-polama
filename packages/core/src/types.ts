export type TerrainKind = 'peak' | 'viewpoint' | 'forest' | 'waterfall' | 'camp';
export type Weather = 'clear' | 'cloudy' | 'rain' | 'fog' | 'snow';
export type Pace = 'slow' | 'moderate' | 'fast';

export interface Waypoint {
  placeName?: string;
  id: string;
  name: string;
  lat: number;
  lon: number;
  elevation?: number;
  note?: string;
  visited: boolean;
}

export interface Expense {
  id: string;
  description: string;
  amount: number;
  category: string;
  paidBy: string;
  splitAmong: string[];
  ts: number;
}

export interface Photo {
  image?: Blob;
  placeName?: string;
  id: string;
  filename: string;
  note?: string;
  lat?: number;
  lon?: number;
  ts: number;
}

export interface MemberLocation {
  placeName?: string;
  name: string;
  lat: number;
  lon: number;
  note?: string;
  ts: number;
}

export interface Trip {
  id: string;
  name: string;
  destination: string;
  startDate: string;
  endDate: string;
  currency: string;
  members: string[];
  waypoints: Waypoint[];
  expenses: Expense[];
  photos: Photo[];
  memberLocations: MemberLocation[];
  createdAt: number;
  updatedAt: number;
}
