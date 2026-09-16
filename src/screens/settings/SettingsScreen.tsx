// src/screens/settings/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert, ScrollView } from 'react-native';
import { getDatabase } from '../../database';

export default function SettingsScreen({ navigation }: any) {
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const db = await getDatabase();
      // ٹیبل بنائیں اگر موجود نہ ہو
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);

      const rows = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM app_settings;');
      rows.forEach((r) => {
        if (r.key === 'clinic_name') setClinicName(r.value);
        if (r.key === 'doctor_name') setDoctorName(r.value);
        if (r.key === 'pin_code') setPinCode(r.value);
      });
    }
    loadSettings();
  }, []);

  const handleSave = async () => {
    if (pinCode.trim() && pinCode.trim().length !== 4) {
      Alert.alert('Invalid PIN', 'Security PIN must be exactly 4 digits.');
      return;
    }

    try {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('clinic_name', ?);`, [clinicName.trim()]);
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('doctor_name', ?);`, [doctorName.trim()]);
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('pin_code', ?);`, [pinCode.trim()]);

      Alert.alert('Saved', 'Clinic Profile and PIN settings updated successfully!');
      navigation.navigate('Dashboard');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Clinic Profile & Security</Text>
      </View>

      <View style={styles.formBox}>
        <Text style={styles.label}>Clinic Name (کلینک کا نام)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Al-Shifa Community Clinic"
          value={clinicName}
          onChangeText={setClinicName}
        />

        <Text style={styles.label}>Doctor Name (ڈاکٹر کا نام)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. Dr. Ahmed Khan"
          value={doctorName}
          onChangeText={setDoctorName}
        />

        <Text style={styles.label}>App Security PIN (4 ہندسوں کا پاس کوڈ)</Text>
        <TextInput
          style={styles.input}
          placeholder="e.g. 1234 (خالی رکھنے پر لاک نہیں ہوگا)"
          keyboardType="numeric"
          maxLength={4}
          secureTextEntry
          value={pinCode}
          onChangeText={setPinCode}
        />

        <TouchableOpacity style={styles.saveBtn} onPress={handleSave}>
          <Text style={styles.saveBtnText}>Save Profile & Security Settings</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { padding: 16, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#e2e8f0' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  formBox: { padding: 16 },
  label: { fontSize: 13, fontWeight: '600', color: '#475569', marginBottom: 6, marginTop: 12 },
  input: { backgroundColor: '#ffffff', borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 12, fontSize: 14 },
  saveBtn: { backgroundColor: '#0284c7', padding: 14, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 15 },
});