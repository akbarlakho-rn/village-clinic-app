// src/screens/finance/FinanceScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  FlatList,
} from 'react-native';
import { 
  getDailyFinanceSummary, 
  recordLoanPayment, 
  addExpense, 
  FinanceSummary,
  getDayTransactionsList,
  getMonthlyFinanceSummary,
  getCustomPeriodProfit,
  CustomProfitSummary
} from '../../database/queries/finance';
import { getHouseholds } from '../../database/queries/households';
import { Household } from '../../types/household';
import { voidTransaction } from '../../database/queries/transactions';
import { useFocusEffect } from '@react-navigation/native';
export default function FinanceScreen() {
  const [summary, setSummary] = useState<FinanceSummary>({
    todayCashSales: 0,
    todayNewLoan: 0,
    todayLoanRecoveries: 0,
    todayExpenses: 0,
    netCashInHand: 0,
    totalMarketLoan: 0,
  });

  // Modals state
  const [recoveryModal, setRecoveryModal] = useState(false);
  const [expenseModal, setExpenseModal] = useState(false);

  // Recovery Form states
  const [householdsWithLoan, setHouseholdsWithLoan] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');

  // Expense Form states
  const [expenseTitle, setExpenseTitle] = useState('');
  const [expenseAmount, setExpenseAmount] = useState('');
  const [expenseCategory, setExpenseCategory] = useState('General');

  // Transactions & Reports State
  const [dayTransactions, setDayTransactions] = useState<any[]>([]);
  const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
  const [monthSummary, setMonthSummary] = useState<any>(null);

  // Profit Analyzer Period States (7, 10, 20, 30 Days)
  const [selectedDays, setSelectedDays] = useState<number>(7);
  const [profitData, setProfitData] = useState<CustomProfitSummary | null>(null);

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDailyFinanceSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load finance summary:', error);
    }
  }, []);

  const loadTransactions = useCallback(async () => {
    try {
      const list = await getDayTransactionsList();
      setDayTransactions(list);
      const mSummary = await getMonthlyFinanceSummary();
      setMonthSummary(mSummary);
    } catch (err) {
      console.error('Failed to load transactions list:', err);
    }
  }, []);

  const loadProfitReport = useCallback(async (days: number) => {
    try {
      const report = await getCustomPeriodProfit(days);
      setProfitData(report);
    } catch (err) {
      console.error('Failed to load profit report:', err);
    }
  }, []);

  useFocusEffect(
  useCallback(() => {
    loadSummary();
    loadTransactions();
    loadProfitReport(selectedDays);
  }, [loadSummary, loadTransactions, loadProfitReport, selectedDays])
);
  

  const openRecoveryModal = async () => {
    try {
      const allHouseholds = await getHouseholds();
      const withLoan = allHouseholds.filter((h) => h.balance > 0);
      setHouseholdsWithLoan(withLoan);
      setSelectedHousehold(null);
      setRecoveryAmount('');
      setRecoveryNotes('');
      setRecoveryModal(true);
    } catch (error) {
      console.error(error);
    }
  };

  const handleSaveRecovery = async () => {
    if (!selectedHousehold) {
      Alert.alert('Required', 'Please select a household account.');
      return;
    }
    const amount = parseFloat(recoveryAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }
    if (amount > selectedHousehold.balance) {
      Alert.alert('Validation Error', `Amount cannot exceed balance of Rs. ${selectedHousehold.balance}`);
      return;
    }

    try {
      await recordLoanPayment(selectedHousehold.id, null, amount, recoveryNotes);
      Alert.alert('Success', 'Payment recorded successfully.');
      setRecoveryModal(false);
      loadSummary();
      loadTransactions();
      loadProfitReport(selectedDays);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to save payment.');
    }
  };

  const handleSaveExpense = async () => {
    if (!expenseTitle.trim()) {
      Alert.alert('Required', 'Please enter expense title.');
      return;
    }
    const amount = parseFloat(expenseAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid amount.');
      return;
    }

    try {
      await addExpense(expenseTitle, amount, expenseCategory);
      Alert.alert('Success', 'Expense recorded successfully.');
      setExpenseTitle('');
      setExpenseAmount('');
      setExpenseModal(false);
      loadSummary();
      loadTransactions();
      loadProfitReport(selectedDays);
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense.');
    }
  };

  const handleVoidTrans = (transId: number) => {
    Alert.alert(
      'Void Transaction',
      `Are you sure you want to cancel Invoice #${transId}? Medicines stock will be restored and loan balance removed.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Yes, Void & Restore Stock',
          style: 'destructive',
          onPress: async () => {
            try {
              await voidTransaction(transId);
              Alert.alert('Voided', 'Transaction cancelled and stock returned.');
              loadSummary();
              loadTransactions();
              loadProfitReport(selectedDays);
            } catch (err: any) {
              Alert.alert('Error', err.message || 'Failed to void transaction.');
            }
          },
        },
      ]
    );
  };

  return (
    <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Finance & Accounts</Text>
      </View>

      {/* Main Net Cash Card */}
      <View style={styles.mainCard}>
        <Text style={styles.mainCardLabel}>Today Net Cash In Hand</Text>
        <Text style={styles.mainCardValue}>Rs. {summary.netCashInHand.toLocaleString()}</Text>
      </View>

      {/* Grid Cards */}
      <View style={styles.grid}>
        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today Cash Sales</Text>
          <Text style={[styles.cardValue, styles.greenText]}>
            + Rs. {summary.todayCashSales.toLocaleString()}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today New Loan</Text>
          <Text style={[styles.cardValue, styles.redText]}>
            Rs. {summary.todayNewLoan.toLocaleString()}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today Recoveries</Text>
          <Text style={[styles.cardValue, styles.greenText]}>
            + Rs. {summary.todayLoanRecoveries.toLocaleString()}
          </Text>
        </View>

        <View style={styles.card}>
          <Text style={styles.cardLabel}>Today Expenses</Text>
          <Text style={[styles.cardValue, styles.redText]}>
            - Rs. {summary.todayExpenses.toLocaleString()}
          </Text>
        </View>

        <View style={[styles.card, { width: '95%' }]}>
          <Text style={styles.cardLabel}>Total Market Loan Due (All Khata)</Text>
          <Text style={[styles.cardValue, styles.orangeText]}>
            Rs. {summary.totalMarketLoan.toLocaleString()}
          </Text>
        </View>
      </View>

      {/* Quick Action Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.actionBtnBlue} onPress={openRecoveryModal}>
          <Text style={styles.actionBtnText}>+ Receive Loan Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnRed} onPress={() => setExpenseModal(true)}>
          <Text style={styles.actionBtnText}>- Record Clinic Expense</Text>
        </TouchableOpacity>
      </View>

      {/* ---------------- NEW: DOCTOR NET PROFIT ANALYZER ---------------- */}
      <View style={styles.profitBox}>
        <Text style={styles.profitSectionTitle}>📊 Net Profit Analyzer (خالص منافع)</Text>
        <Text style={styles.profitSectionSub}>اخراجات اور دواؤں کی قیمت خرید نکال کر اصل بچت:</Text>

        {/* Filter Buttons */}
        <View style={styles.daysFilterRow}>
          {[7, 10, 20, 30].map((d) => (
            <TouchableOpacity
              key={d}
              style={[styles.dayBtn, selectedDays === d && styles.dayBtnActive]}
              onPress={() => setSelectedDays(d)}
            >
              <Text style={[styles.dayBtnText, selectedDays === d && styles.dayBtnTextActive]}>
                {d} Days
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {profitData && (
          <View style={styles.profitReportCard}>
            <View style={styles.profitRow}>
              <Text style={styles.profitRowLabel}>Total Medicine Sales:</Text>
              <Text style={styles.profitRowValue}>Rs. {profitData.totalSales.toLocaleString()}</Text>
            </View>

            <View style={styles.profitRow}>
              <Text style={styles.profitRowLabel}>Cost of Medicines (خریداری قیمت):</Text>
              <Text style={[styles.profitRowValue, { color: '#64748b' }]}>- Rs. {profitData.totalCost.toLocaleString()}</Text>
            </View>

            <View style={styles.profitRow}>
              <Text style={styles.profitRowLabel}>Clinic Expenses (کل اخراجات):</Text>
              <Text style={[styles.profitRowValue, { color: '#dc2626' }]}>- Rs. {profitData.totalExpenses.toLocaleString()}</Text>
            </View>

            <View style={styles.profitDivider} />

            <View style={[styles.profitRow, { marginTop: 4 }]}>
              <Text style={styles.netProfitLabel}>Doctor Net Profit ({selectedDays} دن کا اصل منافع):</Text>
              <Text style={[styles.netProfitValue, { color: profitData.netProfit >= 0 ? '#16a34a' : '#dc2626' }]}>
                Rs. {profitData.netProfit.toLocaleString()}
              </Text>
            </View>

            <View style={{ marginTop: 8, paddingTop: 6, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
              <Text style={{ fontSize: 11, color: '#0284c7' }}>
                💡 اس دوران کل کیش آمدن (کیش سیل + ادھار وصولی): Rs. {profitData.totalCashCollected.toLocaleString()}
              </Text>
            </View>
          </View>
        )}
      </View>

      {/* ---------------- REGISTER: TODAY VS MONTH VIEW ---------------- */}
      <View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 14, backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3 }}>
        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: viewMode === 'daily' ? '#ffffff' : 'transparent', borderRadius: 6 }}
          onPress={() => setViewMode('daily')}
        >
          <Text style={{ fontWeight: 'bold', color: viewMode === 'daily' ? '#0284c7' : '#64748b' }}>Today Sales (شام کا رجسٹر)</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: viewMode === 'monthly' ? '#ffffff' : 'transparent', borderRadius: 6 }}
          onPress={() => setViewMode('monthly')}
        >
          <Text style={{ fontWeight: 'bold', color: viewMode === 'monthly' ? '#0284c7' : '#64748b' }}>This Month View</Text>
        </TouchableOpacity>
      </View>

      {/* Month Overview */}
      {viewMode === 'monthly' && monthSummary && (
        <View style={{ margin: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 10, elevation: 1, borderWidth: 1, borderColor: '#e2e8f0' }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#0f172a' }}>This Month Overview</Text>
          <Text style={{ fontSize: 13, color: '#16a34a', marginBottom: 6 }}>Month Cash Inflow: Rs. {Number(monthSummary.monthCashSales + monthSummary.monthRecoveries).toLocaleString()}</Text>
          <Text style={{ fontSize: 13, color: '#dc2626', marginBottom: 6 }}>Month New Loan Given: Rs. {Number(monthSummary.monthNewLoan).toLocaleString()}</Text>
          <Text style={{ fontSize: 13, color: '#ea580c', marginBottom: 6 }}>Month Total Expenses: Rs. {Number(monthSummary.monthExpenses).toLocaleString()}</Text>
          <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />
          <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0284c7' }}>Net Monthly Cash Balance: Rs. {Number(monthSummary.netMonthCash).toLocaleString()}</Text>
        </View>
      )}

      {/* Evening Transactions Register */}
      {viewMode === 'daily' && (
        <View style={{ padding: 16 }}>
          <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 }}>
            Today Sales Register (آج کٹی پرچیاں: {dayTransactions.length})
          </Text>

          {dayTransactions.length === 0 ? (
            <Text style={{ textAlign: 'center', color: '#94a3b8', marginVertical: 20 }}>No invoices generated today.</Text>
          ) : (
            dayTransactions.map((item) => (
              <View
                key={item.id}
                style={{
                  backgroundColor: '#ffffff',
                  borderRadius: 8,
                  padding: 12,
                  marginBottom: 10,
                  borderWidth: 1,
                  borderColor: '#e2e8f0',
                }}
              >
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View>
                    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0f172a' }}>
                      #{item.id} - {item.patient_name}
                    </Text>
                    <Text style={{ fontSize: 12, color: '#64748b' }}>
                      Head: {item.household_head} | Time: {item.time}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={{ backgroundColor: '#fee2e2', paddingHorizontal: 10, paddingVertical: 5, borderRadius: 6 }}
                    onPress={() => handleVoidTrans(item.id)}
                  >
                    <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 11 }}>Cancel / Void</Text>
                  </TouchableOpacity>
                </View>

                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 8, paddingTop: 8, borderTopWidth: 1, borderTopColor: '#f1f5f9' }}>
                  <Text style={{ fontSize: 13, fontWeight: '600' }}>Bill: Rs. {item.total_amount}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: '#16a34a' }}>Cash: Rs. {item.paid_amount}</Text>
                  <Text style={{ fontSize: 13, fontWeight: '600', color: item.loan_amount > 0 ? '#dc2626' : '#64748b' }}>
                    Loan: Rs. {item.loan_amount}
                  </Text>
                </View>
              </View>
            ))
          )}
        </View>
      )}

      {/* ---------------- LOAN RECOVERY MODAL ---------------- */}
      <Modal visible={recoveryModal} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Receive Loan Payment</Text>
          
          <Text style={styles.inputLabel}>Select Household Account:</Text>
          <View style={styles.householdListBox}>
            <FlatList
              data={householdsWithLoan}
              keyExtractor={(i) => i.id.toString()}
              ListEmptyComponent={<Text style={styles.emptyListText}>No accounts with pending loan.</Text>}
              renderItem={({ item }) => {
                const isSelected = selectedHousehold?.id === item.id;
                return (
                  <TouchableOpacity
                    style={[styles.accountItem, isSelected && styles.accountItemSelected]}
                    onPress={() => setSelectedHousehold(item)}
                  >
                    <Text style={[styles.accountName, isSelected && styles.whiteText]}>
                      {item.head_name} ({item.household_code})
                    </Text>
                    <Text style={[styles.accountDue, isSelected && styles.whiteText]}>
                      Due: Rs. {item.balance}
                    </Text>
                  </TouchableOpacity>
                );
              }}
            />
          </View>

          {selectedHousehold && (
            <View style={styles.formArea}>
              <Text style={styles.inputLabel}>
                Payment Amount (Max: Rs. {selectedHousehold.balance}):
              </Text>
              <TextInput
                style={styles.input}
                placeholder="0.00"
                keyboardType="numeric"
                value={recoveryAmount}
                onChangeText={setRecoveryAmount}
              />

              <Text style={styles.inputLabel}>Notes:</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paid in full"
                value={recoveryNotes}
                onChangeText={setRecoveryNotes}
              />
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setRecoveryModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveRecovery}>
              <Text style={styles.saveBtnText}>Save Payment</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* ---------------- EXPENSE MODAL ---------------- */}
      <Modal visible={expenseModal} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Record Clinic Expense</Text>

          <Text style={styles.inputLabel}>Title / Description *</Text>
          <TextInput
            style={[styles.input, { color: '#0f172a' }]}
            placeholder="e.g. Tea, Cotton, Bulb, Cleaning"
            placeholderTextColor="#94a3b8"
            value={expenseTitle}
            onChangeText={(text) => setExpenseTitle(text)}
          />

          <Text style={styles.inputLabel}>Amount *</Text>
          <TextInput
            style={styles.input}
            placeholder="0.00"
            keyboardType="numeric"
            value={expenseAmount}
            onChangeText={setExpenseAmount}
          />

          <Text style={styles.inputLabel}>Category</Text>
          <TextInput
            style={styles.input}
            placeholder="General, Supplies, Utilities"
            value={expenseCategory}
            onChangeText={setExpenseCategory}
          />

          <View style={styles.modalActions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={() => setExpenseModal(false)}>
              <Text style={styles.cancelBtnText}>Close</Text>
            </TouchableOpacity>
            <TouchableOpacity style={styles.saveBtn} onPress={handleSaveExpense}>
              <Text style={styles.saveBtnText}>Save Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <View style={{ height: 40 }} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  mainCard: { backgroundColor: '#0284c7', margin: 16, padding: 20, borderRadius: 12, alignItems: 'center' },
  mainCardLabel: { color: '#e0f2fe', fontSize: 13, fontWeight: '600', textTransform: 'uppercase' },
  mainCardValue: { color: '#ffffff', fontSize: 28, fontWeight: 'bold', marginTop: 4 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 10 },
  card: { width: '45%', backgroundColor: '#ffffff', margin: '2.5%', padding: 14, borderRadius: 10, elevation: 1 },
  cardLabel: { fontSize: 12, color: '#64748b', fontWeight: '500' },
  cardValue: { fontSize: 16, fontWeight: 'bold', marginTop: 4 },
  greenText: { color: '#16a34a' },
  redText: { color: '#dc2626' },
  orangeText: { color: '#ea580c' },
  buttonSection: { padding: 16, gap: 12 },
  actionBtnBlue: { backgroundColor: '#0284c7', padding: 14, borderRadius: 8, alignItems: 'center' },
  actionBtnRed: { backgroundColor: '#e11d48', padding: 14, borderRadius: 8, alignItems: 'center' },
  actionBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  // Profit Box Styles
  profitBox: {
    margin: 16,
    padding: 16,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 2,
  },
  profitSectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#0f172a' },
  profitSectionSub: { fontSize: 12, color: '#64748b', marginTop: 2, marginBottom: 12 },
  daysFilterRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  dayBtn: {
    flex: 1,
    paddingVertical: 7,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  dayBtnActive: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  dayBtnText: { fontSize: 12, fontWeight: 'bold', color: '#475569' },
  dayBtnTextActive: { color: '#ffffff' },
  profitReportCard: { backgroundColor: '#f8fafc', padding: 12, borderRadius: 8 },
  profitRow: { flexDirection: 'row', justifyContent: 'space-between', marginVertical: 3 },
  profitRowLabel: { fontSize: 13, color: '#475569' },
  profitRowValue: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  profitDivider: { height: 1, backgroundColor: '#cbd5e1', marginVertical: 8 },
  netProfitLabel: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  netProfitValue: { fontSize: 17, fontWeight: 'bold' },
  // Modals
  modalContent: { flex: 1, padding: 20, paddingTop: 40, backgroundColor: '#ffffff' },
  modalTitle: { fontSize: 18, fontWeight: 'bold', marginBottom: 16 },
  inputLabel: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, marginBottom: 12 },
  householdListBox: { height: 180, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, marginBottom: 16 },
  accountItem: { padding: 12, borderBottomWidth: 1, borderBottomColor: '#f1f5f9', flexDirection: 'row', justifyContent: 'space-between' },
  accountItemSelected: { backgroundColor: '#0284c7' },
  accountName: { fontSize: 14, fontWeight: '600' },
  accountDue: { fontSize: 14, fontWeight: 'bold', color: '#dc2626' },
  emptyListText: { padding: 20, textAlign: 'center', color: '#94a3b8' },
  whiteText: { color: '#ffffff' },
  formArea: { marginVertical: 8 },
  modalActions: { flexDirection: 'row', gap: 10, marginTop: 'auto', paddingBottom: 20 },
  cancelBtn: { flex: 1, padding: 14, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  saveBtn: { flex: 1, padding: 14, backgroundColor: '#16a34a', borderRadius: 8, alignItems: 'center' },
  cancelBtnText: { fontWeight: 'bold', color: '#475569' },
  saveBtnText: { fontWeight: 'bold', color: '#ffffff' },
});