// src/screens/settings/SettingsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  TextInput,
  TouchableOpacity,
  Alert,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { getDatabase } from '../../database';
import { exportDatabaseBackup, importDatabaseBackup } from '../../database/backup';
import { insertSampleData, clearAllClinicData } from '../../database/seedData';

export default function SettingsScreen({ navigation }: any) {
  const [clinicName, setClinicName] = useState('');
  const [doctorName, setDoctorName] = useState('');
  const [pinCode, setPinCode] = useState('');

  useEffect(() => {
    async function loadSettings() {
      const db = await getDatabase();
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

  const handleSaveProfile = async () => {
    if (pinCode.trim() && pinCode.trim().length !== 4) {
      Alert.alert('Invalid PIN', 'Security PIN must be exactly 4 digits.');
      return;
    }

    try {
      const db = await getDatabase();
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('clinic_name', ?);`, [clinicName.trim()]);
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('doctor_name', ?);`, [doctorName.trim()]);
      await db.runAsync(`INSERT OR REPLACE INTO app_settings (key, value) VALUES ('pin_code', ?);`, [pinCode.trim()]);

      Alert.alert('Success', 'Clinic profile & security PIN updated successfully!');
    } catch (err) {
      Alert.alert('Error', 'Failed to save settings.');
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Management & Settings</Text>
      </View>

      <ScrollView style={styles.scrollBody} showsVerticalScrollIndicator={false}>
        {/* SECTION 1: Core Navigation Modules */}
        <Text style={styles.sectionLabel}>Operations & Modules</Text>

        {/* Finance Screen Button */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Finance')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#e0f2fe' }]}>
            <Ionicons name="wallet" size={24} color="#0284c7" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuCardTitle}>Finance & Daily Ledger</Text>
            <Text style={styles.menuCardSub}>Evening sales register, loan recoveries & profit</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Medicines & Stock Button */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Medicines')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#dcfce7' }]}>
            <Ionicons name="medkit" size={24} color="#16a34a" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuCardTitle}>Medicines & Inventory</Text>
            <Text style={styles.menuCardSub}>Add medicines, restock, pricing & expiry dates</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* Patients & Accounts Button */}
        <TouchableOpacity
          style={styles.menuCard}
          onPress={() => navigation.navigate('Patients')}
        >
          <View style={[styles.iconCircle, { backgroundColor: '#fef3c7' }]}>
            <Ionicons name="people" size={24} color="#d97706" />
          </View>
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.menuCardTitle}>Patients & Household Khata</Text>
            <Text style={styles.menuCardSub}>Patient directories, household ledgers & loan collection</Text>
          </View>
          <Ionicons name="chevron-forward" size={20} color="#94a3b8" />
        </TouchableOpacity>

        {/* SECTION 2: Demo Data & Clear Reset */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Demo Data & App Reset</Text>

        <View style={styles.cardBox}>
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: '#0284c7', marginBottom: 10 }]}
            onPress={() => {
              Alert.alert(
                'Load Demo Data',
                'Do you want to insert sample medicines, households, and sales to test the app?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Load Demo Data',
                    onPress: async () => {
                      try {
                        await insertSampleData();
                        Alert.alert('Success', 'Sample data loaded successfully! Check Dashboard, Medicines, and Finance.');
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to load demo data.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="sparkles-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.btnActionText}>Load Demo / Sample Data</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: '#dc2626' }]}
            onPress={() => {
              Alert.alert(
                'Reset / Wipe Data',
                'Warning: This will permanently delete all patients, medicines, invoices, and ledger records. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  {
                    text: 'Wipe Everything',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        await clearAllClinicData();
                        Alert.alert('Data Cleared', 'All clinic data has been wiped clean.');
                      } catch (err: any) {
                        Alert.alert('Error', err.message || 'Failed to clear data.');
                      }
                    },
                  },
                ]
              );
            }}
          >
            <Ionicons name="trash-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.btnActionText}>Clear / Wipe All Data</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 3: Backup & Restore */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Data Backup & Safety</Text>

        <View style={styles.cardBox}>
          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: '#0f172a', marginBottom: 10 }]}
            onPress={exportDatabaseBackup}
          >
            <Ionicons name="cloud-upload-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.btnActionText}>Export Full Backup (Share / WhatsApp)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.btnAction, { backgroundColor: '#475569' }]}
            onPress={() => {
              Alert.alert(
                'Restore Database',
                'Are you sure you want to replace existing records with a backup file?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Select File & Restore', onPress: () => importDatabaseBackup(() => {}) },
                ]
              );
            }}
          >
            <Ionicons name="cloud-download-outline" size={20} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.btnActionText}>Import / Restore Backup (JSON)</Text>
          </TouchableOpacity>
        </View>

        {/* SECTION 4: Clinic Profile & PIN Security */}
        <Text style={[styles.sectionLabel, { marginTop: 18 }]}>Clinic Profile & Doctor Lock</Text>

        <View style={styles.cardBox}>
          <Text style={styles.inputLabel}>Clinic Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Al-Shifa Community Clinic"
            value={clinicName}
            onChangeText={setClinicName}
          />

          <Text style={styles.inputLabel}>Doctor Name</Text>
          <TextInput
            style={styles.input}
            placeholder="e.g. Dr. Ahmed Khan"
            value={doctorName}
            onChangeText={setDoctorName}
          />

          <Text style={styles.inputLabel}>Security PIN (4 digits - leave blank to disable lock)</Text>
          <TextInput
            style={styles.input}
            placeholder="••••"
            keyboardType="numeric"
            maxLength={4}
            secureTextEntry
            value={pinCode}
            onChangeText={setPinCode}
          />

          <TouchableOpacity style={styles.saveBtn} onPress={handleSaveProfile}>
            <Text style={styles.saveBtnText}>Save Profile & Settings</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#0f172a' },
  scrollBody: { flex: 1, padding: 16 },
  sectionLabel: { fontSize: 13, fontWeight: 'bold', color: '#64748b', marginBottom: 8, textTransform: 'uppercase' },
  menuCard: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    elevation: 1,
  },
  iconCircle: { width: 44, height: 44, borderRadius: 22, alignItems: 'center', justifyContent: 'center' },
  menuCardTitle: { fontSize: 15, fontWeight: 'bold', color: '#1e293b' },
  menuCardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  cardBox: {
    backgroundColor: '#ffffff',
    borderRadius: 10,
    padding: 14,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginBottom: 10,
  },
  btnAction: {
    paddingVertical: 13,
    borderRadius: 8,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  btnActionText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4, marginTop: 8 },
  input: { borderWidth: 1, borderColor: '#cbd5e1', borderRadius: 8, padding: 10, fontSize: 14, color: '#0f172a' },
  saveBtn: { backgroundColor: '#0284c7', paddingVertical: 13, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold', fontSize: 14 },
});