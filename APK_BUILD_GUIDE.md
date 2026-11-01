# MediTime: Android APK Build & Personal Signing Guide

This guide walks you through compiling MediTime into an installable APK for personal and family use without needing the Google Play Store.

---

## 1. Prerequisites

Ensure your development machine has the following free tools installed:
1. **Node.js**: v18 or v20 LTS ([nodejs.org](https://nodejs.org))
2. **JDK**: Java Development Kit 17 (Eclipse Temurin or Oracle JDK 17)
3. **Android Studio**: Latest version with Android SDK Platform 34 and Build-Tools installed

---

## 2. Fast Build Sequence

Open a terminal in the project root (`meditime/`):

### Step 1: Install Dependencies
```bash
npm install
```

### Step 2: Build the Frontend Assets
Compiles the React + TypeScript web app into the `www/` directory:
```bash
npm run build
```

### Step 3: Synchronize with the Native Android Project
Copies web assets and configures Capacitor plugins in the native `android/` directory:
```bash
npx cap sync android
```

---

## 3. Building the Debug APK (For Testing)

To produce a debug APK for immediate testing on your phone:

### Via Command Line (Terminal):
```bash
cd android
./gradlew assembleDebug
# On Windows PowerShell:
# .\gradlew.bat assembleDebug
```

The generated APK will be located at:
```
android/app/build/outputs/apk/debug/app-debug.apk
```

### Installing Debug APK via ADB:
Connect your Android phone via USB with **USB Debugging** enabled:
```bash
adb install -r android/app/build/outputs/apk/debug/app-debug.apk
```

---

## 4. Building a Personally Signed Release APK (For Family Distribution)

To produce an optimized, permanent APK that can be sent to family members via WhatsApp, Telegram, or Google Drive and installed cleanly without debug warnings:

### Step 1: Generate a Private Signing Keystore
Run the standard Java `keytool` command in your terminal:

```bash
keytool -genkey -v -keystore meditime-family.keystore -alias meditime -keyalg RSA -keysize 2048 -validity 10000
```

When prompted:
* Enter a secure password (e.g., `familyHealth2026`).
* Enter your name/organization.
* Confirm generation. Keep `meditime-family.keystore` in a safe location.

### Step 2: Configure Signing in `android/app/build.gradle`

In `android/app/build.gradle`, configure the `signingConfigs` block:

```groovy
android {
    ...
    signingConfigs {
        release {
            storeFile file("../../meditime-family.keystore")
            storePassword "YOUR_KEYSTORE_PASSWORD"
            keyAlias "meditime"
            keyPassword "YOUR_KEY_PASSWORD"
        }
    }

    buildTypes {
        release {
            minifyEnabled false
            signingConfig signingConfigs.release
            proguardFiles getDefaultProguardFile('proguard-android-optimize.txt'), 'proguard-rules.pro'
        }
    }
}
```

### Step 3: Compile the Release APK
```bash
cd android
./gradlew assembleRelease
# On Windows PowerShell:
# .\gradlew.bat assembleRelease
```

The signed release APK will be generated at:
```
android/app/build/outputs/apk/release/app-release.apk
```

---

## 5. Installing on Family Android Devices

1. Copy `app-release.apk` to the family member's phone (via USB, Bluetooth, or local file sharing).
2. On their Android phone, open **Files** and tap `app-release.apk`.
3. If prompted:
   * Allow *"Install unknown apps"* from your file manager or browser.
4. Tap **Install**.
5. When opening MediTime for the first time:
   * Grant **Notifications** permission when requested.
   * On Android 12+, allow **Alarms & Reminders** in system settings when prompted.
   * If the phone has battery management (Xiaomi, Samsung), set MediTime battery to **Unrestricted**.
6. Tap **Settings -> Test Real Android Alarm** to verify the phone rings and displays the lock-screen alarm 10 seconds later!
