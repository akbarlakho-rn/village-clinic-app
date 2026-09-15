// src/store/useHouseholdStore.ts
import { create } from 'zustand';
import { Household, Patient, NewHouseholdInput, NewPatientInput } from '../types/household';
import { 
  getHouseholds, 
  searchPatients, 
  addHousehold, 
  addPatient 
} from '../database/queries/households';

interface PatientWithHead extends Patient {
  household_head: string;
  household_balance: number;
}

interface HouseholdState {
  households: Household[];
  patients: PatientWithHead[];
  isLoading: boolean;
  searchTerm: string;
  
  // ایکشنز
  fetchHouseholds: (search?: string) => Promise<void>;
  fetchPatients: (search?: string) => Promise<void>;
  setSearchTerm: (term: string) => void;
  createHouseholdWithFirstPatient: (
    householdData: NewHouseholdInput,
    patientName?: string,
    relation?: string
  ) => Promise<{ householdId: number; patientId?: number }>;
  createNewPatient: (patientData: NewPatientInput) => Promise<number>;
}

export const useHouseholdStore = create<HouseholdState>((set, get) => ({
  households: [],
  patients: [],
  isLoading: false,
  searchTerm: '',

  setSearchTerm: (term: string) => {
    set({ searchTerm: term });
    get().fetchPatients(term);
  },

  fetchHouseholds: async (search = '') => {
    set({ isLoading: true });
    try {
      const data = await getHouseholds(search);
      set({ households: data });
    } catch (error) {
      console.error('Households fetch error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  fetchPatients: async (search = '') => {
    set({ isLoading: true });
    try {
      const data = await searchPatients(search);
      set({ patients: data });
    } catch (error) {
      console.error('Patients fetch error:', error);
    } finally {
      set({ isLoading: false });
    }
  },

  createHouseholdWithFirstPatient: async (householdData, patientName, relation) => {
    set({ isLoading: true });
    try {
      // 1. نیا کھاتہ درج کریں
      const { id: householdId } = await addHousehold(householdData);

      let patientId: number | undefined;

      // 2. اگر مریض کا نام دیا گیا ہے (یا سربرہ خود ہی پہلا مریض ہے)
      const finalPatientName = patientName?.trim() || householdData.head_name.trim();
      const patientResult = await addPatient({
        household_id: householdId,
        name: finalPatientName,
        relation_to_head: relation?.trim() || (patientName ? 'Family Member' : 'Self / سربراہ'),
        village: householdData.village,
        phone: householdData.phone,
      });
      patientId = patientResult.id;

      // لسٹ دوبارہ ریفریش کریں
      await get().fetchPatients(get().searchTerm);
      await get().fetchHouseholds();

      return { householdId, patientId };
    } finally {
      set({ isLoading: false });
    }
  },

  createNewPatient: async (patientData) => {
    set({ isLoading: true });
    try {
      const result = await addPatient(patientData);
      await get().fetchPatients(get().searchTerm);
      return result.id;
    } finally {
      set({ isLoading: false });
    }
  },
}));