// src/types/medicine.ts

export interface Medicine {
  id: number;
  name: string;
  generic_name: string | null;
  unit: string | null;
  purchase_price: number;
  selling_price: number;
  stock: number;
  low_stock_limit: number;
  expiry_date: string | null;
  created_at: string;
  updated_at: string;
}

export type NewMedicineInput = Omit<Medicine, 'id' | 'created_at' | 'updated_at'>;