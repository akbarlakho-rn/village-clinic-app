// src/database/queries/finance.ts
import { getDatabase } from '../index';

export interface FinanceSummary {
  todayCashSales: number;
  todayNewLoan: number;          // <--- آج کا نیا دیا گیا ادھار
  todayLoanRecoveries: number;
  todayExpenses: number;
  netCashInHand: number;
  totalMarketLoan: number;
}

// 1. Record Loan Recovery
export async function recordLoanPayment(
  householdId: number,
  patientId: number | null,
  amount: number,
  notes?: string
): Promise<void> {
  const db = await getDatabase();

  await db.withTransactionAsync(async () => {
    // Check current balance
    const household = await db.getFirstAsync<{ balance: number }>(
      `SELECT balance FROM households WHERE id = ?;`,
      [householdId]
    );

    if (!household) {
      throw new Error('Household not found.');
    }

    if (amount <= 0) {
      throw new Error('Payment amount must be greater than zero.');
    }

    if (amount > household.balance) {
      throw new Error(`Amount exceeds outstanding balance (Rs. ${household.balance}).`);
    }

    // Insert loan payment record
    await db.runAsync(
      `INSERT INTO loan_payments (household_id, patient_id, amount, notes)
       VALUES (?, ?, ?, ?);`,
      [householdId, patientId || null, amount, notes?.trim() || null]
    );

    // Deduct from Household balance
    await db.runAsync(
      `UPDATE households 
       SET balance = balance - ?, updated_at = datetime('now', 'localtime') 
       WHERE id = ?;`,
      [amount, householdId]
    );
  });
}

// 2. Record Clinic Expense
export async function addExpense(
  title: string,
  amount: number,
  category: string = 'General',
  notes?: string
): Promise<number> {
  const db = await getDatabase();

  const result = await db.runAsync(
    `INSERT INTO expenses (title, amount, category, notes)
     VALUES (?, ?, ?, ?);`,
    [title.trim(), amount, category.trim(), notes?.trim() || null]
  );

  return result.lastInsertRowId;
}

// 3. Get Daily Finance Summary & Total Market Outstanding
export async function getDailyFinanceSummary(): Promise<FinanceSummary> {
  const db = await getDatabase();

  // 1. Today's Cash Collected from Transactions
  const salesRow = await db.getFirstAsync<{ total_cash: number }>(
    `SELECT COALESCE(SUM(paid_amount), 0) as total_cash 
     FROM transactions 
     WHERE date(created_at) = date('now', 'localtime');`
  );

  // 2. Today's New Loan Given in Sales
  const loanRow = await db.getFirstAsync<{ total_new_loan: number }>(
    `SELECT COALESCE(SUM(loan_amount), 0) as total_new_loan 
     FROM transactions 
     WHERE date(created_at) = date('now', 'localtime');`
  );

  // 3. Today's Loan Recoveries
  const recoveryRow = await db.getFirstAsync<{ total_recovery: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_recovery 
     FROM loan_payments 
     WHERE date(created_at) = date('now', 'localtime');`
  );

  // 4. Today's Expenses
  const expenseRow = await db.getFirstAsync<{ total_expense: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_expense 
     FROM expenses 
     WHERE date(created_at) = date('now', 'localtime');`
  );

  // 5. Total Market Outstanding Loan (All Households)
  const marketLoanRow = await db.getFirstAsync<{ total_loan: number }>(
    `SELECT COALESCE(SUM(balance), 0) as total_loan FROM households;`
  );

  const todayCashSales = salesRow?.total_cash || 0;
  const todayNewLoan = loanRow?.total_new_loan || 0;
  const todayLoanRecoveries = recoveryRow?.total_recovery || 0;
  const todayExpenses = expenseRow?.total_expense || 0;
  const totalMarketLoan = marketLoanRow?.total_loan || 0;

  const netCashInHand = todayCashSales + todayLoanRecoveries - todayExpenses;

  return {
    todayCashSales,
    todayNewLoan,
    todayLoanRecoveries,
    todayExpenses,
    netCashInHand,
    totalMarketLoan,
  };
}
// آج یا کسی مخصوص تاریخ کی تمام پرچیاں بمع تفصیلات
export async function getDayTransactionsList(dateString?: string) {
  const db = await getDatabase();
  const dateFilter = dateString || "date('now', 'localtime')";

  return await db.getAllAsync<{
    id: number;
    patient_name: string;
    household_head: string;
    payment_type: string;
    total_amount: number;
    paid_amount: number;
    loan_amount: number;
    time: string;
  }>(
    `SELECT 
      t.id,
      p.name as patient_name,
      h.head_name as household_head,
      t.payment_type,
      t.total_amount,
      t.paid_amount,
      t.loan_amount,
      time(t.created_at) as time
     FROM transactions t
     JOIN patients p ON t.patient_id = p.id
     JOIN households h ON t.household_id = h.id
     WHERE date(t.created_at) = ${dateString ? '?' : "date('now', 'localtime')"}
     ORDER BY t.created_at DESC;`,
    dateString ? [dateString] : []
  );
}

