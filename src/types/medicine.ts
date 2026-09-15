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
  expiry_date: string | null; // Format: YYYY-MM-DD
  created_at: string;
  updated_at: string;
}

export type NewMedicineInput = Omit<Medicine, 'id' | 'created_at' | 'updated_at'>;

export type StockTransactionType = 'purchase' | 'sale' | 'adjustment' | 'damage' | 'return';

export interface StockTransaction {
  id: number;
  medicine_id: number;
  type: StockTransactionType;
  quantity: number;
  purchase_price: number | null;
  notes: string | null;
  created_at: string;
}