// src/screens/home/HomeScreen.tsx
import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ScrollView,
  TouchableOpacity,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

import { getDatabase } from '../../database';
import { getStockAlerts } from '../../database/queries/medicines';
import { getDailyFinanceSummary, FinanceSummary } from '../../database/queries/finance';
import { exportDatabaseBackup, importDatabaseBackup } from '../../database/backup';
import { Medicine } from '../../types/medicine';

export default function HomeScreen({ navigation }: any) {
  const [refreshing, setRefreshing] = useState(false);
  const [clinicName, setClinicName] = useState('Al-Shifa Community Clinic');
  const [doctorName, setDoctorName] = useState('Dr. In-Charge');

  const [finance, setFinance] = useState<FinanceSummary>({
    todayCashSales: 0,
    todayNewLoan: 0,
    todayLoanRecoveries: 0,
    todayExpenses: 0,
    netCashInHand: 0,
    totalMarketLoan: 0,
  });

  const [alerts, setAlerts] = useState<{
    outOfStock: Medicine[];
    lowStock: Medicine[];
    expired: Medicine[];
    expiringSoon: Medicine[];
  }>({
    outOfStock: [],
    lowStock: [],
    expired: [],
    expiringSoon: [],
  });

  const loadDashboardData = useCallback(async () => {
    try {
      const db = await getDatabase();
      const settings = await db.getAllAsync<{ key: string; value: string }>('SELECT * FROM app_settings;');
      settings.forEach((r) => {
        if (r.key === 'clinic_name' && r.value.trim()) setClinicName(r.value.trim());
        if (r.key === 'doctor_name' && r.value.trim()) setDoctorName(r.value.trim());
      });

      const [financeData, stockAlerts] = await Promise.all([
        getDailyFinanceSummary(),
        getStockAlerts(30),
      ]);
      setFinance(financeData);
      setAlerts(stockAlerts);
    } catch (error) {
      console.error('Failed to load dashboard:', error);
    }
  }, []);

  useFocusEffect(
    useCallback(() => {
      loadDashboardData();
    }, [loadDashboardData])
  );

  const onRefresh = async () => {
    setRefreshing(true);
    await loadDashboardData();
    setRefreshing(false);
  };

  const totalCriticalAlerts = alerts.outOfStock.length + alerts.expired.length;

  return (
    <SafeAreaView style={styles.safeArea} edges={['top']}>
      {/* Top Header with Doctor & Clinic Name */}
      <View style={styles.header}>
        <View style={{ flex: 1 }}>
          <Text style={styles.clinicTitle}>{clinicName}</Text>
          <View style={styles.doctorBadge}>
            <Ionicons name="person-circle-outline" size={16} color="#0284c7" />
            <Text style={styles.doctorName}>{doctorName}</Text>
          </View>
        </View>
        <TouchableOpacity
          style={styles.settingsIconBtn}
          onPress={() => navigation.navigate('Settings')}
        >
          <Ionicons name="settings-sharp" size={22} color="#475569" />
        </TouchableOpacity>
      </View>

      <ScrollView
        style={styles.container}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Quick Action Button */}
        <View style={styles.quickActionBox}>
          <TouchableOpacity
            style={styles.newSaleBtn}
            onPress={() => navigation.navigate('New Sale')}
          >
            <Ionicons name="receipt-outline" size={22} color="#ffffff" style={{ marginRight: 8 }} />
            <Text style={styles.newSaleBtnText}>+ Start New Sale (پرچی کاٹیں)</Text>
          </TouchableOpacity>
        </View>

        {/* Financial Snapshot */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Today's Snapshot</Text>
          <View style={styles.financeRow}>
            <View style={[styles.financeCard, { backgroundColor: '#0284c7' }]}>
              <Text style={styles.fCardLabelWhite}>Cash In Hand</Text>
              <Text style={styles.fCardValueWhite}>
                Rs. {finance.netCashInHand.toLocaleString()}
              </Text>
            </View>

            <View style={[styles.financeCard, { backgroundColor: '#ffffff', borderColor: '#e2e8f0', borderWidth: 1 }]}>
              <Text style={styles.fCardLabel}>Today New Loan</Text>
              <Text style={[styles.fCardValue, { color: '#dc2626' }]}>
                Rs. {finance.todayNewLoan.toLocaleString()}
              </Text>
            </View>
          </View>
        </View>

        {/* Clinic Modules Grid */}
        <View style={styles.section}>
          <Text style={styles.sectionHeading}>Clinic Modules</Text>
          <View style={styles.moduleRow}>
            <TouchableOpacity
              style={styles.moduleCard}
              onPress={() => navigation.navigate('Patients')}
            >
              <Ionicons name="people" size={32} color="#0284c7" />
              <Text style={styles.moduleCardTitle}>Patients & Khata</Text>
              <Text style={styles.moduleCardSub}>لیجر اور مریض</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.moduleCard}
              onPress={() => navigation.navigate('Medicines')}
            >
              <Ionicons name="medkit" size={32} color="#16a34a" />
              <Text style={styles.moduleCardTitle}>Medicines & Stock</Text>
              <Text style={styles.moduleCardSub}>دواؤں کا اسٹاک</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Stock Alerts */}
        <View style={styles.section}>
          <View style={styles.alertHeaderRow}>
            <Text style={styles.sectionHeading}>Stock & Expiry Alerts</Text>
            {totalCriticalAlerts > 0 && (
              <View style={styles.badgeCritical}>
                <Text style={styles.badgeCriticalText}>{totalCriticalAlerts} Critical</Text>
              </View>
            )}
          </View>

          {alerts.outOfStock.length > 0 && (
            <View style={styles.alertGroup}>
              <Text style={[styles.groupTitle, { color: '#dc2626' }]}>
                ⚠️ Out of Stock ({alerts.outOfStock.length})
              </Text>
              {alerts.outOfStock.map((med) => (
                <View key={med.id} style={styles.alertItem}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.outOfStockBadge}>0 Left</Text>
                </View>
              ))}
            </View>
          )}

          {alerts.lowStock.length > 0 && (
            <View style={styles.alertGroup}>
              <Text style={[styles.groupTitle, { color: '#d97706' }]}>
                📉 Low Stock (Below Limit) ({alerts.lowStock.length})
              </Text>
              {alerts.lowStock.map((med) => (
                <View key={med.id} style={styles.alertItem}>
                  <Text style={styles.medName}>{med.name}</Text>
                  <Text style={styles.lowStockBadge}>{med.stock} left</Text>
                </View>
              ))}
            </View>
          )}

          {alerts.outOfStock.length === 0 &&
            alerts.lowStock.length === 0 &&
            alerts.expired.length === 0 &&
            alerts.expiringSoon.length === 0 && (
              <View style={styles.healthyBox}>
                <Ionicons name="checkmark-circle" size={24} color="#16a34a" style={{ marginBottom: 4 }} />
                <Text style={styles.healthyText}>All Medicines Stock & Expiry OK</Text>
              </View>
            )}
        </View>

        {/* Backup & Restore Action Buttons */}
        <View style={styles.backupSection}>
          <TouchableOpacity style={styles.backupBtn} onPress={exportDatabaseBackup}>
            <Ionicons name="cloud-upload-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.backupBtnText}>Export Full Backup (Share / Save)</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.restoreBtn}
            onPress={() => {
              Alert.alert(
                'Restore Backup',
                'Restoring will replace the current data with the backup file data. Are you sure?',
                [
                  { text: 'Cancel', style: 'cancel' },
                  { text: 'Select File & Restore', onPress: () => importDatabaseBackup(loadDashboardData) },
                ]
              );
            }}
          >
            <Ionicons name="cloud-download-outline" size={18} color="#ffffff" style={{ marginRight: 6 }} />
            <Text style={styles.backupBtnText}>Import / Restore Backup (JSON)</Text>
          </TouchableOpacity>
        </View>

        <View style={{ height: 20 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#ffffff' },
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  clinicTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a' },
  doctorBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
  doctorName: { fontSize: 13, fontWeight: '600', color: '#0284c7' },
  settingsIconBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f1f5f9',
    alignItems: 'center',
    justifyContent: 'center',
  },
  quickActionBox: { padding: 16 },
  newSaleBtn: {
    backgroundColor: '#16a34a',
    paddingVertical: 14,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
  },
  newSaleBtnText: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  section: { paddingHorizontal: 16, marginBottom: 18 },
  sectionHeading: { fontSize: 15, fontWeight: 'bold', color: '#1e293b', marginBottom: 10 },
  financeRow: { flexDirection: 'row', gap: 12 },
  financeCard: { flex: 1, padding: 14, borderRadius: 10, elevation: 1 },
  fCardLabelWhite: { color: '#e0f2fe', fontSize: 12, fontWeight: '600' },
  fCardValueWhite: { color: '#ffffff', fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  fCardLabel: { color: '#64748b', fontSize: 12, fontWeight: '600' },
  fCardValue: { fontSize: 20, fontWeight: 'bold', marginTop: 4 },
  moduleRow: { flexDirection: 'row', gap: 12 },
  moduleCard: {
    flex: 1,
    backgroundColor: '#ffffff',
    paddingVertical: 18,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    alignItems: 'center',
  },
  moduleCardTitle: { fontWeight: 'bold', color: '#0f172a', fontSize: 14, marginTop: 6 },
  moduleCardSub: { fontSize: 11, color: '#64748b', marginTop: 2 },
  alertHeaderRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  badgeCritical: { backgroundColor: '#fee2e2', paddingHorizontal: 8, paddingVertical: 4, borderRadius: 6 },
  badgeCriticalText: { color: '#dc2626', fontSize: 11, fontWeight: 'bold' },
  alertGroup: { backgroundColor: '#ffffff', borderRadius: 10, padding: 12, marginBottom: 10, borderWidth: 1, borderColor: '#e2e8f0' },
  groupTitle: { fontSize: 13, fontWeight: 'bold', marginBottom: 8 },
  alertItem: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  medName: { fontSize: 13, fontWeight: '500', color: '#1e293b' },
  outOfStockBadge: { backgroundColor: '#fee2e2', color: '#dc2626', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 11, fontWeight: 'bold' },
  lowStockBadge: { backgroundColor: '#fef3c7', color: '#d97706', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, fontSize: 11, fontWeight: 'bold' },
  healthyBox: { backgroundColor: '#ffffff', padding: 18, borderRadius: 10, alignItems: 'center', borderWidth: 1, borderColor: '#e2e8f0' },
  healthyText: { fontSize: 14, fontWeight: '600', color: '#16a34a' },
  backupSection: { paddingHorizontal: 16, gap: 10 },
  backupBtn: { backgroundColor: '#0f172a', paddingVertical: 11, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  restoreBtn: { backgroundColor: '#475569', paddingVertical: 11, borderRadius: 8, flexDirection: 'row', alignItems: 'center', justifyContent: 'center' },
  backupBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' },
});