// ماہانہ فنانس سمری (Current Month or Selected Month YYYY-MM)
export async function getMonthlyFinanceSummary(yearMonth?: string) {
  const db = await getDatabase();
  const ymFilter = yearMonth || "strftime('%Y-%m', 'now', 'localtime')";

  const salesRow = await db.getFirstAsync<{ total_cash: number; total_loan: number }>(
    `SELECT 
      COALESCE(SUM(paid_amount), 0) as total_cash,
      COALESCE(SUM(loan_amount), 0) as total_loan
     FROM transactions 
     WHERE strftime('%Y-%m', created_at) = ${yearMonth ? '?' : ymFilter};`,
    yearMonth ? [yearMonth] : []
  );

  const recoveryRow = await db.getFirstAsync<{ total_recovery: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_recovery 
     FROM loan_payments 
     WHERE strftime('%Y-%m', created_at) = ${yearMonth ? '?' : ymFilter};`,
    yearMonth ? [yearMonth] : []
  );

  const expenseRow = await db.getFirstAsync<{ total_expense: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_expense 
     FROM expenses 
     WHERE strftime('%Y-%m', created_at) = ${yearMonth ? '?' : ymFilter};`,
    yearMonth ? [yearMonth] : []
  );

  return {
    monthCashSales: salesRow?.total_cash || 0,
    monthNewLoan: salesRow?.total_loan || 0,
    monthRecoveries: recoveryRow?.total_recovery || 0,
    monthExpenses: expenseRow?.total_expense || 0,
    netMonthCash: (salesRow?.total_cash || 0) + (recoveryRow?.total_recovery || 0) - (expenseRow?.total_expense || 0),
  };
}

// src/database/queries/finance.ts

export interface CustomProfitSummary {
  days: number;
  totalSales: number;
  totalCost: number;
  grossProfit: number;
  totalExpenses: number;
  netProfit: number;
  totalCashCollected: number;
}

export async function getCustomPeriodProfit(days: number = 7): Promise<CustomProfitSummary> {
  const db = await getDatabase();

  // تاریخ کا فلٹر: آج سے پچھلے N دن
  const dateFilter = `date('now', 'localtime', '-${days} days')`;

  // 1. کل سیل اور ادویات کی لاگت
  const salesRow = await db.getFirstAsync<{ total_sales: number; total_cost: number }>(
    `SELECT 
       COALESCE(SUM(ti.total_price), 0) as total_sales,
       COALESCE(SUM(ti.quantity * COALESCE(m.purchase_price, 0)), 0) as total_cost
     FROM transactions t
     JOIN transaction_items ti ON t.id = ti.transaction_id
     JOIN medicines m ON ti.medicine_id = m.id
     WHERE date(t.created_at) >= ${dateFilter};`
  );

  // 2. کل اخراجات
  const expRow = await db.getFirstAsync<{ total_expenses: number }>(
    `SELECT COALESCE(SUM(amount), 0) as total_expenses
     FROM expenses
     WHERE date(created_at) >= ${dateFilter};`
  );

  // 3. اس دوران کیش وصولی (سیل کیش + ادھار ریکوری)
  const cashSales = await db.getFirstAsync<{ cash: number }>(
    `SELECT COALESCE(SUM(paid_amount), 0) as cash FROM transactions WHERE date(created_at) >= ${dateFilter};`
  );
  const recoveries = await db.getFirstAsync<{ rec: number }>(
    `SELECT COALESCE(SUM(amount), 0) as rec FROM loan_payments WHERE date(created_at) >= ${dateFilter};`
  );

  const totalSales = salesRow?.total_sales || 0;
  const totalCost = salesRow?.total_cost || 0;
  const grossProfit = totalSales - totalCost;
  const totalExpenses = expRow?.total_expenses || 0;
  const netProfit = grossProfit - totalExpenses;
  const totalCashCollected = (cashSales?.cash || 0) + (recoveries?.rec || 0);

  return {
    days,
    totalSales,
    totalCost,
    grossProfit,
    totalExpenses,
    netProfit,
    totalCashCollected,
  };
}