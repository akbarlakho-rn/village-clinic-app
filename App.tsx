// App.tsx
import React, { useEffect, useState } from 'react';
import {
  StyleSheet,
  Text,
  View,
  ActivityIndicator,
  StatusBar,
  TouchableOpacity,
  Platform,
} from 'react-native';
import { SafeAreaProvider, useSafeAreaInsets } from 'react-native-safe-area-context';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Ionicons } from '@expo/vector-icons';

import { initDatabase } from './src/database';

// Screens
import HomeScreen from './src/screens/home/HomeScreen';
import NewEntryScreen from './src/screens/newEntry/NewEntryScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import FinanceScreen from './src/screens/finance/FinanceScreen';
import PatientsScreen from './src/screens/households/PatientsScreen';
import MedicinesScreen from './src/screens/medicines/MedicinesScreen';
import LockScreen from './src/screens/auth/LockScreen';

const Tab = createBottomTabNavigator();

// Custom Center Button
function CustomCenterButton({ children, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.floatingCenterWrap}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.floatingCenterCircle}>
        {children}
      </View>
      <Text style={styles.floatingCenterLabel}>New Entry</Text>
    </TouchableOpacity>
  );
}

function MainTabs() {
  const insets = useSafeAreaInsets();
  // اینڈرائڈ کی ہوم بار کے لیے محفوظ کشن
  const safeBottom = Math.max(insets.bottom, Platform.OS === 'android' ? 14 : 10);

  return (
    <NavigationContainer>
      <StatusBar barStyle="dark-content" backgroundColor="#ffffff" />
      <Tab.Navigator
        initialRouteName="Dashboard"
        screenOptions={{
          headerShown: false,
          tabBarActiveTintColor: '#0284c7',
          tabBarInactiveTintColor: '#64748b',
          tabBarStyle: {
            height: 64 + safeBottom,
            paddingBottom: safeBottom,
            paddingTop: 6,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            elevation: 12,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            marginBottom: 4,
          },
        }}
      >
        {/* 1. Home Tab */}
        <Tab.Screen
          name="Dashboard"
          component={HomeScreen}
          options={{
            title: 'Home',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? 'home' : 'home-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* 2. New Entry (Center Floating Button) */}
        <Tab.Screen
          name="New Entry"
          component={NewEntryScreen}
          options={{
            tabBarButton: (props) => (
              <CustomCenterButton {...props}>
                <Ionicons name="add" size={32} color="#ffffff" />
              </CustomCenterButton>
            ),
          }}
        />

        {/* 3. Settings / Menu Tab */}
        <Tab.Screen
          name="SettingsTab"
          component={SettingsScreen}
          options={{
            title: 'Settings',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? 'settings' : 'settings-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* Hidden internal routes */}
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
  options={{
    tabBarButton: () => null,
    tabBarItemStyle: { display: 'none' },
  }}        />
        <Tab.Screen
          name="Patients"
          component={PatientsScreen}
options={{
    tabBarButton: () => null,
    tabBarItemStyle: { display: 'none' },
  }}        />
        <Tab.Screen
          name="Medicines"
          component={MedicinesScreen}
  options={{
    tabBarButton: () => null,
    tabBarItemStyle: { display: 'none' },
  }}        />
      </Tab.Navigator>
    </NavigationContainer>
  );
}

export default function App() {
  const [isDbReady, setIsDbReady] = useState(false);
  const [isUnlocked, setIsUnlocked] = useState(false);

  useEffect(() => {
    async function setupApp() {
      try {
        await initDatabase();
        setIsDbReady(true);
      } catch (error) {
        console.error('Failed to initialize database:', error);
      }
    }
    setupApp();
  }, []);

  if (!isDbReady) {
    return (
      <SafeAreaProvider>
        <View style={styles.centerBox}>
          <ActivityIndicator size="large" color="#0284c7" />
          <Text style={styles.loadingText}>Loading Village Clinic System...</Text>
        </View>
      </SafeAreaProvider>
    );
  }

  if (!isUnlocked) {
    return (
      <SafeAreaProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f172a" />
        <LockScreen onUnlock={() => setIsUnlocked(true)} />
      </SafeAreaProvider>
    );
  }

  return (
    <SafeAreaProvider>
      <MainTabs />
    </SafeAreaProvider>
  );
}

const styles = StyleSheet.create({
  centerBox: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#64748b',
  },
  floatingCenterWrap: {
    top: -14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingCenterCircle: {
    width: 52,
    height: 52,
    borderRadius: 26,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
  floatingCenterLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#16a34a',
    marginTop: 2,
  },
});