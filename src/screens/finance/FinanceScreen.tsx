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
  FinanceSummary 
} from '../../database/queries/finance';
import { getHouseholds } from '../../database/queries/households';
import { Household } from '../../types/household';
import { getDayTransactionsList, getMonthlyFinanceSummary } from '../../database/queries/finance';
import { voidTransaction } from '../../database/queries/transactions';

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

  const loadSummary = useCallback(async () => {
    try {
      const data = await getDailyFinanceSummary();
      setSummary(data);
    } catch (error) {
      console.error('Failed to load finance summary:', error);
    }
  }, []);

  useEffect(() => {
    loadSummary();
  }, [loadSummary]);

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
    } catch (error) {
      Alert.alert('Error', 'Failed to save expense.');
    }
  };
const [dayTransactions, setDayTransactions] = useState<any[]>([]);
const [viewMode, setViewMode] = useState<'daily' | 'monthly'>('daily');
const [monthSummary, setMonthSummary] = useState<any>(null);

const loadTransactions = async () => {
  const list = await getDayTransactionsList();
  setDayTransactions(list);
  const mSummary = await getMonthlyFinanceSummary();
  setMonthSummary(mSummary);
};

useEffect(() => {
  loadTransactions();
}, [loadSummary]);

// ٹرانزیکشن کینسل کرنے کا ہینڈلر
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
          } catch (err: any) {
            Alert.alert('Error', err.message || 'Failed to void transaction.');
          }
        },
      },
    ]
  );
};
  return (
    <ScrollView style={styles.container}>
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
  {/* Today Cash Sales */}
  <View style={styles.card}>
    <Text style={styles.cardLabel}>Today Cash Sales</Text>
    <Text style={[styles.cardValue, styles.greenText]}>
      + Rs. {summary.todayCashSales.toLocaleString()}
    </Text>
  </View>

  {/* Today New Loan Given (نیا کارڈ) */}
  <View style={styles.card}>
    <Text style={styles.cardLabel}>Today New Loan</Text>
    <Text style={[styles.cardValue, styles.redText]}>
      Rs. {summary.todayNewLoan.toLocaleString()}
    </Text>
  </View>

  {/* Today Recoveries */}
  <View style={styles.card}>
    <Text style={styles.cardLabel}>Today Recoveries</Text>
    <Text style={[styles.cardValue, styles.greenText]}>
      + Rs. {summary.todayLoanRecoveries.toLocaleString()}
    </Text>
  </View>

  {/* Today Expenses */}
  <View style={styles.card}>
    <Text style={styles.cardLabel}>Today Expenses</Text>
    <Text style={[styles.cardValue, styles.redText]}>
      - Rs. {summary.todayExpenses.toLocaleString()}
    </Text>
  </View>

  {/* Total Market Loan (پورا چوڑا کارڈ) */}
  <View style={[styles.card, { width: '95%' }]}>
    <Text style={styles.cardLabel}>Total Market Loan Due (All Khata)</Text>
    <Text style={[styles.cardValue, styles.orangeText]}>
      Rs. {summary.totalMarketLoan.toLocaleString()}
    </Text>
  </View>
</View>

      {/* Action Buttons */}
      <View style={styles.buttonSection}>
        <TouchableOpacity style={styles.actionBtnBlue} onPress={openRecoveryModal}>
          <Text style={styles.actionBtnText}>+ Receive Loan Payment</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.actionBtnRed} onPress={() => setExpenseModal(true)}>
          <Text style={styles.actionBtnText}>- Record Clinic Expense</Text>
        </TouchableOpacity>
      </View>

      {/* Loan Recovery Modal */}
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

      {/* Expense Modal */}
      <Modal visible={expenseModal} animationType="slide">
        <View style={styles.modalContent}>
          <Text style={styles.modalTitle}>Record Clinic Expense</Text>

          <Text style={styles.inputLabel}>Title / Description *</Text>
<TextInput
  style={[styles.input, { color: '#0f172a' }]}
  placeholder="e.g. Tea, Cotton, Bulb, Cleaning"
  placeholderTextColor="#94a3b8"
  keyboardType="visible-password"
  autoCorrect={false}
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
        {/* Daily vs Monthly Toggle */}
<View style={{ flexDirection: 'row', marginHorizontal: 16, marginTop: 10, backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3 }}>
  <TouchableOpacity
    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: viewMode === 'daily' ? '#ffffff' : 'transparent', borderRadius: 6 }}
    onPress={() => setViewMode('daily')}
  >
    <Text style={{ fontWeight: 'bold', color: viewMode === 'daily' ? '#0284c7' : '#64748b' }}>Today (Evening Register)</Text>
  </TouchableOpacity>

  <TouchableOpacity
    style={{ flex: 1, paddingVertical: 8, alignItems: 'center', backgroundColor: viewMode === 'monthly' ? '#ffffff' : 'transparent', borderRadius: 6 }}
    onPress={() => setViewMode('monthly')}
  >
    <Text style={{ fontWeight: 'bold', color: viewMode === 'monthly' ? '#0284c7' : '#64748b' }}>This Month View</Text>
  </TouchableOpacity>
</View>

{viewMode === 'monthly' && monthSummary && (
  <View style={{ margin: 16, padding: 16, backgroundColor: '#ffffff', borderRadius: 10, elevation: 1 }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', marginBottom: 10, color: '#0f172a' }}>This Month Overview</Text>
    <Text style={{ fontSize: 13, color: '#16a34a', marginBottom: 6 }}>Month Cash Inflow: Rs. {(monthSummary.monthCashSales + monthSummary.monthRecoveries).toLocaleString()}</Text>
    <Text style={{ fontSize: 13, color: '#dc2626', marginBottom: 6 }}>Month New Loan Given: Rs. {monthSummary.monthNewLoan.toLocaleString()}</Text>
    <Text style={{ fontSize: 13, color: '#ea580c', marginBottom: 6 }}>Month Total Expenses: Rs. {monthSummary.monthExpenses.toLocaleString()}</Text>
    <View style={{ height: 1, backgroundColor: '#e2e8f0', marginVertical: 8 }} />
    <Text style={{ fontSize: 15, fontWeight: 'bold', color: '#0284c7' }}>Net Monthly Cash Balance: Rs. {monthSummary.netMonthCash.toLocaleString()}</Text>
  </View>
)}

{/* Evening Transactions List */}
{viewMode === 'daily' && (
  <View style={{ padding: 16 }}>
    <Text style={{ fontSize: 16, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 }}>
      Today Sales Register (آج کٹی پرچیاں: {dayTransactions.length})
    </Text>

    {dayTransactions.map((item) => (
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
    ))}
  </View>
)}
      </Modal>
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