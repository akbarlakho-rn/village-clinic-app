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
import { PatientWithHousehold } from '../../types/household';
import { searchPatients, createHouseholdWithPatient, getPatientHistory, PatientHistoryRecord } from '../../database/queries/households';

export default function PatientsScreen() {
  const [patients, setPatients] = useState<PatientWithHousehold[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);
  const [historyModal, setHistoryModal] = useState(false);
const [selectedPatientForHistory, setSelectedPatientForHistory] = useState<PatientWithHousehold | null>(null);
const [patientHistory, setPatientHistory] = useState<PatientHistoryRecord[]>([]);

const handleOpenHistory = async (patient: PatientWithHousehold) => {
  setSelectedPatientForHistory(patient);
  const records = await getPatientHistory(patient.id);
  setPatientHistory(records);
  setHistoryModal(true);
};

  // Form states
  const [headName, setHeadName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [patientName, setPatientName] = useState('');
  const [relation, setRelation] = useState('');
  const [notes, setNotes] = useState('');

  const loadPatients = useCallback(async () => {
    try {
      const data = await searchPatients(searchTerm);
      setPatients(data);
    } catch (error) {
      console.error('Failed to load patients:', error);
    }
  }, [searchTerm]);

  useEffect(() => {
    loadPatients();
  }, [loadPatients]);

  const resetForm = () => {
    setHeadName('');
    setVillage('');
    setPhone('');
    setOpeningBalance('');
    setPatientName('');
    setRelation('');
    setNotes('');
  };

  const handleSave = async () => {
    if (!headName.trim()) {
      Alert.alert('Validation Error', 'Household head name is required.');
      return;
    }

    const opBal = parseFloat(openingBalance) || 0;

    try {
      await createHouseholdWithPatient(
        {
          head_name: headName.trim(),
          village: village.trim() || undefined,
          phone: phone.trim() || undefined,
          opening_balance: opBal,
          notes: notes.trim() || undefined,
        },
        patientName.trim() || undefined,
        relation.trim() || undefined
      );

      resetForm();
      setModalVisible(false);
      loadPatients();
      Alert.alert('Success', 'Household & Patient registered successfully.');
    } catch (error) {
      console.error('Failed to create household/patient:', error);
      Alert.alert('Error', 'Failed to save record.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header & Search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Patients & Accounts</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search patient, code, phone, or head name..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* Patients List */}
      <FlatList
        data={patients}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No patients registered yet.</Text>
            <Text style={styles.emptySubText}>Tap "+ New Household / Patient" to add.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const hasLoan = item.household_balance > 0;
          return (
            <View style={styles.card}>
              <TouchableOpacity style={styles.card} onPress={() => handleOpenHistory(item)}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.codeBadge}>Patient ID: {item.patient_code}</Text>
                </View>

                <View style={styles.balanceBox}>
                  <Text style={styles.balanceLabel}>Account Due</Text>
                  <Text style={[styles.balanceValue, hasLoan ? styles.loanDue : styles.loanClear]}>
                    Rs. {item.household_balance.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.footerRow}>
                <Text style={styles.detailText}>Head: {item.household_head} ({item.household_code})</Text>
                {item.relation_to_head && (
                  <Text style={styles.detailText}>Rel: {item.relation_to_head}</Text>
                )}
              </View>
              </TouchableOpacity>

              {(item.village || item.phone) && (
                <View style={styles.subFooterRow}>
                  {item.village && <Text style={styles.subDetailText}>Village: {item.village}</Text>}
                  {item.phone && <Text style={styles.subDetailText}>Phone: {item.phone}</Text>}
                </View>
              )}
            </View>
          );
        }}
      />

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ New Household / Patient</Text>
      </TouchableOpacity>

      {/* Registration Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>New Household & Patient</Text>

              <Text style={styles.inputLabel}>Household Head Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Ghulam Rasool"
                value={headName}
                onChangeText={setHeadName}
              />

              <Text style={styles.inputLabel}>Patient Name (Optional)</Text>
              <TextInput
                style={styles.input}
                placeholder="Leave blank if Head is the patient"
                value={patientName}
                onChangeText={setPatientName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Relation to Head</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="Son, Wife, etc."
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

              {/* Opening Balance Field (Previous Paper Ledger) */}
              <Text style={styles.inputLabel}>Previous Paper Due (Opening Balance)</Text>
              <TextInput
                style={[styles.input, styles.loanInputHighlight]}
                placeholder="0.00"
                keyboardType="numeric"
                value={openingBalance}
                onChangeText={setOpeningBalance}
              />

              <Text style={styles.inputLabel}>Notes</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Register # 2 page 45"
                value={notes}
                onChangeText={setNotes}
              />

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
                  <Text style={styles.saveBtnText}>Save Record</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
      {/* Patient Prescription History Modal */}
<Modal visible={historyModal} animationType="slide">
  <View style={{ flex: 1, padding: 16, paddingTop: 40, backgroundColor: '#ffffff' }}>
    <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0f172a' }}>
      Prescription History: {selectedPatientForHistory?.name}
    </Text>
    <Text style={{ fontSize: 13, color: '#64748b', marginBottom: 16 }}>
      Head: {selectedPatientForHistory?.household_head} | ID: {selectedPatientForHistory?.patient_code}
    </Text>

    <FlatList
      data={patientHistory}
      keyExtractor={(item, index) => `${item.transaction_id}-${index}`}
      ListEmptyComponent={
        <Text style={{ textAlign: 'center', marginTop: 40, color: '#94a3b8' }}>
          No previous prescriptions or sales recorded.
        </Text>
      }
      renderItem={({ item }) => (
        <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
            <Text style={{ fontSize: 14, fontWeight: 'bold', color: '#1e293b' }}>
              {item.medicine_name} (x{item.quantity})
            </Text>
            <Text style={{ fontSize: 13, fontWeight: '600', color: '#0284c7' }}>
              Rs. {item.total_price}
            </Text>
          </View>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginTop: 4 }}>
            <Text style={{ fontSize: 11, color: '#64748b' }}>Date: {item.date}</Text>
            <Text style={{ fontSize: 11, color: '#64748b', textTransform: 'capitalize' }}>
              Payment: {item.payment_type}
            </Text>
          </View>
        </View>
      )}
    />

    <TouchableOpacity
      style={{ marginTop: 12, padding: 12, backgroundColor: '#e2e8f0', borderRadius: 8, alignItems: 'center' }}
      onPress={() => setHistoryModal(false)}
    >
      <Text style={{ fontWeight: 'bold', color: '#475569' }}>Close History</Text>
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
  searchInput: {
    backgroundColor: '#f1f5f9',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: '#0f172a',
  },
  listContainer: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 3,
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
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 28,
    elevation: 4,
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
    padding: 20,
    maxHeight: '90%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16 },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
    color: '#0f172a',
  },
  loanInputHighlight: {
    borderColor: '#fca5a5',
    backgroundColor: '#fff5f5',
  },
  row: { flexDirection: 'row' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
});