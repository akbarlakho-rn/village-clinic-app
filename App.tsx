// App.tsx
import React, { useEffect, useState } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  ActivityIndicator, 
  SafeAreaView, 
  StatusBar 
} from 'react-native';
import { initDatabase } from './src/database';
import PatientsScreen from './src/screens/households/PatientsScreen';

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [initError, setInitError] = useState<string | null>(null);

  useEffect(() => {
    async function prepareApp() {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('App initialization failed:', error);
        setInitError('ڈیٹا بیس انیشیلائزیشن میں خرابی پیش آگئی ہے۔');
      }
    }

    prepareApp();
  }, []);

  if (initError) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <Text style={styles.errorText}>❌ {initError}</Text>
      </SafeAreaView>
    );
  }

  if (!isDbReady) {
    return (
      <SafeAreaView style={styles.centerContainer}>
        <StatusBar barStyle="dark-content" />
        <ActivityIndicator size="large" color="#0284c7" />
        <Text style={styles.loadingText}>سسٹم ڈیٹا بیس تیار ہو رہا ہے...</Text>
      </SafeAreaView>
    );
  }

  return (
   
    <SafeAreaView style={{ flex: 1 }}>
    <StatusBar barStyle="dark-content" />
    <PatientsScreen />
  </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  centerContainer: {
    flex: 1,
    backgroundColor: '#f8fafc',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
    elevation: 3,
  },
  title: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#0f172a',
    marginBottom: 12,
    textAlign: 'center',
  },
  status: {
    fontSize: 15,
    color: '#16a34a',
    fontWeight: '600',
    marginBottom: 8,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 13,
    color: '#64748b',
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#475569',
  },
  errorText: {
    fontSize: 16,
    color: '#dc2626',
    fontWeight: 'bold',
    textAlign: 'center',
  },
});