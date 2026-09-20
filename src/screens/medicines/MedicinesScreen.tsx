// src/screens/medicines/MedicinesScreen.tsx
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
import { Medicine } from '../../types/medicine';
import { getMedicines, addMedicine, restockMedicine } from '../../database/queries/medicines';
import { useFocusEffect } from '@react-navigation/native';

export default function MedicinesScreen() {
  const [medicines, setMedicines] = useState<Medicine[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [modalVisible, setModalVisible] = useState(false);

  // New Medicine Form states
  const [name, setName] = useState('');
  const [genericName, setGenericName] = useState('');
  const [unit, setUnit] = useState('tablet');
  const [purchasePrice, setPurchasePrice] = useState('');
  const [sellingPrice, setSellingPrice] = useState('');
  const [stock, setStock] = useState('');
  const [lowStockLimit, setLowStockLimit] = useState('10');
  const [expiryDate, setExpiryDate] = useState(''); // Format: YYYY-MM-DD

  // Smart Restock Modal States
  const [restockModal, setRestockModal] = useState(false);
  const [selectedMedForRestock, setSelectedMedForRestock] = useState<Medicine | null>(null);
  const [restockQty, setRestockQty] = useState('');
  const [restockBuyPrice, setRestockBuyPrice] = useState('');
  const [restockSalePrice, setRestockSalePrice] = useState('');
  const [restockExpiryDate, setRestockExpiryDate] = useState('');

  const loadMedicines = useCallback(async () => {
    try {
      const data = await getMedicines(searchTerm);
      setMedicines(data);
    } catch (error) {
      console.error('Failed to load medicines:', error);
    }
  }, [searchTerm]);

useFocusEffect(
  useCallback(() => {
    loadMedicines(); // جب بھی یوزر اس ٹیب/اسکرین پر آئے گا، تازہ ڈیٹا خود بخود لوڈ ہوگا
  }, [loadMedicines])
);

  const resetForm = () => {
    setName('');
    setGenericName('');
    setUnit('tablet');
    setPurchasePrice('');
    setSellingPrice('');
    setStock('');
    setLowStockLimit('10');
    setExpiryDate('');
  };

  const handleSaveMedicine = async () => {
    if (!name.trim()) {
      Alert.alert('Validation Error', 'Medicine name is required.');
      return;
    }

    const pPrice = parseFloat(purchasePrice) || 0;
    const sPrice = parseFloat(sellingPrice) || 0;
    const initialStock = parseInt(stock, 10) || 0;
    const limit = parseInt(lowStockLimit, 10) || 10;

    try {
      await addMedicine({
        name: name.trim(),
        generic_name: genericName.trim() || null,
        unit: unit.trim() || 'tablet',
        purchase_price: pPrice,
        selling_price: sPrice,
        stock: initialStock,
        low_stock_limit: limit,
        expiry_date: expiryDate.trim() || null,
      });

      resetForm();
      setModalVisible(false);
      loadMedicines();
      Alert.alert('Success', 'Medicine added successfully.');
    } catch (error) {
      console.error('Failed to add medicine:', error);
      Alert.alert('Error', 'Failed to save medicine.');
    }
  };

  // Open Restock Modal with existing values pre-filled
  const openRestockModal = (med: Medicine) => {
    setSelectedMedForRestock(med);
    setRestockQty('');
    setRestockBuyPrice(med.purchase_price ? med.purchase_price.toString() : '');
    setRestockSalePrice(med.selling_price ? med.selling_price.toString() : '');
    setRestockExpiryDate(med.expiry_date || '');
    setRestockModal(true);
  };

  // Save Restock with Qty, New Buy Price, New Sale Price & New Expiry
  const handleSaveRestock = async () => {
    if (!selectedMedForRestock) return;
    const qty = parseInt(restockQty, 10);
    if (!qty || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity to add.');
      return;
    }

    const pPrice = parseFloat(restockBuyPrice) || selectedMedForRestock.purchase_price;
    const sPrice = parseFloat(restockSalePrice) || selectedMedForRestock.selling_price;

    try {
      await restockMedicine(
        selectedMedForRestock.id,
        qty,
        pPrice,
        sPrice,
        restockExpiryDate.trim() || undefined
      );

      setRestockModal(false);
      loadMedicines();
      Alert.alert(
        'Stock Updated',
        `Added ${qty} items to ${selectedMedForRestock.name}.\nNew Sale Price: Rs. ${sPrice}`
      );
    } catch (err) {
      console.error(err);
      Alert.alert('Error', 'Failed to update stock.');
    }
  };

  return (
    <View style={styles.container}>
      {/* Top Header & Search */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Medicines & Stock</Text>
        <TextInput
          style={styles.searchInput}
          placeholder="Search medicine or generic name..."
          placeholderTextColor="#94a3b8"
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
      </View>

      {/* List */}
      <FlatList
        data={medicines}
        keyExtractor={(item) => item.id.toString()}
        contentContainerStyle={styles.listContainer}
        ListEmptyComponent={
          <View style={styles.emptyBox}>
            <Text style={styles.emptyText}>No medicines found.</Text>
            <Text style={styles.emptySubText}>Tap "+ Add Medicine" to register new stock.</Text>
          </View>
        }
        renderItem={({ item }) => {
          const isLowStock = item.stock <= item.low_stock_limit;
          return (
            <View style={styles.card}>
              <View style={styles.cardRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.medicineName}>{item.name}</Text>
                  {item.generic_name ? (
                    <Text style={styles.genericText}>{item.generic_name}</Text>
                  ) : null}
                  <Text style={styles.unitBadge}>{item.unit?.toUpperCase() || 'UNIT'}</Text>
                </View>

                <View style={styles.stockBox}>
                  <Text style={[styles.stockValue, isLowStock ? styles.lowStock : styles.normalStock]}>
                    {item.stock}
                  </Text>
                  <Text style={styles.stockLabel}>Available</Text>
                  <TouchableOpacity
                    style={styles.restockBtn}
                    onPress={() => openRestockModal(item)}
                  >
                    <Text style={styles.restockBtnText}>+ Restock</Text>
                  </TouchableOpacity>
                </View>
              </View>

              <View style={styles.divider} />

              <View style={styles.footerRow}>
                <Text style={styles.priceText}>
                  Buy: Rs. {item.purchase_price} | Sale: Rs. {item.selling_price}
                </Text>
                {item.expiry_date ? (
                  <Text style={styles.expiryText}>Exp: {item.expiry_date}</Text>
                ) : null}
              </View>
            </View>
          );
        }}
      />

      {/* FAB Button */}
      <TouchableOpacity style={styles.fab} onPress={() => setModalVisible(true)}>
        <Text style={styles.fabText}>+ Add Medicine</Text>
      </TouchableOpacity>

      {/* Add New Medicine Modal */}
      <Modal visible={modalVisible} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Add New Medicine</Text>

              <Text style={styles.inputLabel}>Medicine Name *</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Panadol 500mg"
                value={name}
                onChangeText={setName}
              />

              <Text style={styles.inputLabel}>Generic Name</Text>
              <TextInput
                style={styles.input}
                placeholder="e.g. Paracetamol"
                value={genericName}
                onChangeText={setGenericName}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Unit</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="tablet, syrup, injection"
                    value={unit}
                    onChangeText={setUnit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Initial Stock</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0"
                    keyboardType="numeric"
                    value={stock}
                    onChangeText={setStock}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Purchase Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={purchasePrice}
                    onChangeText={setPurchasePrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Selling Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="0.00"
                    keyboardType="numeric"
                    value={sellingPrice}
                    onChangeText={setSellingPrice}
                  />
                </View>
              </View>

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>Low Stock Alert</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="10"
                    keyboardType="numeric"
                    value={lowStockLimit}
                    onChangeText={setLowStockLimit}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>Expiry (YYYY-MM-DD)</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="2027-12-31"
                    value={expiryDate}
                    onChangeText={setExpiryDate}
                  />
                </View>
              </View>

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

                <TouchableOpacity style={[styles.btn, styles.saveBtn]} onPress={handleSaveMedicine}>
                  <Text style={styles.saveBtnText}>Save Medicine</Text>
                </TouchableOpacity>
              </View>
            </ScrollView>
          </View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Smart Restock Modal (Qty, Purchase Price, Sale Price, Expiry) */}
      <Modal visible={restockModal} animationType="slide" transparent={true}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          style={styles.modalOverlay}
        >
          <View style={styles.modalCard}>
            <ScrollView showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
              <Text style={styles.modalTitle}>Restock: {selectedMedForRestock?.name}</Text>
              
              <View style={styles.currentStockBox}>
                <Text style={styles.currentStockText}>
                  Current Available Stock: <Text style={{ fontWeight: 'bold' }}>{selectedMedForRestock?.stock} {selectedMedForRestock?.unit}</Text>
                </Text>
              </View>

              <Text style={styles.inputLabel}>Quantity to Add (نئی تعداد) *</Text>
              <TextInput
                style={[styles.input, { fontWeight: 'bold', fontSize: 16 }]}
                placeholder="e.g. 50"
                keyboardType="numeric"
                autoFocus
                value={restockQty}
                onChangeText={setRestockQty}
              />

              <View style={styles.row}>
                <View style={{ flex: 1, marginRight: 8 }}>
                  <Text style={styles.inputLabel}>New Purchase Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 12.5"
                    keyboardType="numeric"
                    value={restockBuyPrice}
                    onChangeText={setRestockBuyPrice}
                  />
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={styles.inputLabel}>New Selling Price</Text>
                  <TextInput
                    style={styles.input}
                    placeholder="e.g. 15.0"
                    keyboardType="numeric"
                    value={restockSalePrice}
                    onChangeText={setRestockSalePrice}
                  />
                </View>
              </View>

              <Text style={styles.inputLabel}>New Expiry Date (YYYY-MM-DD)</Text>
              <TextInput
                style={styles.input}
                placeholder="2028-06-30"
                value={restockExpiryDate}
                onChangeText={setRestockExpiryDate}
              />

              <View style={styles.actionButtons}>
                <TouchableOpacity
                  style={[styles.btn, styles.cancelBtn]}
                  onPress={() => setRestockModal(false)}
                >
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.btn, styles.saveBtn]}
                  onPress={handleSaveRestock}
                >
                  <Text style={styles.saveBtnText}>Update & Save</Text>
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
  medicineName: { fontSize: 16, fontWeight: 'bold', color: '#1e293b' },
  genericText: { fontSize: 13, color: '#64748b', marginTop: 2 },
  unitBadge: {
    marginTop: 6,
    alignSelf: 'flex-start',
    backgroundColor: '#e0f2fe',
    color: '#0369a1',
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  stockBox: { alignItems: 'flex-end' },
  stockValue: { fontSize: 18, fontWeight: 'bold' },
  normalStock: { color: '#16a34a' },
  lowStock: { color: '#dc2626' },
  stockLabel: { fontSize: 11, color: '#64748b' },
  restockBtn: {
    marginTop: 6,
    backgroundColor: '#e0f2fe',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 5,
    borderWidth: 1,
    borderColor: '#bae6fd',
  },
  restockBtnText: { fontSize: 11, fontWeight: 'bold', color: '#0369a1' },
  divider: { height: 1, backgroundColor: '#f1f5f9', marginVertical: 10 },
  footerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  priceText: { fontSize: 12, color: '#475569' },
  expiryText: { fontSize: 12, color: '#d97706', fontWeight: '500' },
  emptyBox: { alignItems: 'center', marginTop: 60 },
  emptyText: { fontSize: 16, fontWeight: '600', color: '#64748b' },
  emptySubText: { fontSize: 13, color: '#94a3b8', marginTop: 4 },
  fab: {
    position: 'absolute',
    bottom: 24,
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
  modalTitle: { fontSize: 18, fontWeight: 'bold', color: '#0f172a', marginBottom: 12 },
  currentStockBox: {
    backgroundColor: '#f1f5f9',
    padding: 8,
    borderRadius: 6,
    marginBottom: 12,
  },
  currentStockText: { fontSize: 12, color: '#475569' },
  inputLabel: { fontSize: 12, fontWeight: '600', color: '#475569', marginBottom: 4 },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    padding: 10,
    fontSize: 14,
    marginBottom: 12,
    color: '#0f172a',
    backgroundColor: '#ffffff',
  },
  row: { flexDirection: 'row' },
  actionButtons: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 10, gap: 10 },
  btn: { flex: 1, paddingVertical: 12, borderRadius: 8, alignItems: 'center' },
  cancelBtn: { backgroundColor: '#e2e8f0' },
  saveBtn: { backgroundColor: '#16a34a' },
  cancelBtnText: { color: '#475569', fontWeight: 'bold' },
  saveBtnText: { color: '#ffffff', fontWeight: 'bold' },
});