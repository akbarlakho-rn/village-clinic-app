# 🏥 Village Clinic - Offline Practice & Pharmacy Management

A modern, fast, and completely offline mobile application built with **React Native**, **Expo (Prebuild)**, and **SQLite**. Designed specifically for rural clinics, primary healthcare centers, and independent physicians managing patient consultations, household credit ledgers (*Khata*), pharmacy inventory, and daily cash flows without requiring an internet connection.

---

## 🌟 Key Features

### 1. 👨‍👩‍👧‍👦 Household & Patient Ledger (Village Khata System)
- **Family / Household Centric:** Groups patients by household head to manage rural community credit balances efficiently.
- **Credit & Loan Management:** Accurately tracks unpaid dues, partial payments, and historical loan recovery.
- **Patient History:** Complete audit trail of medical visits, prescriptions, and dispensed medications per patient.

### 2. 💊 Pharmacy Inventory & Restock
- **Stock Tracking:** Real-time stock counts with automated depletion on checkout.
- **Pricing Management:** Tracks purchase prices, retail prices, and profit margins.
- **Batch & Expiry Dates:** Alerts for low stock levels and expiring medications.
- **Fast Search:** Instant medicine lookups by trade name or generic formulation.

### 3. 🧾 Fast Point of Sale (POS) & Billing
- **One-Click Cart System:** Streamlined prescription dispensing and medicine sales.
- **Flexible Payments:** Support for full cash, full credit (loan), or split/partial payments.
- **Automated Balance Calculation:** Automatically updates household ledger upon credit checkout.

### 4. 📊 Financial Analytics & Evening Register
- **Daily Cash Register:** Comprehensive evening summaries calculating cash in hand, outstanding credit, and recovery amounts.
- **Expense Logging:** Categorized tracking of clinic operational overhead (supplies, staff tea, utilities).
- **Profit & Loss Estimation:** Analyzes Cost of Goods Sold (COGS) vs revenue over 7-day and 30-day windows.

### 5. 🔒 Data Privacy, Backup & Security
- **100% Offline-First:** Patient data never leaves the device. Zero cloud dependency.
- **One-Tap JSON Backups:** Export full database backups directly to WhatsApp, email, or local SD storage.
- **Doctor PIN Lock:** Optional 4-digit security PIN to restrict unauthorized access.
- **Demo Data & Reset Tool:** Quick-load dummy datasets for testing and clean wipe options for production handoff.

---

## 🛠️ Tech Stack

- **Framework:** React Native with Expo (Bare / Prebuild workflow)
- **Language:** TypeScript
- **Database:** Local SQLite (`expo-sqlite`) with raw optimized relational SQL queries
- **State Management:** Zustand
- **Navigation:** React Navigation (Bottom Tabs + Native Stack) with `useFocusEffect` hooks for immediate data synchronization
- **Android Optimizations:** ProGuard/R8 code shrinking, ABI Splits (`arm64-v8a` / `armeabi-v7a`), and Hermes engine

---

## 🚀 Getting Started

### Prerequisites
- Node.js (v18 or higher)
- npm or yarn
- Android SDK & JDK 17 (for local APK building)

### Installation

1. **Clone the repository:**
   ```bash
   git clone https://github.com/<your-username>/<your-repo-name>.git
   cd <your-repo-name>
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Start the development server:**
   ```bash
   npx expo start
   ```

---

## 📦 Building Standalone APK (Local)

To generate standalone APKs for physical devices without cloud services:

1. **Generate native Android assets:**
   ```bash
   npx expo prebuild --clean
   ```

2. **Compile optimized Release APKs:**
   ```bash
   cd android
   ./gradlew assembleRelease
   ```

3. **Output Directory:**
   Optimized lightweight APKs will be generated at:
   ```text
   android/app/build/outputs/apk/release/app-arm64-v8a-release.apk
   ```

---

## 📄 License & Attribution

Designed and engineered for grassroots community clinics. Open for improvements, customization, and community contributions.