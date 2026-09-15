// src/database/schema.ts

export const CREATE_TABLES_QUERY = `
  -- 1. Medicines Table
  CREATE TABLE IF NOT EXISTS medicines (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    generic_name TEXT,
    unit TEXT,
    purchase_price REAL,
    selling_price REAL,
    stock INTEGER DEFAULT 0,
    low_stock_limit INTEGER DEFAULT 10,
    expiry_date TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- 2. Households Table (With Opening Balance support)
  CREATE TABLE IF NOT EXISTS households (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_code TEXT UNIQUE,
    head_name TEXT NOT NULL,
    village TEXT,
    phone TEXT,
    opening_balance REAL DEFAULT 0,
    balance REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime'))
  );

  -- 3. Patients Table
  CREATE TABLE IF NOT EXISTS patients (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    patient_code TEXT UNIQUE,
    household_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    relation_to_head TEXT,
    village TEXT,
    phone TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    updated_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (household_id) REFERENCES households(id) ON DELETE CASCADE
  );

  -- 4. Transactions Table (Sale Headers)
  CREATE TABLE IF NOT EXISTS transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    patient_id INTEGER NOT NULL,
    payment_type TEXT CHECK(payment_type IN ('cash', 'loan', 'partial')),
    total_amount REAL NOT NULL,
    discount_amount REAL DEFAULT 0,
    paid_amount REAL DEFAULT 0,
    loan_amount REAL DEFAULT 0,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (household_id) REFERENCES households(id),
    FOREIGN KEY (patient_id) REFERENCES patients(id)
  );

  -- 5. Transaction Items Table (Sale Detail Lines)
  CREATE TABLE IF NOT EXISTS transaction_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    transaction_id INTEGER NOT NULL,
    medicine_id INTEGER NOT NULL,
    quantity INTEGER NOT NULL,
    unit_price REAL NOT NULL,
    total_price REAL NOT NULL,
    FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );

  -- 6. Loan Payments Table (Loan Recoveries)
  CREATE TABLE IF NOT EXISTS loan_payments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    household_id INTEGER NOT NULL,
    patient_id INTEGER,
    amount REAL NOT NULL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (household_id) REFERENCES households(id)
  );

  -- 7. Stock Transactions Table (Stock History Logs)
  CREATE TABLE IF NOT EXISTS stock_transactions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    medicine_id INTEGER NOT NULL,
    type TEXT CHECK(type IN ('purchase', 'sale', 'adjustment', 'damage', 'return')),
    quantity INTEGER NOT NULL,
    purchase_price REAL,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime')),
    FOREIGN KEY (medicine_id) REFERENCES medicines(id)
  );

  -- 8. Expenses Table
  CREATE TABLE IF NOT EXISTS expenses (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    amount REAL NOT NULL,
    category TEXT,
    notes TEXT,
    created_at TEXT DEFAULT (datetime('now', 'localtime'))
  );
`;