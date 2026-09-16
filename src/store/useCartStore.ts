// src/store/useCartStore.ts
import { create } from 'zustand';
import { Medicine } from '../types/medicine';
import { PatientWithHousehold } from '../types/household';

export interface CartItem {
  medicine: Medicine;
  quantity: number;
  unit_price: number;
  total_price: number;
}

interface CartState {
  selectedPatient: PatientWithHousehold | null;
  items: CartItem[];
  discount: number;
  paidAmount: number;
  paymentType: 'cash' | 'loan' | 'partial';
  notes: string;

  // Actions
  setSelectedPatient: (patient: PatientWithHousehold | null) => void;
  addItem: (med: Medicine) => void;
  removeItem: (medicineId: number) => void;
  updateQuantity: (medicineId: number, qty: number) => void;
  setDiscount: (amount: number) => void;
  setPaidAmount: (amount: number) => void;
  setPaymentType: (type: 'cash' | 'loan' | 'partial') => void;
  setNotes: (text: string) => void;
  clearCart: () => void;
  

  // Calculations
  getSubTotal: () => number;
  getNetTotal: () => number;
  getLoanAmount: () => number;
}

export const useCartStore = create<CartState>((set, get) => ({
  selectedPatient: null,
  items: [],
  discount: 0,
  paidAmount: 0,
  paymentType: 'cash',
  notes: '',

  setSelectedPatient: (patient) => set({ selectedPatient: patient }),

  addItem: (med) => {
    const { items } = get();
    const existing = items.find((i) => i.medicine.id === med.id);

    if (existing) {
      if (existing.quantity >= med.stock) return; // Prevent adding more than stock
      set({
        items: items.map((i) =>
          i.medicine.id === med.id
            ? { ...i, quantity: i.quantity + 1, total_price: (i.quantity + 1) * i.unit_price }
            : i
        ),
      });
    } else {
      if (med.stock <= 0) return;
      set({
        items: [
          ...items,
          {
            medicine: med,
            quantity: 1,
            unit_price: med.selling_price,
            total_price: med.selling_price,
          },
        ],
      });
    }
  },

  removeItem: (medId) => {
    set({ items: get().items.filter((i) => i.medicine.id !== medId) });
  },

  updateQuantity: (medId, qty) => {
    if (qty <= 0) {
      get().removeItem(medId);
      return;
    }
    set({
      items: get().items.map((i) => {
        if (i.medicine.id === medId) {
          const validQty = Math.min(qty, i.medicine.stock);
          return { ...i, quantity: validQty, total_price: validQty * i.unit_price };
        }
        return i;
      }),
    });
  },

  setDiscount: (discount) => set({ discount }),
  setPaidAmount: (paidAmount) => set({ paidAmount }),
  setPaymentType: (paymentType) => set({ paymentType }),
  setNotes: (notes) => set({ notes }),

  clearCart: () =>
    set({
      selectedPatient: null,
      items: [],
      discount: 0,
      paidAmount: 0,
      paymentType: 'cash',
      notes: '',
    }),

  getSubTotal: () => get().items.reduce((sum, i) => sum + i.total_price, 0),
  getNetTotal: () => Math.max(0, get().getSubTotal() - get().discount),
  getLoanAmount: () => {
    const net = get().getNetTotal();
    const paid = get().paidAmount;
    if (get().paymentType === 'cash') return 0;
    if (get().paymentType === 'loan') return net;
    return Math.max(0, net - paid);
  },
}));