// src/screens/newEntry/NewEntryScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';

import {
  searchPatients,
  createHouseholdWithPatient,
  getHouseholds,
  addPatientToExistingHousehold,
  PatientWithHousehold,
  Household,
} from '../../database/queries/households';

import { searchMedicines } from '../../database/queries/medicines';
import { createSaleTransaction } from '../../database/queries/transactions';
import { Medicine } from '../../types/medicine';
import { useCartStore, CartItem } from '../../store/useCartStore';

export default function NewEntryScreen() {
  const cart = useCartStore();

  // 1. Patient Live Search States
  const [patientSearchText, setPatientSearchText] = useState('');
  const [patientResults, setPatientResults] = useState<PatientWithHousehold[]>([]);

  // 2. Medicine Live Search States
  const [medSearchText, setMedSearchText] = useState('');
  const [medResults, setMedResults] = useState<Medicine[]>([]);

  // 3. Quick Add Modal States
  const [quickAddModal, setQuickAddModal] = useState(false);
  const [isNewHousehold, setIsNewHousehold] = useState(false); // false = Existing, true = New

  // 4. Existing Household Selection States
  const [hhSearchText, setHhSearchText] = useState('');
  const [hhResults, setHhResults] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);
  const [relationToHead, setRelationToHead] = useState('Son');

  // 5. New Household Specific States
  const [quickHeadName, setQuickHeadName] = useState('');
  const [quickPhone, setQuickPhone] = useState('');
  const [quickOpeningBalance, setQuickOpeningBalance] = useState('');

  // A. Search Patients Live
  useEffect(() => {
    if (patientSearchText.trim().length === 0) {
      setPatientResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchPatients(patientSearchText.trim());
        setPatientResults(results);
      } catch (err) {
        console.error('Patient search error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [patientSearchText]);

  // B. Search Households Live
  useEffect(() => {
    if (hhSearchText.trim().length === 0) {
      setHhResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await getHouseholds(hhSearchText.trim());
        setHhResults(results);
      } catch (err) {
        console.error('Household search error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [hhSearchText]);

  // C. Search Medicines Live
  useEffect(() => {
    if (medSearchText.trim().length === 0) {
      setMedResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      try {
        const results = await searchMedicines(medSearchText.trim());
        setMedResults(results);
      } catch (err) {
        console.error('Medicine search error:', err);
      }
    }, 250);

    return () => clearTimeout(timer);
  }, [medSearchText]);

  // Quick Register & Select New Patient
  const handleQuickCreatePatient = async () => {
    if (!patientSearchText.trim()) {
      Alert.alert('Required', 'Patient name is required.');
      return;
    }

    try {
      if (!isNewHousehold) {
        // 1. موجودہ ہاؤس ہولڈ میں نیا مریض شامل کرنا
        if (!selectedHousehold) {
          Alert.alert('Select Household', 'Please search and select an existing household.');
          return;
        }

        const newPatientId = await addPatientToExistingHousehold(
          selectedHousehold.id,
          patientSearchText.trim(),
          relationToHead || 'Family Member',
          quickPhone.trim() || undefined
        );

        cart.setSelectedPatient({
          id: newPatientId,
          household_id: selectedHousehold.id,
          patient_code: `P-${newPatientId}`,
          name: patientSearchText.trim(),
          household_head: selectedHousehold.head_name,
          household_code: selectedHousehold.household_code,
          household_balance: selectedHousehold.balance,
        } as PatientWithHousehold);

      } else {
        // 2. بالکل نیا ہاؤس ہولڈ بنانا
        const head = quickHeadName.trim() ? quickHeadName.trim() : patientSearchText.trim();
        const balance = parseFloat(quickOpeningBalance) || 0;

        const result = await createHouseholdWithPatient(
          {
            head_name: head,
            phone: quickPhone.trim() || undefined,
            opening_balance: balance,
          },
          patientSearchText.trim(),
          quickHeadName.trim() ? relationToHead : 'Self (Head)'
        );

        cart.setSelectedPatient({
          id: result.patientId,
          household_id: result.householdId,
          patient_code: `P-${result.patientId}`,
          name: patientSearchText.trim(),
          household_head: head,
          household_code: `H-${result.householdId}`,
          household_balance: balance,
        } as PatientWithHousehold);
      }

      // فارم ری سیٹ کریں
      setQuickAddModal(false);
      setPatientSearchText('');
      setPatientResults([]);
      setSelectedHousehold(null);
      setHhSearchText('');
      setQuickHeadName('');
      setQuickPhone('');
      setQuickOpeningBalance('');
      Alert.alert('Success', 'Patient registered to household successfully!');
    } catch (error) {
      console.error(error);
      Alert.alert('Error', 'Failed to register patient.');
    }
  };

  // Add Medicine into Cart
  const handleSelectMedicine = (med: Medicine) => {
    if (med.stock <= 0) {
      Alert.alert('Out of Stock', `${med.name} is currently out of stock.`);
      return;
    }
    cart.addItem(med);
    setMedSearchText('');
    setMedResults([]);
  };

  // Handle Complete Sale Transaction
  const handleCheckout = async () => {
    if (!cart.selectedPatient) {
      Alert.alert('Required', 'Please select or add a patient first.');
      return;
    }
    if (cart.items.length === 0) {
      Alert.alert('Required', 'Cart is empty. Please select medicines.');
      return;
    }

    const netTotal = cart.getNetTotal();
    const finalLoan = cart.getLoanAmount();
    const finalPaid = Math.max(0, netTotal - finalLoan);

    try {
      await createSaleTransaction({
        household_id: cart.selectedPatient.household_id,
        patient_id: cart.selectedPatient.id,
        payment_type: cart.paymentType,
        total_amount: netTotal,
        discount_amount: cart.discount || 0,
        paid_amount: finalPaid,
        loan_amount: finalLoan,
        notes: cart.notes || '',
        items: cart.items.map((i: CartItem) => ({
          medicine_id: i.medicine.id,
          quantity: i.quantity,
          unit_price: i.unit_price,
          total_price: i.total_price,
        })),
      });

      Alert.alert(
        'Transaction Saved',
        `Invoice created!\nPaid Cash: Rs. ${finalPaid}\nLoan Added: Rs. ${finalLoan}`
      );
      cart.clearCart();
    } catch (error: any) {
      console.error('Checkout error:', error);
      Alert.alert('Error', error.message || 'Failed to complete transaction.');
    }
  };

  const netTotal = cart.getNetTotal();
  const balanceVal = Number(
    cart.selectedPatient?.household_balance ??
    (cart.selectedPatient as any)?.balance ??
    0
  );

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView style={styles.container} keyboardShouldPersistTaps="handled">
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>New Sale / Prescription</Text>
        </View>

        {/* 1. Patient Selection Box */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>1. Patient Details</Text>
          {cart.selectedPatient ? (
            <View style={styles.selectedPatientBox}>
              <View style={{ flex: 1 }}>
                <Text style={styles.patientName}>{cart.selectedPatient.name}</Text>
                <Text style={styles.patientSub}>
                  Head: {cart.selectedPatient.household_head || (cart.selectedPatient as any).head_name || 'Self'}
                </Text>
                <Text style={styles.balanceText}>
                  Khata Due: Rs. {balanceVal.toLocaleString()}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.changeBtn}
                onPress={() => cart.setSelectedPatient(null)}
              >
                <Text style={styles.changeBtnText}>Change</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View>
              <TextInput
                style={styles.input}
                placeholder="Search patient name, code, or household..."
                placeholderTextColor="#94a3b8"
                value={patientSearchText}
                onChangeText={setPatientSearchText}
              />
              {patientSearchText.trim().length > 0 && (
                <View style={styles.dropdownBox}>
                  {patientResults.map((p) => {
                    const pDue = Number(p.household_balance ?? (p as any).balance ?? 0);
                    return (
                      <TouchableOpacity
                        key={p.id}
                        style={styles.dropdownItem}
                        onPress={() => {
                          cart.setSelectedPatient(p);
                          setPatientSearchText('');
                          setPatientResults([]);
                        }}
                      >
                        <Text style={styles.dropdownItemTitle}>{p.name}</Text>
                        <Text style={styles.dropdownItemSub}>
                          Head: {p.household_head || (p as any).head_name || 'Self'} | Due: Rs. {pDue.toLocaleString()}
                        </Text>
                      </TouchableOpacity>
                    );
                  })}

                  {/* Register New Patient Button */}
                  <TouchableOpacity
                    style={styles.quickAddBtn}
                    onPress={() => {
                      setQuickHeadName('');
                      setQuickPhone('');
                      setQuickOpeningBalance('');
                      setSelectedHousehold(null);
                      setHhSearchText('');
                      setQuickAddModal(true);
                    }}
                  >
                    <Text style={styles.quickAddBtnText}>
                      ➕ Register "{patientSearchText.trim()}" as New Patient
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}
        </View>

        {/* 2. Medicine Search & Selection Box */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>2. Add Medicines</Text>
          <TextInput
            style={styles.input}
            placeholder="Search medicine by name or generic..."
            placeholderTextColor="#94a3b8"
            value={medSearchText}
            onChangeText={setMedSearchText}
          />
          {medSearchText.trim().length > 0 && (
            <View style={styles.dropdownBox}>
              {medResults.length === 0 ? (
                <Text style={styles.noResultText}>No matching medicine found.</Text>
              ) : (
                medResults.map((m) => {
                  const displayPrice = (m as any).selling_price ?? (m as any).sale_price ?? (m as any).price ?? 0;
                  return (
                    <TouchableOpacity
                      key={m.id}
                      style={styles.dropdownItem}
                      onPress={() => handleSelectMedicine(m)}
                    >
                      <View style={{ flex: 1 }}>
                        <Text style={styles.dropdownItemTitle}>{m.name}</Text>
                        <Text style={styles.dropdownItemSub}>
                          {m.generic_name || 'General'} | Rs. {displayPrice}
                        </Text>
                      </View>
                      <Text
                        style={[
                          styles.medStockBadge,
                          m.stock <= (m.low_stock_limit || 5) ? styles.lowStock : styles.normalStock,
                        ]}
                      >
                        Stock: {m.stock}
                      </Text>
                    </TouchableOpacity>
                  );
                })
              )}
            </View>
          )}
        </View>

        {/* 3. Selected Items (Cart Table) */}
        <View style={styles.card}>
          <Text style={styles.sectionTitle}>3. Prescription Items ({cart.items.length})</Text>
          {cart.items.length === 0 ? (
            <Text style={styles.emptyCartText}>No medicines added to prescription yet.</Text>
          ) : (
            cart.items.map((item: CartItem) => (
              <View key={item.medicine.id} style={styles.cartRow}>
                <View style={{ flex: 1.5 }}>
                  <Text style={styles.cartMedName}>{item.medicine.name}</Text>
                  <Text style={styles.cartMedSub}>Rs. {item.unit_price} each</Text>
                </View>

                {/* Quantity Controls */}
                <View style={styles.qtyContainer}>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => cart.updateQuantity(item.medicine.id, item.quantity - 1)}
                  >
                    <Text style={styles.qtyBtnText}>-</Text>
                  </TouchableOpacity>
                  <Text style={styles.qtyText}>{item.quantity}</Text>
                  <TouchableOpacity
                    style={styles.qtyBtn}
                    onPress={() => {
                      if (item.quantity >= item.medicine.stock) {
                        Alert.alert('Stock Limit', `Only ${item.medicine.stock} available in stock.`);
                        return;
                      }
                      cart.updateQuantity(item.medicine.id, item.quantity + 1);
                    }}
                  >
                    <Text style={styles.qtyBtnText}>+</Text>
                  </TouchableOpacity>
                </View>

                <Text style={styles.cartItemTotal}>Rs. {item.total_price}</Text>

                <TouchableOpacity
                  style={styles.removeBtn}
                  onPress={() => cart.removeItem(item.medicine.id)}
                >
                  <Text style={styles.removeBtnText}>✕</Text>
                </TouchableOpacity>
              </View>
            ))
          )}
        </View>

        {/* 4. Payment & Billing Section */}
        {cart.items.length > 0 && (
          <View style={styles.card}>
            <Text style={styles.sectionTitle}>4. Payment & Settlement</Text>

            {/* Total / Discount */}
            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Subtotal:</Text>
              <Text style={styles.billValue}>Rs. {cart.getSubTotal()}</Text>
            </View>

            <View style={styles.billRow}>
              <Text style={styles.billLabel}>Discount (Rs.):</Text>
              <TextInput
                style={styles.discountInput}
                placeholder="0"
                keyboardType="numeric"
                value={cart.discount ? cart.discount.toString() : ''}
                onChangeText={(t) => cart.setDiscount(parseFloat(t) || 0)}
              />
            </View>

            <View style={[styles.billRow, styles.netTotalRow]}>
              <Text style={styles.netTotalLabel}>Net Total Payable:</Text>
              <Text style={styles.netTotalValue}>Rs. {netTotal.toLocaleString()}</Text>
            </View>

            {/* Payment Type Selector Buttons */}
            <View style={styles.paymentTypeRow}>
              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  cart.paymentType === 'cash' && styles.typeBtnActiveCash,
                ]}
                onPress={() => cart.setPaymentType('cash')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cart.paymentType === 'cash' && styles.typeBtnTextActive,
                  ]}
                >
                  💵 Full Cash
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  cart.paymentType === 'loan' && styles.typeBtnActiveLoan,
                ]}
                onPress={() => cart.setPaymentType('loan')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cart.paymentType === 'loan' && styles.typeBtnTextActive,
                  ]}
                >
                  📝 Full Loan (ادھار)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.typeBtn,
                  cart.paymentType === 'partial' && styles.typeBtnActivePartial,
                ]}
                onPress={() => cart.setPaymentType('partial')}
              >
                <Text
                  style={[
                    styles.typeBtnText,
                    cart.paymentType === 'partial' && styles.typeBtnTextActive,
                  ]}
                >
                  ⚖️ Partial
                </Text>
              </TouchableOpacity>
            </View>

            {/* Partial Payment Amount Input */}
            {cart.paymentType === 'partial' && (
              <View style={styles.partialBox}>
                <Text style={styles.inputLabel}>Cash Paid Now (Rs.):</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. 200"
                  keyboardType="numeric"
                  value={cart.paidAmount ? cart.paidAmount.toString() : ''}
                  onChangeText={(t) => cart.setPaidAmount(parseFloat(t) || 0)}
                />
                <Text style={styles.partialBalanceNote}>
                  Remaining to Khata Loan: Rs. {cart.getLoanAmount()}
                </Text>
              </View>
            )}

            {/* Notes Input */}
            <TextInput
              style={[styles.input, { marginTop: 10 }]}
              placeholder="Doctor notes or diagnosis (optional)..."
              placeholderTextColor="#94a3b8"
              value={cart.notes}
              onChangeText={cart.setNotes}
            />

            {/* Checkout Button */}
            <TouchableOpacity style={styles.checkoutBtn} onPress={handleCheckout}>
              <Text style={styles.checkoutBtnText}>
                Complete & Save Sale (Rs. {netTotal})
              </Text>
            </TouchableOpacity>
          </View>
        )}

        <View style={{ height: 40 }} />
      </ScrollView>

      {/* Quick Patient Registration Modal */}
      <Modal visible={quickAddModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Register New Patient</Text>

            {/* Mode Selector Tabs */}
            <View style={{ flexDirection: 'row', backgroundColor: '#e2e8f0', borderRadius: 8, padding: 3, marginBottom: 14 }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  backgroundColor: !isNewHousehold ? '#ffffff' : 'transparent',
                  borderRadius: 6,
                }}
                onPress={() => setIsNewHousehold(false)}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: !isNewHousehold ? '#0284c7' : '#64748b' }}>
                  Existing Household (پرانا گھرانہ)
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 8,
                  alignItems: 'center',
                  backgroundColor: isNewHousehold ? '#ffffff' : 'transparent',
                  borderRadius: 6,
                }}
                onPress={() => setIsNewHousehold(true)}
              >
                <Text style={{ fontWeight: 'bold', fontSize: 12, color: isNewHousehold ? '#0284c7' : '#64748b' }}>
                  New Household (نیا گھرانہ)
                </Text>
              </TouchableOpacity>
            </View>

            {/* Patient Name (Read-only from search input) */}
            <Text style={styles.modalFieldLabel}>Patient Name</Text>
            <TextInput
              style={[styles.input, { backgroundColor: '#f1f5f9' }]}
              value={patientSearchText}
              editable={false}
            />

            {/* Option A: Link to Existing Household */}
            {!isNewHousehold ? (
              <View style={{ marginTop: 8 }}>
                <Text style={styles.modalFieldLabel}>Select Household / Head (سرپرست منتخب کریں)</Text>
                {selectedHousehold ? (
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#eff6ff', padding: 10, borderRadius: 8, borderWidth: 1, borderColor: '#bfdbfe' }}>
                    <View>
                      <Text style={{ fontWeight: 'bold', color: '#1e40af' }}>{selectedHousehold.head_name} ({selectedHousehold.household_code})</Text>
                      <Text style={{ fontSize: 11, color: '#64748b' }}>Balance: Rs. {selectedHousehold.balance}</Text>
                    </View>
                    <TouchableOpacity onPress={() => setSelectedHousehold(null)}>
                      <Text style={{ color: '#dc2626', fontWeight: 'bold', fontSize: 12 }}>Change</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View>
                    <TextInput
                      style={styles.input}
                      placeholder="Search head name or code (e.g. Wali, H-0001)..."
                      value={hhSearchText}
                      onChangeText={setHhSearchText}
                    />
                    {hhResults.length > 0 && (
                      <View style={{ borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 6, maxHeight: 120, backgroundColor: '#ffffff', marginTop: 4 }}>
                        <ScrollView nestedScrollEnabled keyboardShouldPersistTaps="handled">
                          {hhResults.map((h) => (
                            <TouchableOpacity
                              key={h.id}
                              style={{ padding: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}
                              onPress={() => {
                                setSelectedHousehold(h);
                                setHhSearchText('');
                                setHhResults([]);
                              }}
                            >
                              <Text style={{ fontWeight: 'bold', fontSize: 13 }}>{h.head_name} ({h.household_code})</Text>
                              <Text style={{ fontSize: 11, color: '#64748b' }}>Balance: Rs. {h.balance}</Text>
                            </TouchableOpacity>
                          ))}
                        </ScrollView>
                      </View>
                    )}
                  </View>
                )}

                <Text style={styles.modalFieldLabel}>Relation to Head (رشتہ)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Son, Daughter, Wife"
                  value={relationToHead}
                  onChangeText={setRelationToHead}
                />
              </View>
            ) : (
              /* Option B: Create Completely New Household */
              <View style={{ marginTop: 8 }}>
                <Text style={styles.modalFieldLabel}>Household Head Name (سربراہ کا نام)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="e.g. Wali Muhammad (اگر مریض خود سربراہ ہے تو خالی چھوڑیں)"
                  value={quickHeadName}
                  onChangeText={setQuickHeadName}
                />

                <Text style={styles.modalFieldLabel}>Phone Number</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0300-1234567"
                  keyboardType="phone-pad"
                  value={quickPhone}
                  onChangeText={setQuickPhone}
                />

                <Text style={styles.modalFieldLabel}>Previous Loan (پرانا ادھار اگر ہے)</Text>
                <TextInput
                  style={styles.input}
                  placeholder="0"
                  keyboardType="numeric"
                  value={quickOpeningBalance}
                  onChangeText={setQuickOpeningBalance}
                />
              </View>
            )}

            {/* Action Buttons */}
            <View style={styles.modalBtnRow}>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#e2e8f0' }]}
                onPress={() => setQuickAddModal(false)}
              >
                <Text style={{ color: '#475569', fontWeight: 'bold' }}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.modalBtn, { backgroundColor: '#16a34a' }]}
                onPress={handleQuickCreatePatient}
              >
                <Text style={{ color: '#ffffff', fontWeight: 'bold' }}>Save & Select</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  card: { backgroundColor: '#ffffff', marginHorizontal: 14, marginTop: 12, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  sectionTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b', marginBottom: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0f172a', backgroundColor: '#ffffff' },
  selectedPatientBox: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#f0f9ff', padding: 12, borderRadius: 8, borderWidth: 1, borderColor: '#bae6fd' },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#0369a1' },
  patientSub: { fontSize: 12, color: '#64748b', marginTop: 2 },
  balanceText: { fontSize: 13, fontWeight: 'bold', color: '#dc2626', marginTop: 4 },
  changeBtn: { backgroundColor: '#0284c7', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 6 },
  changeBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 12 },
  dropdownBox: { marginTop: 6, borderWidth: 1, borderColor: '#e2e8f0', borderRadius: 8, backgroundColor: '#ffffff', maxHeight: 200 },
  dropdownItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  dropdownItemTitle: { fontSize: 14, fontWeight: 'bold', color: '#0f172a' },
  dropdownItemSub: { fontSize: 12, color: '#64748b' },
  quickAddBtn: { padding: 12, backgroundColor: '#eff6ff', borderTopWidth: 1, borderTopColor: '#bfdbfe', alignItems: 'center' },
  quickAddBtnText: { color: '#1d4ed8', fontWeight: 'bold', fontSize: 13 },
  noResultText: { padding: 14, textAlign: 'center', color: '#94a3b8' },
  medStockBadge: { fontSize: 11, fontWeight: 'bold', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 },
  lowStock: { backgroundColor: '#fef3c7', color: '#b45309' },
  normalStock: { backgroundColor: '#dcfce7', color: '#15803d' },
  emptyCartText: { textAlign: 'center', color: '#94a3b8', paddingVertical: 14 },
  cartRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 8, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  cartMedName: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  cartMedSub: { fontSize: 11, color: '#64748b' },
  qtyContainer: { flexDirection: 'row', alignItems: 'center', flex: 1, justifyContent: 'center' },
  qtyBtn: { backgroundColor: '#e2e8f0', width: 28, height: 28, borderRadius: 14, alignItems: 'center', justifyContent: 'center' },
  qtyBtnText: { fontSize: 16, fontWeight: 'bold', color: '#334155' },
  qtyText: { fontSize: 14, fontWeight: 'bold', marginHorizontal: 10 },
  cartItemTotal: { width: 70, textAlign: 'right', fontSize: 13, fontWeight: 'bold', color: '#0284c7' },
  removeBtn: { marginLeft: 10, padding: 4 },
  removeBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 14 },
  billRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginVertical: 4 },
  billLabel: { fontSize: 13, color: '#475569' },
  billValue: { fontSize: 14, fontWeight: '600' },
  discountInput: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 6, width: 90, padding: 4, textAlign: 'right', fontSize: 13 },
  netTotalRow: { borderTopWidth: 1, borderTopColor: '#e2e8f0', paddingTop: 8, marginTop: 6 },
  netTotalLabel: { fontSize: 15, fontWeight: 'bold', color: '#0f172a' },
  netTotalValue: { fontSize: 18, fontWeight: 'bold', color: '#16a34a' },
  paymentTypeRow: { flexDirection: 'row', gap: 6, marginTop: 12 },
  typeBtn: { flex: 1, paddingVertical: 10, borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, alignItems: 'center', backgroundColor: '#f8fafc' },
  typeBtnActiveCash: { backgroundColor: '#16a34a', borderColor: '#16a34a' },
  typeBtnActiveLoan: { backgroundColor: '#dc2626', borderColor: '#dc2626' },
  typeBtnActivePartial: { backgroundColor: '#0284c7', borderColor: '#0284c7' },
  typeBtnText: { fontSize: 11, fontWeight: 'bold', color: '#475569' },
  typeBtnTextActive: { color: '#ffffff' },
  partialBox: { marginTop: 10, backgroundColor: '#f8fafc', padding: 10, borderRadius: 8 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  partialBalanceNote: { fontSize: 12, fontWeight: 'bold', color: '#dc2626', marginTop: 4 },
  checkoutBtn: { backgroundColor: '#0284c7', paddingVertical: 14, borderRadius: 8, alignItems: 'center', marginTop: 14 },
  checkoutBtnText: { color: '#ffffff', fontSize: 15, fontWeight: 'bold' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 },
  modalCard: { backgroundColor: '#ffffff', borderRadius: 12, padding: 20, elevation: 5 },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  modalFieldLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 8 },
  modalBtnRow: { flexDirection: 'row', gap: 10, marginTop: 16 },
  modalBtn: { flex: 1, padding: 12, borderRadius: 8, alignItems: 'center' },
});