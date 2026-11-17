# Wroughtmark macOS Suite (`apple/`)

Native macOS Swift client and Menu Bar status application powered by `WroughtmarkKit` and `CWroughtmarkCore`.

## Components

- `Sources/WroughtmarkKit/`: Core Swift framework for hardware keystroke capture, Secure Enclave biometric attestation, physical acoustic room slates, and offline seal verification on macOS.
- `Sources/WroughtmarkApp/`: Native macOS Menu Bar status item application (`WroughtmarkMenuBarApp.swift`).
- `Sources/CWroughtmarkCore/`: C-ABI Swift bridging headers (`shim.h`) and module map binding `wroughtmark_core` static Rust library.

## Building for macOS

```bash
# Build Rust static library
cargo build --release --manifest-path ../core/Cargo.toml --lib

# Build and run macOS Menu Bar app
swift build -c release --package-path . --product WroughtmarkApp
```

*Note: Native mobile, watchOS, and visionOS applications are maintained in the private commercial app distribution repository.*
