// src/screens/households/PatientsScreen.tsx
import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  TextInput,
  FlatList,
  TouchableOpacity,
  Modal,
  StyleSheet,
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useHouseholdStore } from '../../store/useHouseholdStore';

export default function PatientsScreen() {
  const { patients, isLoading, searchTerm, setSearchTerm, fetchPatients, createHouseholdWithFirstPatient } =
    useHouseholdStore();

  const [modalVisible, setModalVisible] = useState(false);

  // نیا فارم اسٹیٹ
  const [headName, setHeadName] = useState('');
  const [village, setVillage] = useState('');
  const [phone, setPhone] = useState('');
  const [openingBalance, setOpeningBalance] = useState('');
  const [patientName, setPatientName] = useState('');
  const [notes, setNotes] = useState('');

  useEffect(() => {
    fetchPatients();
  }, []);

  const handleSave = async () => {
    if (!headName.trim()) {
      Alert.alert('ضروری معلومات', 'خاندان کے سربراہ کا نام درج کرنا لازمی ہے۔');
      return;
    }

    try {
      await createHouseholdWithFirstPatient(
        {
          head_name: headName.trim(),
          village: village.trim() || undefined,
          phone: phone.trim() || undefined,
          opening_balance: openingBalance ? parseFloat(openingBalance) : 0,
          notes: notes.trim() || undefined,
        },
        patientName.trim() || undefined
      );

      Alert.alert('کامیابی', 'نیا کھاتہ اور مریض کامیابی سے درج ہو گیا۔');
      // فارم ری سیٹ کریں
      setHeadName('');
      setVillage('');
      setPhone('');
      setOpeningBalance('');
      setPatientName('');
      setNotes('');
      setModalVisible(false);
    } catch (error) {
      console.error(error);
      Alert.alert('خرابی', 'ریکارڈ محفوظ کرنے میں خرابی پیش آئی۔');
    }
  };

  return (
    <View style={styles.container}>
      {/* ہیڈر اور سرچ */}
      <View style={styles.headerArea}>
        <Text style={styles.pageTitle}>مریض اور کھاتے (Patients & Accounts)</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="مریض کا نام، کوڈ یا فون نمبر تلاش کریں..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* مریضوں کی لسٹ */}
      {isLoading && patients.length === 0 ? (
        <ActivityIndicator size="large" color="#0284c7" style={{ marginTop: 40 }} />
      ) : (
        <FlatList
          data={patients}
          keyExtractor={(item) => item.id.toString()}
          contentContainerStyle={styles.listContent}
          ListEmptyComponent={
            <View style={styles.emptyContainer}>
              <Text style={styles.emptyText}>کوئی مریض یا کھاتہ موجود نہیں ہے۔</Text>
              <Text style={styles.emptySubText}>نیا کھاتہ درج کرنے کے لیے نیچے والا بٹن دبائیں۔</Text>
            </View>
          }
          renderItem={({ item }) => (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View>
                  <Text style={styles.patientName}>{item.name}</Text>
                  <Text style={styles.badgeText}>کوڈ: {item.patient_code}</Text>
                </View>
                <View style={styles.balanceContainer}>
                  <Text style={styles.balanceLabel}>کل ادھار (باقی)</Text>
                  <Text
                    style={[
                      styles.balanceAmount,
                      item.household_balance > 0 ? styles.redText : styles.greenText,
                    ]}
                  >
                    Rs. {item.household_balance.toLocaleString()}
                  </Text>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.cardFooter}>
                <Text style={styles.infoText}>سربراہ: {item.household_head}</Text>
                {item.village && <Text style={styles.infoText}>گاؤں: {item.village}</Text>}
                {item.phone && <Text style={styles.infoText}>فون: {item.phone}</Text>}
              </View>
            </View>
          )}
        />
      )}

      {/* نیا کھاتہ / مریض ایڈ کرنے کا بٹن */}
      <TouchableOpacity style={styles.fabButton} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ نیا کھاتہ / مریض</Text>
      </TouchableOpacity>

      {/* فارم ماڈل */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          style={styles.modalOverlay}
        >
          <View style={styles.modalContent}>
            <ScrollView showsVerticalScrollIndicator={false}>
              <Text style={styles.modalTitle}>نیا کھاتہ و مریض درج کریں</Text>

              <Text style={styles.label}>خاندان کا سربراہ (Head Name) *</Text>
              <TextInput
                style={styles.input}
                placeholder="مثلاً: محمد علی"
                value={headName}
                onChangeText={setHeadName}
              />

              <Text style={styles.label}>مریض کا نام (اگر سربراہ کے علاوہ کوئی اور ہے)</Text>
              <TextInput
                style={styles.input}
                placeholder="خالی چھوڑنے پر سربراہ خود مریض بن جائے گا"
                value={patientName}
                onChangeText={setPatientName}
              />

              <View style={styles.rowInputs}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.label}>گاؤں / علاقہ</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="مثلاً: گوٹھ خان محمد"
                    value={village}
                    onChangeText={setVillage}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.label}>فون نمبر</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="03001234567"
                    keyboardType="phone-pad"
                    value={phone}
                    onChangeText={setPhone}
                  />
                </View>
              </View>

              {/* طریقہ 2 کا اطلاق: پرانا کاغذی ادھار درج کرنا */}
              <Text style={styles.label}>کاغذی رجسٹر کا پرانا ادھار (Opening Balance)</Text>
              <TextInput
                style={[styles.input, styles.loanInput]}
                placeholder="0"
                keyboardType="numeric"
                value={openingBalance}
                onChangeText={setOpeningBalance}
              />

              <Text style={styles.label}>نوٹس / یاد دہانی</Text>
              <TextInput
                style={styles.input}
                placeholder="مثلاً: پرانے رجسٹر نمبر 2 کا بقیہ"
                value={notes}
                onChangeText={setNotes}
              />

              <View style={styles.modalActions}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => setModalVisible(false)}
                >
                  <Text style={styles.btnTextCancel}>منسوخ</Text>
                </TouchableOpacity>
                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSave}>
                  <Text style={styles.btnTextSave}>محفوظ کریں</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f1f5f9' },
  headerArea: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  pageTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a', marginBottom: 10, textAlign: 'right' },
  searchInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    textAlign: 'right',
  },
  listContent: { padding: 16, paddingBottom: 80 },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    elevation: 2,
    shadowColor: '#000',
    shadowOpacity: 0.05,
    shadowRadius: 4,
  },
  cardRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  patientName: { fontSize: 17, fontWeight: 'bold', color: '#1e293b' },
  badgeText: { fontSize: 12, color: '#64748b', marginTop: 2 },
  balanceContainer: { alignItems: 'flex-end' },
  balanceLabel: { fontSize: 11, color: '#64748b' },
  balanceAmount: { fontSize: 16, fontWeight: 'bold', marginTop: 2 },
  redText: { color: '#dc2626' },
  greenText: { color: '#16a34a' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  cardFooter: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  infoText: { fontSize: 12, color: '#475569' },
  emptyContainer: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 13, color: '#94a3b8', marginTop: 6 },
  fabButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#0284c7',
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderRadius: 30,
    elevation: 4,
  },
  fabText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    padding: 16,
  },
  modalContent: {
    backgroundColor: '#ffffff',
    borderRadius: 14,
    padding: 20,
    maxHeight: '85%',
  },
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 16, textAlign: 'center' },
  label: { fontSize: 13, fontWeight: '600', color: '#334155', marginBottom: 4, textAlign: 'right' },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
    textAlign: 'right',
  },
  loanInput: { borderColor: '#fca5a5', backgroundColor: '#fff5f5' },
  rowInputs: { flexDirection: 'row' },
  modalActions: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 12 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#0284c7' },
  btnTextCancel: { color: '#475569', fontWeight: 'bold' },
  btnTextSave: { color: '#ffffff', fontWeight: 'bold' },
});