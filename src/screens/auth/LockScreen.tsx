// src/screens/auth/LockScreen.tsx
import React, { useState, useEffect } from 'react';
import { StyleSheet, Text, View, TextInput, TouchableOpacity, Alert } from 'react-native';
import { getDatabase } from '../../database';

export default function LockScreen({ onUnlock }: { onUnlock: () => void }) {
  const [pin, setPin] = useState('');
  const [savedPin, setSavedPin] = useState<string | null>(null);
  const [clinicName, setClinicName] = useState('Village Clinic System');

  useEffect(() => {
    async function checkSecurity() {
      const db = await getDatabase();
      await db.runAsync(`
        CREATE TABLE IF NOT EXISTS app_settings (
          key TEXT PRIMARY KEY,
          value TEXT
        );
      `);
      const pinRow = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_settings WHERE key = 'pin_code';`
      );
      const nameRow = await db.getFirstAsync<{ value: string }>(
        `SELECT value FROM app_settings WHERE key = 'clinic_name';`
      );

      if (nameRow && nameRow.value) setClinicName(nameRow.value);

      if (pinRow && pinRow.value && pinRow.value.trim().length === 4) {
        setSavedPin(pinRow.value.trim());
      } else {
        // اگر کوئی پن سیٹ نہیں ہے تو خود بخود انلاک کر دیں
        onUnlock();
      }
    }
    checkSecurity();
  }, [onUnlock]);

  const handleVerify = () => {
    if (pin === savedPin) {
      onUnlock();
    } else {
      Alert.alert('Incorrect PIN', 'Please enter the correct 4-digit PIN.');
      setPin('');
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.icon}>🔒</Text>
      <Text style={styles.clinicTitle}>{clinicName}</Text>
      <Text style={styles.subTitle}>Enter 4-Digit Doctor PIN to Unlock</Text>

      <TextInput
        style={styles.pinInput}
        placeholder="••••"
        placeholderTextColor="#64748b"
        keyboardType="numeric"
        maxLength={4}
        secureTextEntry
        value={pin}
        onChangeText={setPin}
        autoFocus
      />

      <TouchableOpacity style={styles.unlockBtn} onPress={handleVerify}>
        <Text style={styles.unlockText}>Unlock Clinic</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#0f172a', justifyContent: 'center', alignItems: 'center', padding: 24 },
  icon: { fontSize: 48, marginBottom: 12 },
  clinicTitle: { fontSize: 22, fontWeight: 'bold', color: '#ffffff', textAlign: 'center' },
  subTitle: { fontSize: 13, color: '#94a3b8', marginTop: 6, marginBottom: 28 },
  pinInput: {
    backgroundColor: '#1e293b',
    borderWidth: 1,
    borderColor: '#334155',
    borderRadius: 12,
    width: 160,
    height: 60,
    fontSize: 28,
    color: '#ffffff',
    textAlign: 'center',
    letterSpacing: 10,
    marginBottom: 20,
  },
  unlockBtn: { backgroundColor: '#0284c7', paddingVertical: 14, paddingHorizontal: 40, borderRadius: 10 },
  unlockText: { color: '#ffffff', fontWeight: 'bold', fontSize: 16 },
});