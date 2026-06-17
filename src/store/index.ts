import { create } from 'zustand';
import type { Groomer, GroomingService } from '../../shared/types';

interface AppState {
  activeBoarding: number;
  groomerList: Groomer[];
  serviceList: GroomingService[];
  setActiveBoarding: (count: number) => void;
  setGroomers: (groomers: Groomer[]) => void;
  setServices: (services: GroomingService[]) => void;
}

export const useAppStore = create<AppState>((set) => ({
  activeBoarding: 0,
  groomerList: [],
  serviceList: [],
  setActiveBoarding: (count) => set({ activeBoarding: count }),
  setGroomers: (groomers) => set({ groomerList: groomers }),
  setServices: (services) => set({ serviceList: services }),
}));
