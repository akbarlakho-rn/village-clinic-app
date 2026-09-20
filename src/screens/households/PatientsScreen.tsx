// src/screens/households/PatientsScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Modal,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Alert,
} from 'react-native';
import { PatientWithHousehold, Household } from '../../types/household';
import {
  searchPatients,
  createHouseholdWithPatient,
  getPatientHistory,
  getHouseholdHistory,
  getHouseholds,
  addPatientToExistingHousehold,
  PatientHistoryRecord,
} from '../../database/queries/households';
import { recordLoanPayment } from '../../database/queries/finance';

export default function PatientsScreen() {
  // Main Navigation View Tab: 'patients' or 'households'
  const [activeMainTab, setActiveMainTab] = useState<'patients' | 'households'>('patients');

  const [patients, setPatients] = useState<PatientWithHousehold[]>([]);
  const [householdsList, setHouseholdsList] = useState<Household[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // Quick Loan Recovery Modal States
  const [recoveryModal, setRecoveryModal] = useState(false);
  const [selectedHhForRecovery, setSelectedHhForRecovery] = useState<Household | null>(null);
  const [recoveryAmount, setRecoveryAmount] = useState('');
  const [recoveryNotes, setRecoveryNotes] = useState('');

  // History Modal States
  const [historyModal, setHistoryModal] = useState(false);
  const [historyTitle, setHistoryTitle] = useState('');
  const [historySubtitle, setHistorySubtitle] = useState('');
  const [historyRecords, setHistoryRecords] = useState<any[]>([]);

  // Registration Mode State: false = Existing Household, true = New Household
  const [isNewHousehold, setIsNewHousehold] = useState(false);

  // Existing Household Selection States (in Add Modal)
  const [hhSearchText, setHhSearchText] = useState('');
  const [hhResults, setHhResults] = useState<Household[]>([]);
  const [selectedHousehold, setSelectedHousehold] = useState<Household | null>(null);

  // Form fields
  const [patientName, setPatientName] = useState('');
  const [relation, setRelation] = useState('Son');
  const [phone, setPhone] = useState('');
  const [headName, setHeadName] = useState('');
  const [village, setVillage] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [notes, setNotes] = useState('');

  // Load Data
  const loadData = useCallback(async () => {
    try {
      if (activeMainTab === 'patients') {
        const data = await searchPatients(searchTerm);
        setPatients(data);
      } else {
        const hhData = await getHouseholds(searchTerm);
        setHouseholdsList(hhData);
      }
    } catch (error) {
      console.error('Failed to load screen data:', error);
    }
  }, [searchTerm, activeMainTab]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Live Search for Existing Households in Add-Modal
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

  // Open Individual Patient Prescription History
  const handleOpenPatientHistory = async (patient: PatientWithHousehold) => {
    setHistoryTitle(`Patient: ${patient.name}`);
    setHistorySubtitle(`ID: ${patient.patient_code} | Head: ${patient.household_head || 'Self'}`);
    const records = await getPatientHistory(patient.id);
    setHistoryRecords(records);
    setHistoryModal(true);
  };

  // Open Household Complete Khata & Medicines History
  const handleOpenHouseholdHistory = async (household: Household) => {
    setHistoryTitle(`Khata: ${household.head_name}`);
    setHistorySubtitle(
      `Household Code: ${household.household_code} | Total Due: Rs. ${Number(household.balance || 0).toLocaleString()}`
    );
    const records = await getHouseholdHistory(household.id);
    setHistoryRecords(records);
    setHistoryModal(true);
  };

  // Quick Loan Recovery Submission
  // Quick Loan Recovery Submission
  const handleSaveLoanRecovery = async () => {
    if (!selectedHhForRecovery) return;

    const amount = parseFloat(recoveryAmount);
    if (isNaN(amount) || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount.');
      return;
    }

    if (amount > selectedHhForRecovery.balance) {
      Alert.alert(
        'Limit Exceeded',
        `Payment cannot exceed total due balance (Rs. ${selectedHhForRecovery.balance}).`
      );
      return;
    }

    try {
      // آپ کے موجودہ فنکشن کے مطابق: householdId, patientId (null), amount, notes
      await recordLoanPayment(
        selectedHhForRecovery.id,
        null,
        amount,
        recoveryNotes.trim() || undefined
      );

      Alert.alert(
        'Payment Received',
        `Rs. ${amount} received and deducted from ${selectedHhForRecovery.head_name}'s khata.`
      );

      setRecoveryModal(false);
      setSelectedHhForRecovery(null);
      setRecoveryAmount('');
      setRecoveryNotes('');
      loadData(); // لسٹ اور بیلنس فوراً اپڈیٹ ہو جائے گا
    } catch (error: any) {
      console.error(error);
      Alert.alert('Error', error.message || 'Failed to record loan recovery.');
    }
  };

  const resetForm = () => {
    setIsNewHousehold(false);
    setSelectedHousehold(null);
    setHhSearchText('');
    setHhResults([]);
    setPatientName('');
    setRelation('Son');
    setPhone('');
    setHeadName('');
    setVillage('');
    setOpeningBalance('');
    setNotes('');
  };

  // Save Patient / Household Record
  const handleSave = async () => {
    if (!patientName.trim()) {
      Alert.alert('Validation Error', 'Patient name is required.');
      return;
    }

    try {
      if (!isNewHousehold) {
        if (!selectedHousehold) {
          Alert.alert('Validation Error', 'Please select an existing household.');
          return;
        }

        await addPatientToExistingHousehold(
          selectedHousehold.id,
          patientName.trim(),
          relation.trim() || 'Family Member',
          phone.trim() || undefined
        );

        Alert.alert('Success', `Patient added to ${selectedHousehold.head_name}'s household.`);
      } else {
        const finalHead = headName.trim() ? headName.trim() : patientName.trim();
        const opBal = parseFloat(openingBalance) || 0;

        await createHouseholdWithPatient(
          {
            head_name: finalHead,
            village: village.trim() || undefined,
            phone: phone.trim() || undefined,
            opening_balance: opBal,
            notes: notes.trim() || undefined,
          },
          patientName.trim(),
          headName.trim() ? relation.trim() || 'Family Member' : 'Self (Head)'
        );

        Alert.alert('Success', 'New household & patient registered successfully.');
      }

      resetForm();
      setModalVisible(false);
      loadData();
    } catch (error) {
      console.error('Failed to save record:', error);
      Alert.alert('Error', 'Failed to save patient record.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header & Main Tabs */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients & Accounts</Text>

        {/* Dual Tab Switcher */}
        <View style={styles.mainTabRow}>
          <TouchableOpacity
            style={[styles.mainTabBtn, activeMainTab === 'patients' && styles.mainTabBtnActive]}
            onPress={() => {
              setActiveMainTab('patients');
              setSearchTerm('');
            }}
          >
            <Text style={[styles.mainTabBtnText, activeMainTab === 'patients' && styles.mainTabBtnTextActive]}>
              👤 Patients (طبی لسٹ)
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.mainTabBtn, activeMainTab === 'households' && styles.mainTabBtnActive]}
            onPress={() => {
              setActiveMainTab('households');
              setSearchTerm('');
            }}
          >
            <Text style={[styles.mainTabBtnText, activeMainTab === 'households' && styles.mainTabBtnTextActive]}>
              🏡 Households (کھاتہ لیجر)
            </Text>
          </TouchableOpacity>
        </View>

        <TextInput
          style={styles.searchInput}
          placeholder={
            activeMainTab === 'patients'
              ? 'Search patient, code, phone, or head...'
              : 'Search household head, code, phone, or village...'
          }
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* VIEW 1: PATIENTS LIST */}
      {activeMainTab === 'patients' && (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No patients found.</Text>
              <Text style={styles.emptySubText}>Tap "+ Register Patient" below to add.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const balance = Number(item.household_balance ?? (item as any).balance ?? 0);
            const hasLoan = balance > 0;

            return (
              <TouchableOpacity
                style={styles.card}
                activeOpacity={0.7}
                onPress={() => handleOpenPatientHistory(item)}
              >
                <View style={styles.cardRow}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.patientName}>{item.name}</Text>
                    <Text style={styles.codeBadge}>Patient ID: {item.patient_code}</Text>
                  </View>

                  <View style={styles.balanceBox}>
                    <Text style={styles.balanceLabel}>Khata Balance</Text>
                    <Text style={[styles.balanceValue, hasLoan ? styles.loanDue : styles.loanClear]}>
                      Rs. {balance.toLocaleString()}
                    </Text>
                  </View>
                </View>

                <View style={styles.divider} />

                <View style={styles.footerRow}>
                  <Text style={styles.detailText}>
                    Head: {item.household_head || (item as any).head_name || 'Self'} ({item.household_code || '---'})
                  </Text>
                  {item.relation_to_head && (
                    <Text style={styles.detailText}>Rel: {item.relation_to_head}</Text>
                  )}
                </View>

                {(item.village || item.phone) && (
                  <View style={styles.subFooterRow}>
                    {item.village ? <Text style={styles.subDetailText}>Area: {item.village}</Text> : <View />}
                    {item.phone ? <Text style={styles.subDetailText}>Phone: {item.phone}</Text> : <View />}
                  </View>
                )}
              </TouchableOpacity>
            );
          }}
        />
      )}

      {/* VIEW 2: HOUSEHOLDS (KHATA LEDGER) LIST WITH RECEIVE LOAN BUTTON */}
      {activeMainTab === 'households' && (
        <FlatList
          data={householdsList}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContainer}
          ListEmptyComponent={
            <View style={styles.emptyBox}>
              <Text style={styles.emptyText}>No households found.</Text>
              <Text style={styles.emptySubText}>Create a new household to start a khata ledger.</Text>
            </View>
          }
          renderItem={({ item }) => {
            const balance = Number(item.balance || 0);
            const hasLoan = balance > 0;

            return (
              <View style={styles.card}>
                <TouchableOpacity
                  activeOpacity={0.7}
                  onPress={() => handleOpenHouseholdHistory(item)}
                >
                  <View style={styles.cardRow}>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.patientName}>{item.head_name}</Text>
                      <Text style={styles.codeBadge}>Code: {item.household_code}</Text>
                    </View>

                    <View style={styles.balanceBox}>
                      <Text style={styles.balanceLabel}>Total Household Due</Text>
                      <Text style={[styles.balanceValue, hasLoan ? styles.loanDue : styles.loanClear]}>
                        Rs. {balance.toLocaleString()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                <View style={styles.divider} />

                {/* Bottom Row with Receive Loan Button */}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.detailText}>Area: {item.village || 'Local'}</Text>
                    {item.phone && <Text style={styles.subDetailText}>Phone: {item.phone}</Text>}
                  </View>

                  {/* 💵 Instant Loan Recovery Button */}
                  <TouchableOpacity
                    style={[
                      styles.receiveBtn,
                      { backgroundColor: hasLoan ? '#16a34a' : '#94a3b8' }
                    ]}
                    disabled={!hasLoan}
                    onPress={() => {
                      setSelectedHhForRecovery(item);
                      setRecoveryAmount('');
                      setRecoveryNotes('');
                      setRecoveryModal(true);
                    }}
                  >
                    <Text style={styles.receiveBtnText}>
                      {hasLoan ? '💵 Receive Loan' : '✓ All Clear'}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            );
          }}
        />
      )}

      {/* FAB Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => {
          resetForm();
          setModalVisible(true);
        }}
      >
        <Text style={styles.fabText}>+ Register Patient</Text>
      </TouchableOpacity>

      {/* QUICK LOAN RECOVERY MODAL */}
      <Modal visible={recoveryModal} transparent={true} animationType="slide">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Receive Loan Payment</Text>
            <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 12 }}>
              Khata: <Text style={{ fontWeight: 'bold', color: '#0f172a' }}>{selectedHhForRecovery?.head_name}</Text> ({selectedHhForRecovery?.household_code})
            </Text>

            <View style={{ backgroundColor: '#fef2f2', padding: 10, borderRadius: 8, marginBottom: 12, borderWidth: 1, borderColor: '#fecaca' }}>
              <Text style={{ fontSize: 12, color: '#991b1b' }}>Current Outstanding Due:</Text>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginTop: 2 }}>
                Rs. {Number(selectedHhForRecovery?.balance || 0).toLocaleString()}
              </Text>
            </View>

            <Text style={styles.inputLabel}>Cash Received Amount (Rs.) *</Text>
            <TextInput
              style={[styles.input, { fontSize: 16, fontWeight: 'bold', color: '#16a34a' }]}
              placeholder="e.g. 500"
              keyboardType="numeric"
              autoFocus
              value={recoveryAmount}
              onChangeText={setRecoveryAmount}
            />

            <Text style={styles.inputLabel}>Notes / Reference (اختیاری)</Text>
            <TextInput
              style={styles.input}
              placeholder="e.g. Paid by Son"
              value={recoveryNotes}
              onChangeText={setRecoveryNotes}
            />

            <View style={styles.actionButtons}>
              <TouchableOpacity
                style={[styles.btn, styles.cancelBtn]}
                onPress={() => {
                  setRecoveryModal(false);
                  setSelectedHhForRecovery(null);
                }}
              >
                <Text style={styles.cancelBtnText}>Cancel</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.btn, { backgroundColor: '#16a34a' }]}
                onPress={handleSaveLoanRecovery}
              >
                <Text style={styles.saveBtnText}>Save Payment</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Registration Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Patient Registration</Text>

              {/* Mode Selector Tabs */}
              <View style={styles.modeTabs}>
                <TouchableOpacity
                  style={[styles.modeTab, !isNewHousehold && styles.modeTabActive]}
                  onPress={() => setIsNewHousehold(false)}
                >
                  <Text style={[styles.modeTabText, !isNewHousehold && styles.modeTabTextActive]}>
                    Existing Household (پرانا گھرانہ)
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={[styles.modeTab, isNewHousehold && styles.modeTabActive]}
                  onPress={() => setIsNewHousehold(true)}
                >
                  <Text style={[styles.modeTabText, isNewHousehold && styles.modeTabTextActive]}>
                    New Household (نیا گھرانہ)
                  </Text>
                </TouchableOpacity>
              </View>

              {/* Patient Name Field */}
              <Text style={styles.inputLabel}>Patient Name * (مریض کا نام)</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Asad Ali"
                value={patientName}
                onChangeText={setPatientName}
              />

              {/* OPTION A: Existing Household Selection */}
              {!isNewHousehold ? (
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Select Household / Head (سرپرست منتخب کریں) *</Text>
                  {selectedHousehold ? (
                    <View style={styles.selectedHhBox}>
                      <View style={{ flex: 1 }}>
                        <Text style={styles.selectedHhTitle}>
                          {selectedHousehold.head_name} ({selectedHousehold.household_code})
                        </Text>
                        <Text style={styles.selectedHhSub}>
                          Current Khata Due: Rs. {Number(selectedHousehold.balance || 0).toLocaleString()}
                        </Text>
                      </View>
                      <TouchableOpacity onPress={() => setSelectedHousehold(null)}>
                        <Text style={styles.changeBtnText}>Change</Text>
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
                        <View style={styles.hhResultsList}>
                          {hhResults.map((h) => (
                            <TouchableOpacity
                              key={h.id}
                              style={styles.hhResultItem}
                              onPress={() => {
                                setSelectedHousehold(h);
                                setHhSearchText('');
                                setHhResults([]);
                              }}
                            >
                              <Text style={styles.hhItemTitle}>
                                {h.head_name} ({h.household_code})
                              </Text>
                              <Text style={styles.hhItemSub}>
                                Due: Rs. {Number(h.balance || 0).toLocaleString()}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      )}
                    </View>
                  )}

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Relation to Head (رشتہ)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Son, Wife, Daughter..."
                        value={relation}
                        onChangeText={setRelation}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Phone (Optional)</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="03001234567"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>
                  </View>
                </View>
              ) : (
                /* OPTION B: New Household Creation */
                <View style={{ marginBottom: 6 }}>
                  <Text style={styles.inputLabel}>Household Head Name (سربراہ کا نام)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Leave blank if Patient is self-head"
                    value={headName}
                    onChangeText={setHeadName}
                  />

                  <View style={styles.row}>
                    <View style={{ flex: 1, marginRight: 8 }}>
                      <Text style={styles.inputLabel}>Relation to Head</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="Self, Son, Wife..."
                        value={relation}
                        onChangeText={setRelation}
                      />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={styles.inputLabel}>Phone Number</Text>
                      <TextInput
                        style={styles.input}
                        placeholder="03001234567"
                        keyboardType="phone-pad"
                        value={phone}
                        onChangeText={setPhone}
                      />
                    </View>
                  </View>

                  <Text style={styles.inputLabel}>Village / Area</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Village Ali Murad"
                    value={village}
                    onChangeText={setVillage}
                  />

                  <Text style={styles.inputLabel}>Previous Paper Due (اوپننگ ادھار اگر پہلے سے ہے)</Text>
                  <TextInput
                    style={[styles.input, styles.loanInputHighlight]}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={openingBalance}
                    onChangeText={setOpeningBalance}
                  />

                  <Text style={styles.inputLabel}>Notes (نوٹس)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. Ledger # 2 Page 45"
                    value={notes}
                    onChangeText={setNotes}
                  />
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => {
                    resetForm();
                    setModalVisible(false);
                  }}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>

                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
                  <Text style={styles.saveBtnText}>Save Patient</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* History Modal (Used for both Patient & Household Details) */}
      <Modal visible={historyModal} animationType="slide">
        <View style={styles.historyModalContainer}>
          <Text style={styles.historyTitle}>{historyTitle}</Text>
          <Text style={styles.historySub}>{historySubtitle}</Text>

          <FlatList
            data={historyRecords}
            keyExtractor={(item, index) => `${item.transaction_id}-${index}`}
            ListEmptyComponent={
              <Text style={styles.emptyHistoryText}>
                No previous prescriptions or ledger entries recorded yet.
              </Text>
            }
            renderItem={({ item }) => (
              <View style={styles.historyItemRow}>
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Text style={styles.medTitle}>
                    {item.medicine_name} (x{item.quantity})
                  </Text>
                  <Text style={styles.medPrice}>
                    Rs. {item.total_price}
                  </Text>
                </View>
                {item.patient_name && (
                  <Text style={{ fontSize: 12, color: '#0284c7', marginTop: 2, fontWeight: '600' }}>
                    Taken by: {item.patient_name}
                  </Text>
                )}
                <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
                  <Text style={styles.historyDate}>Date: {item.date}</Text>
                  <Text style={[styles.historyPaymentType, { color: item.payment_type === 'loan' ? '#dc2626' : '#16a34a' }]}>
                    Payment: {item.payment_type}
                  </Text>
                </View>
              </View>
            )}
          />

          <TouchableOpacity
            style={styles.closeHistoryBtn}
            onPress={() => setHistoryModal(false)}
          >
            <Text style={styles.closeHistoryText}>Close History</Text>
          </TouchableOpacity>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  mainTabRow: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 12,
  },
  mainTabBtn: {
    flex: 1,
    paddingVertical: 9,
    alignItems: 'center',
    borderRadius: 6,
  },
  mainTabBtnActive: {
    backgroundColor: '#ffffff',
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 2,
  },
  mainTabBtnText: {
    fontSize: 13,
    fontWeight: 'bold',
    color: '#64748b',
  },
  mainTabBtnTextActive: {
    color: '#0284c7',
  },
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  listContainer: { padding: 16, paddingBottom: 90 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  codeBadge: { fontSize: 12, color: '#64748b', marginTop: 2 },
  balanceBox: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, color: '#64748b' },
  balanceValue: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  loanDue: { color: '#dc2626' },
  loanClear: { color: '#16a34a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  subFooterRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 6 },
  detailText: { fontSize: 12, color: '#475569', fontWeight: '500' },
  subDetailText: { fontSize: 12, color: '#64748b' },
  receiveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
  },
  receiveBtnText: {
    color: '#ffffff',
    fontWeight: 'bold',
    fontSize: 12,
  },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
    right: 20,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 22,
    borderRadius: 28,
    elevation: 6,
    shadowColor: '#0284c7',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 18,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 14 },
  modeTabs: {
    flexDirection: 'row',
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    padding: 3,
    marginBottom: 14,
  },
  modeTab: {
    flex: 1,
    paddingVertical: 8,
    alignItems: 'center',
    borderRadius: 6,
  },
  modeTabActive: {
    backgroundColor: '#ffffff',
    elevation: 1,
  },
  modeTabText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#64748b',
  },
  modeTabTextActive: {
    color: '#0284c7',
  },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 10,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  selectedHhBox: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#eff6ff',
    padding: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#bfdbfe',
    marginBottom: 10,
  },
  selectedHhTitle: { fontWeight: 'bold', color: '#1e40af', fontSize: 13 },
  selectedHhSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  changeBtnText: { color: '#dc2626', fontWeight: 'bold', fontSize: 12, paddingHorizontal: 4 },
  hhResultsList: {
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 8,
    backgroundColor: '#ffffff',
    maxHeight: 140,
    marginTop: -6,
    marginBottom: 10,
  },
  hhResultItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  hhItemTitle: { fontSize: 13, fontWeight: 'bold', color: '#0f172a' },
  hhItemSub: { fontSize: 12, color: '#dc2626' },
  loanInputHighlight: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  row: { flexDirection: 'row' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
  historyModalContainer: { flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#ffffff' },
  historyTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  historySub: { fontSize: 13, color: '#64748b', marginBottom: 16 },
  emptyHistoryText: { textAlign: 'center', marginTop: 40, color: '#94a3b8' },
  historyItemRow: { paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  medTitle: { fontSize: 14, fontWeight: 'bold', color: '#1e293b' },
  medPrice: { fontSize: 13, fontWeight: '600', color: '#0284c7' },
  historyDate: { fontSize: 11, color: '#64748b' },
  historyPaymentType: { fontSize: 11, fontWeight: '600' },
  closeHistoryBtn: { marginTop: 12, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' },
  closeHistoryText: { fontWeight: 'bold', color: '#475569' },
});