# Wroughtmark Mobile App Submission & Testing Guide
**iOS (App Store & TestFlight) and Android (Google Play Console)**
*Attributed to Crampton IT Solutions — Canonical Version 0.3.0*

---

## 1. Store Metadata & Ready-to-Paste Copy

### App Identity
* **App Name:** `Wroughtmark`
* **Bundle Identifier (iOS):** `com.wroughtmark.app`
* **Package Name (Android):** `com.wroughtmark.app`
* **Version:** `0.3.0`
* **Build / Version Code:** `1`
* **Primary Category:** `Productivity` / `Developer Tools`
* **Secondary Category:** `Business` / `Utilities`
* **Content Rating:** `4+` (Apple App Store) / `Everyone` (Google Play)
* **Copyright Notice:** `© 2026 Crampton IT Solutions. All rights reserved.`

### Store URLs
* **Support URL:** `https://wroughtmark.com`
* **Marketing URL:** `https://wroughtmark.com`
* **Privacy Policy URL:** `https://wroughtmark.com/privacy`
* **Terms of Service URL:** `https://wroughtmark.com/terms`
* **Sitemap URL:** `https://wroughtmark.com/sitemap.xml`

### Short Copy & Keywords
* **iOS Subtitle (30 chars max):** `Hardware Provenance Co-Signer`
* **Android Short Description (80 chars max):** `Cryptographic process provenance co-signer and offline seal verifier.`
* **Promotional Text (170 chars max):** `Prove human craft. Co-sign drafting streams with Secure Enclave and StrongBox key attestation. Verify cryptographic process provenance offline.`
* **iOS Keywords (100 chars max, comma-separated):** `provenance,authenticity,signature,cryptography,keystroke,human,author,writing,seal,verify`

---

### Full Description (Ready-to-Paste)
```text
Wroughtmark is the hardware-isolated process provenance companion that proves human authorship through continuous cryptographic attestation.

In an era of synthetic generation, statistical AI detectors produce false positives that harm genuine writers, researchers, students, and engineers. Wroughtmark provides mathematical proof of human effort by capturing the physical drafting journey—keystroke timing cadence, multi-layer revisions, ambient acoustic room tone, and hardware biometric authorization—without ever exposing your actual text to external cloud servers.

KEY CAPABILITIES:

1. HARDWARE-ISOLATED CO-SIGNING
Pair your iPhone, iPad, or Android device with your desktop workstation over local peer-to-peer Wi-Fi or Bluetooth. Every drafted sentence is co-signed by an Ed25519 private key generated inside Apple Secure Enclave or Android StrongBox. Biometric authentication (Face ID, Touch ID, or BiometricPrompt) ensures only the verified physical author can seal the document.

2. ACOUSTIC SLATE & ENVIRONMENTAL WITNESS
Record ambient room tone entropy and acoustic studio slates. Using device microphones, Wroughtmark measures room reverberation (T60 decay) and ambient noise floors (35–45 dB SPL) to verify physical presence in a real room without recording intelligible speech.

3. AIR-GAPPED OFFLINE SEAL VERIFIER
Inspect and verify any Wroughtmark cryptographic seal (.wroughtmark.json, .seal, or QR hallmark) completely offline. The verifier recomputes the SHA-256 directed acyclic graph (DAG), checks the author's public key signature, and certifies that no synthetic bulk-paste anomalies occurred.

4. 0-BYTE TRANSMISSION GUARANTEE
Your intellectual property never leaves your workstation. Keystrokes, drafts, and edits remain strictly local. Only blind mathematical hashes and public keys are inspected, backed by optional blind TimeAnchor timestamps (RFC 3161 and Bitcoin block anchors).

Certified for US Copyright Office AI disclosure guidance and EU AI Act compliance dossiers.

Engineered and maintained by Crampton IT Solutions. Open-core protocol licensed under MIT.
```

---

## 2. Store Asset Inventory

