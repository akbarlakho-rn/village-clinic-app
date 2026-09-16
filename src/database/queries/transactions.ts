// src/database/queries/transactions.ts
import { getDatabase } from '../index';

export interface CartItemInput {
  medicine_id: number;
  quantity: number;
  unit_price: number;
  total_price: number;
}

export interface NewTransactionInput {
  household_id: number;
  patient_id: number;
  payment_type: 'cash' | 'loan' | 'partial';
  total_amount: number;
  discount_amount: number;
  paid_amount: number;
  loan_amount: number;
  notes?: string;
  items: CartItemInput[];
}

export async function createSaleTransaction(data: NewTransactionInput): Promise<number> {
  const db = await getDatabase();
  let transactionId = 0;

  await db.withTransactionAsync(async () => {
    // 1. Insert Transaction Header
    const transResult = await db.runAsync(
      `INSERT INTO transactions (
        household_id, patient_id, payment_type, total_amount, discount_amount, paid_amount, loan_amount, notes
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        data.household_id,
        data.patient_id,
        data.payment_type,
        data.total_amount,
        data.discount_amount,
        data.paid_amount,
        data.loan_amount,
        data.notes || null,
      ]
    );

    transactionId = transResult.lastInsertRowId;

    // 2. Insert Items and Deduct Stock
    for (const item of data.items) {
      await db.runAsync(
        `INSERT INTO transaction_items (transaction_id, medicine_id, quantity, unit_price, total_price)
         VALUES (?, ?, ?, ?, ?);`,
        [transactionId, item.medicine_id, item.quantity, item.unit_price, item.total_price]
      );

      // Deduct stock from medicines table
      await db.runAsync(
        `UPDATE medicines 
         SET stock = stock - ?, updated_at = datetime('now', 'localtime') 
         WHERE id = ?;`,
        [item.quantity, item.medicine_id]
      );

      // Log into stock_transactions
      await db.runAsync(
        `INSERT INTO stock_transactions (medicine_id, type, quantity, notes)
         VALUES (?, 'sale', ?, ?);`,
        [item.medicine_id, -Math.abs(item.quantity), `Sale Bill #${transactionId}`]
      );
    }

    // 3. If there is a loan, update Household Balance
    if (data.loan_amount > 0) {
      await db.runAsync(
        `UPDATE households 
         SET balance = balance + ?, updated_at = datetime('now', 'localtime') 
         WHERE id = ?;`,
        [data.loan_amount, data.household_id]
      );
    }
  });

  return transactionId;
}
// 1. Cancel / Void a transaction completely with stock & ledger reversal
export async function voidTransaction(transactionId: number, reason: string = 'User Voided'): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // A. پرانی ٹرانزیکشن کی تفصیلات حاصل کریں
    const transaction = await db.getFirstAsync<{
      household_id: number;
      loan_amount: number;
      payment_type: string;
    }>(`SELECT household_id, loan_amount, payment_type FROM transactions WHERE id = ?;`, [transactionId]);

    if (!transaction) {
      throw new Error('Transaction not found.');
    }

    // B. اس پرچی کی تمام دوائیں اور تعداد حاصل کریں
    const items = await db.getAllAsync<{
      medicine_id: number;
      quantity: number;
    }>(`SELECT medicine_id, quantity FROM transaction_items WHERE transaction_id = ?;`, [transactionId]);

    // C. ادویات کا اسٹاک واپس گودام میں پلس کریں
    for (const item of items) {
      await db.runAsync(
        `UPDATE medicines 
         SET stock = stock + ?, updated_at = datetime('now', 'localtime') 
         WHERE id = ?;`,
        [item.quantity, item.medicine_id]
      );

      // اسٹاک ایڈجسٹمنٹ لاگ
      await db.runAsync(
        `INSERT INTO stock_transactions (medicine_id, type, quantity, notes)
         VALUES (?, 'adjustment', ?, ?);`,
        [item.medicine_id, item.quantity, `Reversed from Voided Trans #${transactionId}`]
      );
    }

    // D. اگر ادھار چڑھا تھا تو کھاتے سے مائنس کریں
    if (transaction.loan_amount > 0) {
      await db.runAsync(
        `UPDATE households 
         SET balance = MAX(0, balance - ?), updated_at = datetime('now', 'localtime') 
         WHERE id = ?;`,
        [transaction.loan_amount, transaction.household_id]
      );
    }

    // E. پرچی اور اس کے آئٹمز ڈیلیٹ کریں
    await db.runAsync(`DELETE FROM transaction_items WHERE transaction_id = ?;`, [transactionId]);
    await db.runAsync(`DELETE FROM transactions WHERE id = ?;`, [transactionId]);
  });
}

// 2. Fetch full single transaction details with items for re-loading in Cart
export async function getTransactionDetailsForEdit(transactionId: number) {
  const db = await getDatabase();

  const transaction = await db.getFirstAsync<any>(
    `SELECT t.*, p.name as patient_name, p.patient_code, h.head_name as household_head, h.household_code, h.balance as current_balance
     FROM transactions t
     JOIN patients p ON t.patient_id = p.id
     JOIN households h ON t.household_id = h.id
     WHERE t.id = ?;`,
    [transactionId]
  );

  if (!transaction) return null;

  const items = await db.getAllAsync<any>(
    `SELECT ti.*, m.name as medicine_name, m.stock, m.unit
     FROM transaction_items ti
     JOIN medicines m ON ti.medicine_id = m.id
     WHERE ti.transaction_id = ?;`,
    [transactionId]
  );

  return {
    transaction,
    items,
  };
}