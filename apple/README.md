# Wroughtmark Apple Suite (`apple/`)

Native Swift client, Menu Bar companion, and iOS/visionOS application powered by `WroughtmarkKit` and `CWroughtmarkCore`.

## Components

- `Sources/WroughtmarkKit/`: Core Swift framework for hardware keystroke capture, Secure Enclave biometric attestation, physical acoustic room slates, and offline seal verification.
- `Sources/WroughtmarkApp/`: Native application targets:
  - `WroughtmarkMenuBarApp.swift`: macOS Menu Bar status item application (`#if os(macOS)`).
  - `WroughtmarkiOSApp.swift`: iOS, iPadOS, and visionOS mobile application entrypoint (`#if os(iOS) || os(visionOS)`) hosting `WroughtmarkMobileAppView`.
- `Wroughtmark-iOS/`: iOS app metadata, property list, and asset catalog:
  - `Info.plist`: Bundle ID `com.wroughtmark.app`, version `0.3.0`, build `1`, camera and biometric usage strings.
  - `Assets.xcassets/AppIcon.appiconset/`: App Store 1024×1024 icon and full iOS universal icon set.
- `store/screenshots/`: High-resolution App Store screenshots (1290×2796, 6.9" Super Retina):
  - `screen1_cosign_1290x2796.png`: Hardware Co-Signing & Secure Enclave pairing.
  - `screen2_slate_1290x2796.png`: Studio Clapper & Acoustic Room Tone witness.
  - `screen3_verify_1290x2796.png`: Air-Gapped Offline Seal Verifier.

## Building for iOS & macOS

Open `Package.swift` in Xcode or configure team code signing in your target's Signing & Capabilities tab.
