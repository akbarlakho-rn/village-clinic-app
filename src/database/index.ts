// src/database/index.ts
import * as SQLite from 'expo-sqlite';
import { CREATE_TABLES_QUERY } from './schema';

const DATABASE_NAME = 'village_clinic.db';

let dbInstance: SQLite.SQLiteDatabase | null = null;

export async function getDatabase(): Promise<SQLite.SQLiteDatabase> {
  if (dbInstance) {
    return dbInstance;
  }

  // جدید expo-sqlite کا طریقہ کار
  dbInstance = await SQLite.openDatabaseAsync(DATABASE_NAME);

  // Foreign keys کو فعال کرنا لازمی ہے
  await dbInstance.execAsync('PRAGMA foreign_keys = ON;');

  return dbInstance;
}

export async function initDatabase(): Promise<void> {
  try {
    const db = await getDatabase();
    // تمام ٹیبلز کو ایک ساتھ ایگزیکیوٹ کرنا
    await db.execAsync(CREATE_TABLES_QUERY);
    console.log('✅ تمام ٹیبلز کامیابی سے لوڈ ہو گئے ہیں۔');
  } catch (error) {
    console.error('❌ ڈیٹا بیس انیشیلائزیشن میں خرابی:', error);
    throw error;
  }
}