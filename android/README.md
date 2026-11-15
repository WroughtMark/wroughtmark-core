# Wroughtmark Android & Wear OS (`android/`)

Kotlin/Jetpack Compose client, phone application, and Wear OS biometric co-signer backed by `wroughtmark-core` (`libwroughtmark_core.so` via `cargo-ndk` + C-ABI in `../core/include/wroughtmark.h`).

## Project Structure

- `settings.gradle.kts`: Gradle project definition including `:app` module.
- `build.gradle.kts`: Top-level build configuration (Android Gradle Plugin 8.7.2, Kotlin 2.0.21, Compose Compiler).
- `app/build.gradle.kts`: Module build configuration (`com.wroughtmark.app`, compileSdk 35, minSdk 28).
- `app/src/main/AndroidManifest.xml`: Application manifest declaring `MainActivity`, biometric/camera hardware permissions, and deep link intent filters for `https://wroughtmark.com/v/:sealId`.
- `app/src/main/kotlin/com/wroughtmark/ui/MainActivity.kt`: Android entrypoint hosting `WroughtmarkAppScreen` Jetpack Compose UI.
- `app/src/main/kotlin/com/wroughtmark/ui/WroughtmarkMobileApp.kt`: State controller & Foundry Obsidian Dark / Studio Stone Light palette (`WroughtmarkComposePalette`, `WroughtmarkMobileController`) for the 3-tab Android phone/tablet Compose app (`01 CO-SIGN`, `02 SLATE`, `03 VERIFY`).
- `app/src/main/kotlin/com/wroughtmark/WroughtmarkVerifier.kt`: JNI entrypoint (`nativeSha256Hex`, `nativeBlake3Hex`, `nativeVerifySealJson`, `nativeBuildDossierHtml`, `nativeMintPhysicalSealJson`) with JVM fallback.
- `app/src/main/kotlin/com/wroughtmark/WroughtmarkCoSigner.kt`: Android & Wear OS physical proof co-signer (`CoSignerDeviceType`, `PhysicalCaptureKind`, `CoSignerEvent`, `WroughtmarkCoSigner`).
- `app/src/main/kotlin/com/wroughtmark/wear/WroughtmarkWearApp.kt`: Wear OS smartwatch companion controller (`WroughtmarkWearSlateController`).
- `app/src/main/kotlin/com/wroughtmark/xr/WroughtmarkSpatialAndGlassesApp.kt`: Meta Ray-Ban Display & Horizon OS XR controllers.

## Store Assets (`store/`)

- `store/google-play-icon-512x512.png`: 512×512 Google Play store icon.
- `store/feature-graphic-1024x500.png`: 1024×500 Google Play feature graphic (PNG rendered from `feature-graphic-1024x500.svg`).
- `store/screenshots/`: High-resolution store screenshots (1080×2400):
  - `screen1_cosign_1080x2400.png`: Hardware Co-Signer & StrongBox attestation.
  - `screen2_slate_1080x2400.png`: Acoustic Room Tone & Studio Clapper slate.
  - `screen3_verify_1080x2400.png`: Offline Cryptographic Seal inspection.

## Build & Release

```bash
# Build debug APK
./gradlew :app:assembleDebug

# Build release Android App Bundle (AAB) for Google Play Console
./gradlew :app:bundleRelease
```
See `../docs/STORE_SUBMISSION_CHECKLIST.md` for step-by-step submission instructions.
