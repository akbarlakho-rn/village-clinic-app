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
import FinanceScreen from './src/screens/finance/FinanceScreen';
import PatientsScreen from './src/screens/households/PatientsScreen';
import MedicinesScreen from './src/screens/medicines/MedicinesScreen';
import SettingsScreen from './src/screens/settings/SettingsScreen';
import LockScreen from './src/screens/auth/LockScreen';

const Tab = createBottomTabNavigator();

// Custom Centered Floating Button
function CustomCenterButton({ children, onPress }: any) {
  return (
    <TouchableOpacity
      style={styles.floatingButtonContainer}
      onPress={onPress}
      activeOpacity={0.85}
    >
      <View style={styles.floatingButtonCircle}>
        {children}
      </View>
    </TouchableOpacity>
  );
}

function MainNavigator() {
  const insets = useSafeAreaInsets();
  // اینڈرائڈ کی نیچے والی لکیر سے بچنے کے لیے کم از کم 22 پکسل فاصلہ لازمی رکھیں
  const bottomPadding = Math.max(insets.bottom, Platform.OS === 'android' ? 22 : 16);

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
            height: 60 + bottomPadding,
            paddingBottom: bottomPadding,
            paddingTop: 8,
            backgroundColor: '#ffffff',
            borderTopWidth: 1,
            borderTopColor: '#e2e8f0',
            elevation: 12,
            shadowColor: '#000',
            shadowOffset: { width: 0, height: -3 },
            shadowOpacity: 0.08,
            shadowRadius: 6,
          },
          tabBarLabelStyle: {
            fontSize: 12,
            fontWeight: '700',
            marginTop: 4,
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

        {/* 2. Floating Center Button (New Sale) */}
        <Tab.Screen
          name="New Sale"
          component={NewEntryScreen}
          options={{
            tabBarButton: (props) => (
              <CustomCenterButton {...props}>
                <Ionicons name="add" size={32} color="#ffffff" />
              </CustomCenterButton>
            ),
          }}
        />

        {/* 3. Finance Tab */}
        <Tab.Screen
          name="Finance"
          component={FinanceScreen}
          options={{
            title: 'Finance',
            tabBarIcon: ({ focused, color }) => (
              <Ionicons
                name={focused ? 'wallet' : 'wallet-outline'}
                size={24}
                color={color}
              />
            ),
          }}
        />

        {/* Hidden Screens */}
        <Tab.Screen
          name="Patients"
          component={PatientsScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Medicines"
          component={MedicinesScreen}
          options={{ tabBarButton: () => null }}
        />
        <Tab.Screen
          name="Settings"
          component={SettingsScreen}
          options={{ tabBarButton: () => null }}
        />
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
      <MainNavigator />
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
  floatingButtonContainer: {
    top: -18,
    justifyContent: 'center',
    alignItems: 'center',
    flex: 1,
  },
  floatingButtonCircle: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 8,
    shadowColor: '#16a34a',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.35,
    shadowRadius: 5,
    borderWidth: 3,
    borderColor: '#ffffff',
  },
});