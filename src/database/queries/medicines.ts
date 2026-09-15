// src/database/queries/medicines.ts
import { getDatabase } from '../index';
import { Medicine, NewMedicineInput, StockTransactionType } from '../../types/medicine';

// 1. نئی میڈیسن شامل کرنا
export async function addMedicine(med: NewMedicineInput): Promise<number> {
  const db = await getDatabase();
  const result = await db.runAsync(
    `INSERT INTO medicines (name, generic_name, unit, purchase_price, selling_price, stock, low_stock_limit, expiry_date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?);`,
    [
      med.name,
      med.generic_name || null,
      med.unit || null,
      med.purchase_price,
      med.selling_price,
      med.stock || 0,
      med.low_stock_limit || 10,
      med.expiry_date || null,
    ]
  );

  const newMedicineId = result.lastInsertRowId;

  // اگر شروع میں ہی اسٹاک ڈالا گیا ہے تو اس کی پہلی پرچیز ٹرانزیکشن لاگ میں جائے
  if (med.stock > 0) {
    await db.runAsync(
      `INSERT INTO stock_transactions (medicine_id, type, quantity, purchase_price, notes)
       VALUES (?, 'purchase', ?, ?, 'Initial Stock');`,
      [newMedicineId, med.stock, med.purchase_price]
    );
  }

  return newMedicineId;
}

// 2. تمام میڈیسنز حاصل کرنا (سرچ فلٹر کے ساتھ)
export async function getMedicines(searchTerm: string = ''): Promise<Medicine[]> {
  const db = await getDatabase();
  if (searchTerm.trim() === '') {
    return await db.getAllAsync<Medicine>(`SELECT * FROM medicines ORDER BY name ASC;`);
  }

  const query = `%${searchTerm.trim()}%`;
  return await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE name LIKE ? OR generic_name LIKE ? 
     ORDER BY name ASC;`,
    [query, query]
  );
}

// 3. نئی پرچیز اینٹری (اسٹاک بڑھانا + پرچیز پرائس اپڈیٹ + لاگ)
export async function purchaseStock(
  medicineId: number,
  quantity: number,
  purchasePrice: number,
  sellingPrice: number,
  expiryDate?: string
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // اسٹاک اور ریٹ اپڈیٹ کریں
    await db.runAsync(
      `UPDATE medicines 
       SET stock = stock + ?, 
           purchase_price = ?, 
           selling_price = ?,
           expiry_date = COALESCE(?, expiry_date),
           updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [quantity, purchasePrice, sellingPrice, expiryDate || null, medicineId]
    );

    // لاگ میں انٹری کریں
    await db.runAsync(
      `INSERT INTO stock_transactions (medicine_id, type, quantity, purchase_price, notes)
       VALUES (?, 'purchase', ?, ?, 'Stock Purchase');`,
      [medicineId, quantity, purchasePrice]
    );
  });
}

// 4. اسٹاک ایڈجسٹمنٹ، نقصان (Damage) یا واپسی (Return)
export async function adjustStock(
  medicineId: number,
  type: 'adjustment' | 'damage' | 'return',
  quantity: number, // Damage کے لیے پازیٹو ویلیو بھیجیں گے، فنکشن خود مائنس کرے گا
  notes: string = ''
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    let stockDiff = quantity;

    if (type === 'damage') {
      stockDiff = -Math.abs(quantity); // ڈیمیج سے اسٹاک کم ہوگا
    } else if (type === 'return') {
      stockDiff = Math.abs(quantity); // ریٹرن سے اسٹاک واپس بڑھے گا
    }

    await db.runAsync(
      `UPDATE medicines 
       SET stock = stock + ?, 
           updated_at = datetime('now', 'localtime')
       WHERE id = ?;`,
      [stockDiff, medicineId]
    );

    await db.runAsync(
      `INSERT INTO stock_transactions (medicine_id, type, quantity, notes)
       VALUES (?, ?, ?, ?);`,
      [medicineId, type, stockDiff, notes]
    );
  });
}

// 5. الرٹس حاصل کرنا (Low Stock, Out of Stock, Expired, Expiring Soon)
export async function getStockAlerts(expiringDaysLimit: number = 30) {
  const db = await getDatabase();

  // Out of stock
  const outOfStock = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines WHERE stock <= 0 ORDER BY name ASC;`
  );

  // Low stock (0 سے زیادہ لیکن لمٹ کے برابر یا نیچے)
  const lowStock = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines WHERE stock > 0 AND stock <= low_stock_limit ORDER BY stock ASC;`
  );

  // Expired
  const expired = await db.getAllAsync<Medicine>(
    `SELECT * FROM medicines 
     WHERE expiry_date IS NOT NULL AND date(expiry_date) < date('now', 'localtime')
     ORDER BY expiry_date ASC;`
  );

  // Expiring Soon (اگلے N دنوں میں میعاد ختم ہونے والی)
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