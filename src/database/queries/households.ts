// src/database/queries/households.ts
import { getDatabase } from '../index';
import { 
Household,
  NewHouseholdInput, 
  PatientWithHousehold 
} from '../../types/household';

export type { PatientWithHousehold, Household, NewHouseholdInput };
// Auto code generator: H-0001, P-0001
async function generateNextCode(tableName: 'households' | 'patients', prefix: 'H' | 'P'): Promise<string> {
  const db = await getDatabase();
  const row = await db.getFirstAsync<{ max_id: number }>(
    `SELECT MAX(id) as max_id FROM ${tableName};`
  );
  const nextNumber = (row?.max_id || 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

// Create Household and its first patient together
export async function createHouseholdWithPatient(
  householdData: NewHouseholdInput,
  patientName?: string,
  relationToHead?: string
): Promise<{ householdId: number; patientId: number }> {
  const db = await getDatabase();
  let householdId = 0;
  let patientId = 0;

  await db.withTransactionAsync(async () => {
    const hCode = await generateNextCode('households', 'H');
    const openingBal = householdData.opening_balance && householdData.opening_balance > 0 
      ? householdData.opening_balance 
      : 0;

    // 1. Insert Household
    const hResult = await db.runAsync(
      `INSERT INTO households (household_code, head_name, village, phone, opening_balance, balance, notes)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        hCode,
        householdData.head_name.trim(),
        householdData.village?.trim() || null,
        householdData.phone?.trim() || null,
        openingBal,
        openingBal, // Current balance starts with opening balance
        householdData.notes?.trim() || null,
      ]
    );
    householdId = hResult.lastInsertRowId;

    // 2. Insert First Patient (Head or family member)
    const pCode = await generateNextCode('patients', 'P');
    const actualPatientName = patientName?.trim() || householdData.head_name.trim();
    const actualRelation = relationToHead?.trim() || (patientName ? 'Family Member' : 'Self (Head)');

    const pResult = await db.runAsync(
      `INSERT INTO patients (patient_code, household_id, name, relation_to_head, village, phone)
       VALUES (?, ?, ?, ?, ?, ?);`,
      [
        pCode,
        householdId,
        actualPatientName,
        actualRelation,
        householdData.village?.trim() || null,
        householdData.phone?.trim() || null,
      ]
    );
    patientId = pResult.lastInsertRowId;
  });

  return { householdId, patientId };
}

// Search Patients with household balance details
export async function searchPatients(searchTerm: string = ''): Promise<PatientWithHousehold[]> {
  const db = await getDatabase();
  const trimmed = searchTerm.trim();

  if (!trimmed) {
    return await db.getAllAsync<PatientWithHousehold>(
      `SELECT p.*, h.head_name as household_head, h.balance as household_balance, h.household_code
       FROM patients p
       JOIN households h ON p.household_id = h.id
       ORDER BY p.id DESC;`
    );
  }

  const query = `%${trimmed}%`;
  return await db.getAllAsync<PatientWithHousehold>(
    `SELECT p.*, h.head_name as household_head, h.balance as household_balance, h.household_code
     FROM patients p
     JOIN households h ON p.household_id = h.id
     WHERE p.name LIKE ? OR p.patient_code LIKE ? OR p.phone LIKE ? OR h.head_name LIKE ?
     ORDER BY p.id DESC;`,
    [query, query, query, query]
  );
}
// Fetch all households (with optional search)
export async function getHouseholds(searchTerm: string = ''): Promise<Household[]> {
  const db = await getDatabase();
  const trimmed = searchTerm.trim();

  if (!trimmed) {
    return await db.getAllAsync<Household>(
      `SELECT * FROM households ORDER BY head_name ASC;`
    );
  }

  const query = `%${trimmed}%`;
  return await db.getAllAsync<Household>(
    `SELECT * FROM households 
     WHERE head_name LIKE ? OR household_code LIKE ? OR phone LIKE ? 
     ORDER BY head_name ASC;`,
    [query, query, query]
  );
}
// Patient History Item Type
export interface PatientHistoryRecord {
  transaction_id: number;
  date: string;
  payment_type: string;
  total_amount: number;
  medicine_name: string;
  quantity: number;
  unit_price: number;
  total_price: number;
}

// Fetch complete prescription history for a single patient
export async function getPatientHistory(patientId: number): Promise<PatientHistoryRecord[]> {
  const db = await getDatabase();
  return await db.getAllAsync<PatientHistoryRecord>(
    `SELECT 
      t.id as transaction_id,
      t.created_at as date,
      t.payment_type,
      t.total_amount,
      m.name as medicine_name,
      ti.quantity,
      ti.unit_price,
      ti.total_price
    FROM transactions t
    JOIN transaction_items ti ON t.id = ti.transaction_id
    JOIN medicines m ON ti.medicine_id = m.id
    WHERE t.patient_id = ?
    ORDER BY t.created_at DESC;`,
    [patientId]
  );
}
// موجودہ ہاؤس ہولڈ میں نیا مریض شامل کرنا
export async function addPatientToExistingHousehold(
  householdId: number,
  patientName: string,
  relationToHead: string = 'Family Member',
  phone?: string
): Promise<number> {
  const db = await getDatabase();
  const pCode = await generateNextCode('patients', 'P');

  const result = await db.runAsync(
    `INSERT INTO patients (patient_code, household_id, name, relation_to_head, phone)
     VALUES (?, ?, ?, ?, ?);`,
    [pCode, householdId, patientName.trim(), relationToHead.trim(), phone?.trim() || null]
  );

  return result.lastInsertRowId;
}
// Fetch complete prescription & loan history for an entire Household (All family members)
export async function getHouseholdHistory(householdId: number): Promise<PatientHistoryRecord[]> {
  const db = await getDatabase();
  return await db.getAllAsync<PatientHistoryRecord>(
    `SELECT 
      t.id as transaction_id,
      t.created_at as date,
      t.payment_type,
      t.total_amount,
      p.name as patient_name,
      m.name as medicine_name,
      ti.quantity,
      ti.unit_price,
      ti.total_price
    FROM transactions t
    JOIN patients p ON t.patient_id = p.id
    JOIN transaction_items ti ON t.id = ti.transaction_id
    JOIN medicines m ON ti.medicine_id = m.id
    WHERE t.household_id = ?
    ORDER BY t.created_at DESC;`,
    [householdId]
  );
}