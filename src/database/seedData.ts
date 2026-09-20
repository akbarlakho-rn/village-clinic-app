// src/database/seedData.ts
import { getDatabase } from './index';

export async function insertSampleData(): Promise<void> {
  const db = await getDatabase();

  // 1. عارضی طور پر Foreign Keys بند کریں تاکہ پرانا ڈیٹا بغیر ایرر کے کٹ سکے
  await db.execAsync(`PRAGMA foreign_keys = OFF;`);

  try {
    await db.withTransactionAsync(async () => {
      // تمام ٹیبلز کو مکمل صاف کریں
      await db.execAsync(`
        DELETE FROM transaction_items;
        DELETE FROM transactions;
        DELETE FROM loan_payments;
        DELETE FROM expenses;
        DELETE FROM patients;
        DELETE FROM households;
        DELETE FROM medicines;
      `);

      // 1. کلینک پروفائل
      await db.runAsync(`
        INSERT OR REPLACE INTO app_settings (key, value) VALUES 
        ('clinic_name', 'Community Health Care Clinic'),
        ('doctor_name', 'Dr. Ahmed Khan (MBBS)'),
        ('pin_code', '');
      `);

      // 2. سیمپل ادویات
      await db.runAsync(`
        INSERT INTO medicines (id, name, generic_name, unit, purchase_price, selling_price, stock, low_stock_limit, expiry_date)
        VALUES 
        (1, 'Panadol 500mg', 'Paracetamol', 'tablet', 2.5, 4.0, 150, 20, '2028-06-30'),
        (2, 'Brufen 400mg', 'Ibuprofen', 'tablet', 4.0, 7.0, 90, 15, '2027-12-31'),
        (3, 'Amoxil 500mg', 'Amoxicillin', 'capsule', 9.0, 15.0, 65, 10, '2027-09-15'),
        (4, 'Flagyl 400mg', 'Metronidazole', 'tablet', 4.5, 8.0, 110, 15, '2028-01-20'),
        (5, 'Risek 20mg', 'Omeprazole', 'capsule', 13.0, 22.0, 50, 10, '2027-11-10'),
        (6, 'Hydryllin Syrup', 'Diphenhydramine Expectorant', 'syrup', 90.0, 130.0, 20, 5, '2027-05-30'),
        (7, 'Cranmax Sachet', 'Cranberry Extract', 'sachet', 45.0, 70.0, 35, 8, '2028-03-25'),
        (8, 'Sancos Syrup', 'Cough Suppressant', 'syrup', 95.0, 140.0, 16, 5, '2027-08-15'),
        (9, 'Dicloran 50mg', 'Diclofenac Sodium', 'tablet', 5.0, 9.0, 80, 15, '2028-02-14'),
        (10, 'Polyfax Eye Ointment', 'Polymyxin B Sulfate', 'tube', 65.0, 95.0, 12, 5, '2027-10-10');
      `);

      // 3. گھرانے (Households)
      await db.runAsync(`
        INSERT INTO households (id, household_code, head_name, phone, village, opening_balance, balance)
        VALUES 
        (1, 'H-0001', 'Haji Wali Muhammad', '0301-2345671', 'Village Ali Murad', 1500, 2150),
        (2, 'H-0002', 'Ghulam Rasool Chandio', '0302-3456782', 'Mori Shareef', 0, 450),
        (3, 'H-0003', 'Muhammad Ramzan Solangi', '0300-4567893', 'Village Allah Bachayo', 2200, 2200),
        (4, 'H-0004', 'Arbab Ali Mallah', '0303-5678904', 'Near Canal Bridge', 0, 0);
      `);

      // 4. مریض (Patients)
      await db.runAsync(`
        INSERT INTO patients (id, patient_code, household_id, name, relation_to_head, phone)
        VALUES 
        (1, 'P-0001', 1, 'Haji Wali Muhammad', 'Self (Head)', '0301-2345671'),
        (2, 'P-0002', 1, 'Asadullah', 'Son', '0301-2345671'),
        (3, 'P-0003', 1, 'Zubaida Bibi', 'Wife', NULL),
        (4, 'P-0004', 2, 'Ghulam Rasool', 'Self (Head)', '0302-3456782'),
        (5, 'P-0005', 2, 'Tariq Ali', 'Son', NULL),
        (6, 'P-0006', 3, 'Muhammad Ramzan', 'Self (Head)', '0300-4567893'),
        (7, 'P-0007', 4, 'Arbab Ali', 'Self (Head)', '0303-5678904');
      `);

      // 5. پرچیاں (Transactions)
      await db.runAsync(`
        INSERT INTO transactions (id, household_id, patient_id, payment_type, total_amount, discount_amount, paid_amount, loan_amount, notes, created_at)
        VALUES 
        (1, 4, 7, 'cash', 305, 0, 305, 0, 'Seasonal fever and dry cough', datetime('now', 'localtime', '-3 hours')),
        (2, 1, 2, 'loan', 650, 0, 0, 650, 'Stomach ache and infection (Khata)', datetime('now', 'localtime', '-2 hours')),
        (3, 2, 5, 'partial', 750, 0, 300, 450, 'Paid Rs 300 remaining on Khata', datetime('now', 'localtime', '-45 minutes'));
      `);

      // 6. ادویات کی تفصیل (Transaction Items)
      await db.runAsync(`
        INSERT INTO transaction_items (transaction_id, medicine_id, quantity, unit_price, total_price)
        VALUES 
        (1, 1, 10, 4.0, 40),
        (1, 6, 1, 130.0, 130),
        (1, 3, 9, 15.0, 135),
        (2, 4, 10, 8.0, 80),
        (2, 5, 10, 22.0, 220),
        (2, 7, 5, 70.0, 350),
        (3, 3, 15, 15.0, 225),
        (3, 2, 10, 7.0, 70),
        (3, 10, 1, 95.0, 95),
        (3, 6, 1, 130.0, 130),
        (3, 5, 10, 22.0, 220);
      `);

      // 7. ادھار وصولی (Loan Payments)
      await db.runAsync(`
        INSERT INTO loan_payments (household_id, patient_id, amount, notes, created_at)
        VALUES (1, NULL, 500, 'Cash installment paid by Haji Wali Muhammad', datetime('now', 'localtime', '-20 minutes'));
      `);

      // 8. کلینک اخراجات (Expenses)
      await db.runAsync(`
        INSERT INTO expenses (title, amount, category, created_at)
        VALUES 
        ('Staff tea & refreshments', 180, 'General', datetime('now', 'localtime', '-4 hours')),
        ('Cotton bandages and syringes', 250, 'Supplies', datetime('now', 'localtime', '-1 hours'));
      `);
    });
  } finally {
    // 2. کام مکمل ہونے پر Foreign Keys دوبارہ آن کریں
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  }
}

export async function clearAllClinicData(): Promise<void> {
  const db = await getDatabase();
  await db.execAsync(`PRAGMA foreign_keys = OFF;`);
  try {
    await db.execAsync(`
      DELETE FROM transaction_items;
      DELETE FROM transactions;
      DELETE FROM loan_payments;
      DELETE FROM expenses;
      DELETE FROM patients;
      DELETE FROM households;
      DELETE FROM medicines;
    `);
  } finally {
    await db.execAsync(`PRAGMA foreign_keys = ON;`);
  }
}