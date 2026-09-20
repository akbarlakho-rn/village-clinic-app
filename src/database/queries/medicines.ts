// src/database/queries/medicines.ts
import { getDatabase } from '../index';
import { Medicine, NewMedicineInput } from '../../types/medicine';

// Add new medicine and create initial stock transaction log
export async function addMedicine(med: NewMedicineInput): Promise<number> {
  const db = await getDatabase();
  
  let insertedId = 0;

  await db.withTransactionAsync(async () => {
    const result = await db.runAsync(
      `INSERT INTO medicines (
        name, generic_name, unit, purchase_price, selling_price, stock, low_stock_limit, expiry_date
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
      [
        med.name.trim(),
        med.generic_name?.trim() || null,
        med.unit?.trim() || 'tablet',
        med.purchase_price,
        med.selling_price,
        med.stock || 0,
        med.low_stock_limit || 10,
        med.expiry_date?.trim() || null,
      ]
    );

    insertedId = result.lastInsertRowId;

    // If initial stock is provided, log it in stock_transactions
    if (med.stock > 0) {
      await db.runAsync(
        `INSERT INTO stock_transactions (medicine_id, type, quantity, purchase_price, notes)
         VALUES (?, 'purchase', ?, ?, 'Initial Stock');`,
        [insertedId, med.stock, med.purchase_price]
      );
    }
  });

  return insertedId;
}

// Fetch medicines with optional search
export async function getMedicines(searchTerm: string = ''): Promise<Medicine[]> {
  const db = await getDatabase();
  const trimmed = searchTerm.trim();

  if (!trimmed) {
    return await db.getAllAsync<Medicine>(`SELECT * FROM medicines ORDER BY name ASC;`);
  }

  const query = `%${trimmed}%`;
  return await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE name LIKE ? OR generic_name LIKE ? 
     ORDER BY name ASC;`,
    [query, query]
  );
}
// Fetch stock and expiry alerts
export async function getStockAlerts(expiringDaysLimit: number = 30) {
  const db = await getDatabase();

  // 1. Out of stock
  const outOfStock = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines WHERE stock <= 0 ORDER BY name ASC;`
  );

  // 2. Low stock (Above 0 but less than or equal to limit)
  const lowStock = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines WHERE stock > 0 AND stock <= low_stock_limit ORDER BY stock ASC;`
  );

  // 3. Expired medicines
  const expired = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE expiry_date IS NOT NULL AND date(expiry_date) < date('now', 'localtime')
     ORDER BY expiry_date ASC;`
  );

  // 4. Expiring soon within N days
  const expiringSoon = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE expiry_date IS NOT NULL 
       AND date(expiry_date) >= date('now', 'localtime')
       AND date(expiry_date) <= date('now', 'localtime', '+' || ? || ' days')
     ORDER BY expiry_date ASC;`,
    [expiringDaysLimit]
  );

  return {
    outOfStock,
    lowStock,
    expired,
    expiringSoon,
  };
}
// Restock an existing medicine and log transaction

export async function restockMedicine(
  medicineId: number,
  addedQuantity: number,
  purchasePrice: number,
  salePrice: number,
  expiryDate?: string
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // 1. ریکارڈ کریں کہ کب اور کتنی دوا خریدی گئی
    await db.runAsync(
      `INSERT INTO medicine_purchases (medicine_id, quantity, purchase_price, created_at)
       VALUES (?, ?, ?, datetime('now', 'localtime'));`,
      [medicineId, addedQuantity, purchasePrice]
    );

    // 2. مین دوا کے ٹیبل میں اسٹاک جمع کریں اور نئی قیمتیں و ایکسپائری اپڈیٹ کریں
    await db.runAsync(
      `UPDATE medicines
       SET stock = stock + ?,
           purchase_price = ?,
           selling_price = ?,
           expiry_date = COALESCE(?, expiry_date),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [addedQuantity, purchasePrice, salePrice, expiryDate?.trim() || null, medicineId]
    );
  });
}
// src/database/queries/medicines.ts
export async function searchMedicines(searchTerm: string = ''): Promise<Medicine[]> {
  const db = await getDatabase();
  const trimmed = searchTerm.trim();

  if (!trimmed) {
    return await db.getAllAsync<Medicine>(
      `SELECT * FROM medicines ORDER BY name ASC;`
    );
  }

  const query = `%${trimmed}%`;
  return await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE (name LIKE ? OR generic_name LIKE ?)
     ORDER BY name ASC;`,
    [query, query]
  );
}
