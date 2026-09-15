// src/database/queries/households.ts
import { getDatabase } from '../index';
import { 
  Household, 
  NewHouseholdInput, 
  Patient, 
  NewPatientInput, 
  HouseholdWithPatients 
} from '../../types/household';

// آٹو کوڈ جنریٹر: H-0001 یا P-0001 فارمیٹ
async function generateNextCode(tableName: 'households' | 'patients', prefix: 'H' | 'P'): Promise<string> {
  const db = await getDatabase();
  const column = prefix === 'H' ? 'household_code' : 'patient_code';
  
  const row = await db.getFirstAsync<{ max_id: number }>(
    `SELECT MAX(id) as max_id FROM ${tableName};`
  );

  const nextNumber = (row?.max_id || 0) + 1;
  return `${prefix}-${String(nextNumber).padStart(4, '0')}`;
}

// 1. نیا ہاؤس ہولڈ بنانا (اوپننگ ادھار کے ساتھ)
export async function addHousehold(data: NewHouseholdInput): Promise<{ id: number; household_code: string }> {
  const db = await getDatabase();
  const code = await generateNextCode('households', 'H');
  const openingBalance = data.opening_balance && data.opening_balance > 0 ? data.opening_balance : 0;

  const result = await db.runAsync(
    `INSERT INTO households (household_code, head_name, village, phone, opening_balance, balance, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?);`,
    [
      code,
      data.head_name.trim(),
      data.village?.trim() || null,
      data.phone?.trim() || null,
      openingBalance,
      openingBalance, // موجودہ بیلنس بھی اسی اوپننگ ادھار سے شروع ہوگا
      data.notes?.trim() || null,
    ]
  );

  return { id: result.lastInsertRowId, household_code: code };
}

// 2. نیا مریض رجسٹر کرنا
export async function addPatient(data: NewPatientInput): Promise<{ id: number; patient_code: string }> {
  const db = await getDatabase();
  const code = await generateNextCode('patients', 'P');

  const result = await db.runAsync(
    `INSERT INTO patients (patient_code, household_id, name, relation_to_head, village, phone)
     VALUES (?, ?, ?, ?, ?, ?);`,
    [
      code,
      data.household_id,
      data.name.trim(),
      data.relation_to_head?.trim() || null,
      data.village?.trim() || null,
      data.phone?.trim() || null,
    ]
  );

  return { id: result.lastInsertRowId, patient_code: code };
}

// 3. ہاؤس ہولڈز کی لسٹ اور تلاش (Search by Name, Code, Phone)
export async function getHouseholds(searchTerm: string = ''): Promise<Household[]> {
  const db = await getDatabase();
  if (!searchTerm.trim()) {
    return await db.getAllAsync<Household>(`SELECT * FROM households ORDER BY head_name ASC;`);
  }

  const query = `%${searchTerm.trim()}%`;
  return await db.getAllAsync<Household>(
    `SELECT * FROM households 
     WHERE head_name LIKE ? OR household_code LIKE ? OR phone LIKE ? 
     ORDER BY head_name ASC;`,
    [query, query, query]
  );
}

// 4. مریضوں کی تلاش (Search by Name, Code, Phone)
export async function searchPatients(searchTerm: string = ''): Promise<(Patient & { household_head: string; household_balance: number })[]> {
  const db = await getDatabase();
  const query = `%${searchTerm.trim()}%`;

  return await db.getAllAsync<Patient & { household_head: string; household_balance: number }>(
    `SELECT p.*, h.head_name as household_head, h.balance as household_balance
     FROM patients p
     JOIN households h ON p.household_id = h.id
     WHERE p.name LIKE ? OR p.patient_code LIKE ? OR p.phone LIKE ?
     ORDER BY p.name ASC;`,
    [query, query, query]
  );
}

// 5. ہاؤس ہولڈ کی مکمل معلومات بمع تمام فیملی ممبرز
export async function getHouseholdDetails(householdId: number): Promise<HouseholdWithPatients | null> {
  const db = await getDatabase();
  
  const household = await db.getFirstAsync<Household>(
    `SELECT * FROM households WHERE id = ?;`,
    [householdId]
  );

  if (!household) return null;

  const patients = await db.getAllAsync<Patient>(
    `SELECT * FROM patients WHERE household_id = ? ORDER BY id ASC;`,
    [householdId]
  );

  return {
    ...household,
    patients,
  };
}