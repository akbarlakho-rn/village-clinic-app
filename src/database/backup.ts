// src/database/backup.ts
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';
import { Alert } from 'react-native';
import { getDatabase } from './index';
import * as DocumentPicker from 'expo-document-picker';

export async function exportDatabaseBackup(): Promise<void> {
  try {
    const isAvailable = await Sharing.isAvailableAsync();
    if (!isAvailable) {
      Alert.alert('Sharing Unavailable', 'Sharing is not supported on this device.');
      return;
    }

    const db = await getDatabase();

    // 1. تمام ضروری ٹیبلز سے تازہ ترین ڈیٹا حاصل کریں
    const [
      medicines,
      households,
      patients,
      transactions,
      transactionItems,
      loanPayments,
      stockTransactions,
      expenses,
    ] = await Promise.all([
      db.getAllAsync('SELECT * FROM medicines;'),
      db.getAllAsync('SELECT * FROM households;'),
      db.getAllAsync('SELECT * FROM patients;'),
      db.getAllAsync('SELECT * FROM transactions;'),
      db.getAllAsync('SELECT * FROM transaction_items;'),
      db.getAllAsync('SELECT * FROM loan_payments;'),
      db.getAllAsync('SELECT * FROM stock_transactions;'),
      db.getAllAsync('SELECT * FROM expenses;'),
    ]);

    // 2. پورا کلینک ڈیٹا ایک منظم بیک اپ آبجیکٹ میں یکجا کریں
    const backupData = {
      clinic_name: 'Village Clinic Management System',
      backup_date: new Date().toISOString(),
      version: '1.0',
      data: {
        medicines,
        households,
        patients,
        transactions,
        transaction_items: transactionItems,
        loan_payments: loanPayments,
        stock_transactions: stockTransactions,
        expenses,
      },
    };

    // 3. کیشے ڈائریکٹری میں JSON بیک اپ فائل محفوظ کریں
    const today = new Date().toISOString().split('T')[0];
    const fileName = `Clinic_Backup_${today}.json`;
    const destinationUri = `${FileSystem.cacheDirectory}${fileName}`;

    await FileSystem.writeAsStringAsync(
      destinationUri,
      JSON.stringify(backupData, null, 2),
      { encoding: FileSystem.EncodingType.UTF8 }
    );

    console.log('Backup generated successfully at:', destinationUri);

    // 4. شیئر ونڈو کھولیں (WhatsApp, Google Drive, Email وغیرہ کے لیے)
    await Sharing.shareAsync(destinationUri, {
      mimeType: 'application/json',
      dialogTitle: 'Share Clinic Database Backup',
      UTI: 'public.json',
    });
  } catch (error) {
    console.error('Backup failed:', error);
    Alert.alert('Backup Error', 'Failed to generate clinic data backup.');
  }
}
// Restore Database from JSON Backup File
export async function importDatabaseBackup(onSuccess?: () => void): Promise<void> {
  try {
    // 1. فائل سلیکٹر اوپن کریں
    const result = await DocumentPicker.getDocumentAsync({
      type: 'application/json',
      copyToCacheDirectory: true,
    });

    if (result.canceled || !result.assets || result.assets.length === 0) {
      return; // صارف نے کینسل کر دیا
    }

    const fileUri = result.assets[0].uri;

    // 2. فائل کا مواد پڑھیں
    const fileContent = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });

    const parsedBackup = JSON.parse(fileContent);

    if (!parsedBackup.data || !parsedBackup.data.medicines) {
      Alert.alert('Invalid File', 'This file is not a valid clinic backup.');
      return;
    }

    const {
      medicines = [],
      households = [],
      patients = [],
      transactions = [],
      transaction_items = [],
      loan_payments = [],
      stock_transactions = [],
      expenses = [],
    } = parsedBackup.data;

    // 3. ڈیٹا بیس میں سارا پرانا ڈیٹا ہٹا کر نیا ڈیٹا بحال کریں (Single Transaction)
    const db = await getDatabase();

    await db.withTransactionAsync(async () => {
      // پرانا ڈیٹا صاف کریں
      await db.runAsync('DELETE FROM transaction_items;');
      await db.runAsync('DELETE FROM transactions;');
      await db.runAsync('DELETE FROM loan_payments;');
      await db.runAsync('DELETE FROM stock_transactions;');
      await db.runAsync('DELETE FROM expenses;');
      await db.runAsync('DELETE FROM patients;');
      await db.runAsync('DELETE FROM households;');
      await db.runAsync('DELETE FROM medicines;');

      // 1. Medicines
      for (const m of medicines) {
        await db.runAsync(
          `INSERT INTO medicines (id, name, generic_name, dosage_form, strength, stock, low_stock_limit, purchase_price, sale_price, expiry_date, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [m.id, m.name, m.generic_name, m.dosage_form, m.strength, m.stock, m.low_stock_limit, m.purchase_price, m.sale_price, m.expiry_date, m.is_active, m.created_at, m.updated_at]
        );
      }

      // 2. Households
      for (const h of households) {
        await db.runAsync(
          `INSERT INTO households (id, household_code, head_name, phone, address, balance, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [h.id, h.household_code, h.head_name, h.phone, h.address, h.balance, h.is_active, h.created_at, h.updated_at]
        );
      }

      // 3. Patients
      for (const p of patients) {
        await db.runAsync(
          `INSERT INTO patients (id, household_id, patient_code, name, gender, age, relation_to_head, is_active, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [p.id, p.household_id, p.patient_code, p.name, p.gender, p.age, p.relation_to_head, p.is_active, p.created_at, p.updated_at]
        );
      }

      // 4. Transactions
      for (const t of transactions) {
        await db.runAsync(
          `INSERT INTO transactions (id, household_id, patient_id, payment_type, total_amount, discount_amount, paid_amount, loan_amount, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
          [t.id, t.household_id, t.patient_id, t.payment_type, t.total_amount, t.discount_amount, t.paid_amount, t.loan_amount, t.notes, t.created_at]
        );
      }

      // 5. Transaction Items
      for (const ti of transaction_items) {
        await db.runAsync(
          `INSERT INTO transaction_items (id, transaction_id, medicine_id, quantity, unit_price, total_price)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [ti.id, ti.transaction_id, ti.medicine_id, ti.quantity, ti.unit_price, ti.total_price]
        );
      }

      // 6. Loan Payments
      for (const lp of loan_payments) {
        await db.runAsync(
          `INSERT INTO loan_payments (id, household_id, patient_id, amount, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?);`,
          [lp.id, lp.household_id, lp.patient_id, lp.amount, lp.notes, lp.created_at]
        );
      }

      // 7. Stock Transactions
      for (const st of stock_transactions) {
        await db.runAsync(
          `INSERT INTO stock_transactions (id, medicine_id, type, quantity, purchase_price, notes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [st.id, st.medicine_id, st.type, st.quantity, st.purchase_price, st.notes, st.created_at]
        );
      }

      // 8. Expenses
      for (const e of expenses) {
        await db.runAsync(
          `INSERT INTO expenses (id, title, amount, category, created_at)
           VALUES (?, ?, ?, ?, ?);`,
          [e.id, e.title, e.amount, e.category, e.created_at]
        );
      }
    });

    Alert.alert('Success', 'Clinic database successfully restored from backup!');
    if (onSuccess) {
      onSuccess();
    }
  } catch (error) {
    console.error('Restore failed:', error);
    Alert.alert('Restore Error', 'Failed to restore data from the file.');
  }
}