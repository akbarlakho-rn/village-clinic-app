// src/types/household.ts

export interface Household {
  id: number;
  household_code: string;
  head_name: string;
  village: string | null;
  phone: string | null;
  opening_balance: number;
  balance: number;
  notes: string | null;
  created_at: string;
  updated_at: string;
}

export interface NewHouseholdInput {
  head_name: string;
  village?: string;
  phone?: string;
  opening_balance?: number;
  notes?: string;
}

export interface Patient {
  id: number;
  patient_code: string;
  household_id: number;
  name: string;
  relation_to_head: string | null;
  village: string | null;
  phone: string | null;
  created_at: string;
  updated_at: string;
}

export interface PatientWithHousehold extends Patient {
  household_head: string;
  household_balance: number;
  household_code: string;
}