### Apple App Store & TestFlight Assets
| Asset | Dimensions | Format | Path |
| :--- | :--- | :--- | :--- |
| **App Store Icon** | 1024 × 1024 | 24-bit PNG, sRGB, No Alpha | `apple/Wroughtmark-iOS/Assets.xcassets/AppIcon.appiconset/AppIcon-1024.png` |
| **Universal Icon Set** | 20pt to 83.5pt (@1x, @2x, @3x) | PNG | `apple/Wroughtmark-iOS/Assets.xcassets/AppIcon.appiconset/` |
| **Info.plist** | Manifest config | XML Property List | `apple/Wroughtmark-iOS/Info.plist` |
| **Screen 1: Co-Sign** | 1290 × 2796 (6.9" Super Retina) | 24-bit PNG | `apple/store/screenshots/screen1_cosign_1290x2796.png` |
| **Screen 2: Slate** | 1290 × 2796 (6.9" Super Retina) | 24-bit PNG | `apple/store/screenshots/screen2_slate_1290x2796.png` |
| **Screen 3: Verify** | 1290 × 2796 (6.9" Super Retina) | 24-bit PNG | `apple/store/screenshots/screen3_verify_1290x2796.png` |

### Google Play Console Assets
| Asset | Dimensions | Format | Path |
| :--- | :--- | :--- | :--- |
| **Google Play Icon** | 512 × 512 | 32-bit PNG, max 1MB | `android/store/google-play-icon-512x512.png` |
| **Feature Graphic** | 1024 × 500 | 24-bit PNG/JPEG, No Alpha | `android/store/feature-graphic-1024x500.png` |
| **Adaptive Mipmaps** | mdpi, hdpi, xhdpi, xxhdpi, xxxhdpi | Adaptive XML + PNG | `android/app/src/main/res/` |
| **Screen 1: Co-Sign** | 1080 × 2400 (Phone) | 24-bit PNG | `android/store/screenshots/screen1_cosign_1080x2400.png` |
| **Screen 2: Slate** | 1080 × 2400 (Phone) | 24-bit PNG | `android/store/screenshots/screen2_slate_1080x2400.png` |
| **Screen 3: Verify** | 1080 × 2400 (Phone) | 24-bit PNG | `android/store/screenshots/screen3_verify_1080x2400.png` |

---

## 3. App Privacy & Data Safety Declarations

### Apple App Privacy Questionnaire (App Store Connect)
* **Do you or your third-party partners collect data from this app?**
  * Select: **No, we do not collect data from this app.**
* **Encryption Declaration:**
  * `ITSAppUsesNonExemptEncryption` is set to `false` in `Info.plist` (uses standard Apple Security framework and standard Ed25519/SHA-256 for document signing). No proprietary or non-exempt export encryption.

### Google Play Data Safety Form
* **Does your app collect or share any of the required user data types?**
  * Select: **No**
* **Is all of the user data collected by your app encrypted in transit?**
  * Select: **N/A** (no data is collected or transmitted to external servers).
* **Do you provide a way for users to request that their data be deleted?**
  * Select: **Yes** (users can wipe their local hardware keystore and keys directly in-app at any time).

---

## 4. TestFlight Distribution Walkthrough

### Step 1: Open Apple Suite in Xcode
1. Open Xcode on your development Mac.
2. Select **File > Open** and select `/Users/reginaldcrampton/.gemini/antigravity/scratch/wroughtmark/apple`.
3. In Target **Wroughtmark-iOS**:
   * Set **Bundle Identifier**: `com.wroughtmark.app`
   * Select your Apple Developer Team in **Signing & Capabilities**.
   * Verify Capabilities: **Keychain Sharing**, **Face ID**.

### Step 2: Build & Archive
1. Select the build destination **Any iOS Device (arm64)**.
2. In the menu, select **Product > Archive**.
3. When the Organizer window opens:
   * Select the archive (Version 0.3.0, Build 1).
   * Click **Distribute App**.
   * Select **TestFlight & App Store** > **Upload**.
   * Complete the distribution wizard with automated certificate management.

### Step 3: Configure TestFlight in App Store Connect
1. Navigate to [App Store Connect](https://appstoreconnect.apple.com).
2. Go to **Apps > Wroughtmark > TestFlight**.
3. Under **Internal Testing**, click **+** and create a group (e.g. `Foundry Internal`).
4. Add your Apple ID / tester emails.
5. Once processing finishes (typically 5–10 minutes), the build will be immediately available to install via the TestFlight app.

---

## 5. Google Play Internal Testing Walkthrough

### Step 1: Configure Signing Key
Generate a release keystore if you do not already have one:
```bash
keytool -genkey -v -keystore wroughtmark-release.jks \
  -alias wroughtmark-key -keyalg RSA -keysize 2048 -validity 10000 \
  -dname "CN=Wroughtmark, OU=Foundry, O=Crampton IT Solutions, L=Wollongong, ST=NSW, C=AU"
```

### Step 2: Build Android App Bundle (AAB)
From the project root:
```bash
cd android
./gradlew :app:bundleRelease
```
The output file is generated at:
`android/app/build/outputs/bundle/release/app-release.aab`

### Step 3: Create Internal Testing Release in Google Play Console
1. Log in to [Google Play Console](https://play.google.com/console).
2. Click **Create App**:
   * App name: `Wroughtmark`
   * Default language: `English (United States)`
   * App or game: `App`
   * Free or paid: `Free`
3. In the sidebar under **Testing**, click **Internal testing**.
4. Click **Create new release**:
   * Upload `android/app/build/outputs/bundle/release/app-release.aab`.
   * Set Release name: `0.3.0 (1)`.
   * Release notes: `Initial mobile release with hardware co-signing, studio slate, and offline seal verification.`
5. Under **Testers**, create an email list of internal testers and copy the **Join on the web** or **Join on Android** opt-in URL.
6. Click **Next > Save and Publish**. Internal releases are available to testers within minutes.
