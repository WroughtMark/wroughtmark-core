# Google Play Store Listing // Wroughtmark

## 1. Store Metadata

- **App Name (Title):** `Wroughtmark // Proof of Craft` *(30/30 characters)*
- **Short Description:** `Cryptographic human provenance, hardware co-signing & offline media seals.` *(75/80 characters)*
- **Category:** Tools / Productivity
- **Content Rating:** Everyone (PEGI 3 / ESRB Everyone)
- **Target Audience:** Writers, photographers, filmmakers, software engineers, and creative studios
- **Privacy Policy URL:** `https://wroughtmark.com/legal/privacy`
- **Support URL:** `https://wroughtmark.com#contact`
- **Contact Email:** `hello@wroughtmark.com`

---

## 2. Full Description (Google Play)

```text
Wroughtmark provides cryptographic proof of human craft and creative process without surrendering raw files or private media to any external cloud.

PAIR & CO-SIGN WORKSTATION SESSIONS
Pair your Android device with your desktop writing software, Digital Audio Workstation (DAW), Non-Linear Editor (NLE), or 3D viewport. Co-sign active revision intervals, handwritten outlines, room tone acoustic slates, and biometric pulses directly through your phone's StrongBox and hardware Secure Enclave.

FOLDABLE & LARGE SCREEN ADAPTIVE DESIGN
Optimized from the ground up for modern foldable devices (Google Pixel Fold, Pixel 9 Pro Fold, Samsung Galaxy Z Fold series, OnePlus Open) and tablets. When folded, Wroughtmark operates as an ultra-compact co-signer on your cover screen. When unfolded, the interface seamlessly transitions into a dual-pane Foundry Workstation, keeping your live hardware signature stream on the left while providing instant access to studio slates and cryptographic verification on the right.

PHYSICAL STUDIO SLATES
Anchor creative takes and drafts with physical sensory witnesses:
- 5s Acoustic Room Tone: Continuous background acoustic entropy sampling verifies physical presence in a real room without recording intelligible speech.
- Handwritten Outlines & Clapper Takes: Cryptographically hash physical notebook drafts and clapperboard frames locally in Rust.
- 0 Bytes Uploaded: All hashing and signature generation happens directly on your device.

OFFLINE POCKET VERIFIER
Verify any portable Wroughtmark seal (*.seal.json) or container embedded with cryptographic process assertions (PNG iTXt, WAV WMKS, JPEG trailer). Wroughtmark verifies Ed25519 signatures, BLAKE3 digests, and external TimeAnchor receipts offline in microseconds.

OPEN SPECIFICATION & SOVEREIGN PRIVACY
Backed by the open-source wroughtmark-core cryptographic engine. USCO, EU AI Act, and C2PA process compliant.
```

---

## 3. Graphic Assets Inventory

| Asset Type | Dimension | File Location | Status |
|---|---|---|---|
| **App Icon** | 512 × 512 PNG | `android/store/google-play-icon-512x512.png` | Verified |
| **Feature Graphic** | 1024 × 500 PNG | `android/store/feature-graphic-1024x500.png` | Verified |
| **Phone Screenshot 1 (Co-Sign)** | 1080 × 2400 PNG | `android/store/screenshots/screen1_cosign_1080x2400.png` | Generated |
| **Phone Screenshot 2 (Slate)** | 1080 × 2400 PNG | `android/store/screenshots/screen2_slate_1080x2400.png` | Generated |
| **Phone Screenshot 3 (Verify)** | 1080 × 2400 PNG | `android/store/screenshots/screen3_verify_1080x2400.png` | Generated |
| **Foldable Unfolded 1 (Foundry)** | 2208 × 1840 PNG | `android/store/screenshots/foldable1_unfolded_foundry_2208x1840.png` | Generated |
| **Foldable Unfolded 2 (Verify)** | 2208 × 1840 PNG | `android/store/screenshots/foldable2_unfolded_verify_2208x1840.png` | Generated |
| **Foldable Folded 3 (Cover)** | 1080 × 2092 PNG | `android/store/screenshots/foldable3_folded_cover_1080x2092.png` | Generated |
| **7" Tablet 1 (Portrait)** | 1200 × 1920 PNG | `android/store/screenshots/tablet7_1_portrait_1200x1920.png` | Generated |
| **7" Tablet 2 (Landscape)** | 1920 × 1200 PNG | `android/store/screenshots/tablet7_2_landscape_1920x1200.png` | Generated |
| **10" Tablet 1 (Portrait)** | 1600 × 2560 PNG | `android/store/screenshots/tablet10_1_portrait_1600x2560.png` | Generated |
| **10" Tablet 2 (Landscape)** | 2560 × 1600 PNG | `android/store/screenshots/tablet10_2_landscape_2560x1600.png` | Generated |

---

## 4. Play Console Declarations

- **Foldable & Multi-Window:** `android:resizeableActivity="true"`, dynamic posture & orientation handling, `supports-screens` declared.
- **Biometric Hardware:** Optional hardware security attestation; falls back cleanly to on-device software keys if StrongBox is unavailable.
- **Data Safety:** Zero user data collected, zero tracking, zero third-party SDKs, zero raw media uploads.
