#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
DIST="$ROOT/dist"
VERSION="${WROUGHTMARK_VERSION:-0.3.0}"

rm -rf "$DIST"
mkdir -p "$DIST/bin" "$DIST/plugins"

CARGO_FLAGS=()
if ! cargo metadata --offline --manifest-path "$ROOT/core/Cargo.toml" >/dev/null 2>&1; then
  CARGO_FLAGS=()
elif [ "${WROUGHTMARK_OFFLINE:-0}" = "1" ] || [ "${CI:-false}" != "true" ]; then
  CARGO_FLAGS=("--offline")
fi

echo "==> Building release Rust core library, CLI & cross-platform desktop binary"
cargo build --release ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/core/Cargo.toml" --lib --bin wroughtmark
cargo build --release ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/desktop-win-linux/Cargo.toml"

EXE_EXT=""
case "$(uname -s)" in
  MINGW*|MSYS*|CYGWIN*|Windows_NT) EXE_EXT=".exe" ;;
esac

CLI_BIN="$ROOT/core/target/release/wroughtmark${EXE_EXT}"
GUI_BIN="$ROOT/desktop-win-linux/target/release/wroughtmark-desktop${EXE_EXT}"
cp "$CLI_BIN" "$DIST/bin/"
cp "$GUI_BIN" "$DIST/bin/"

OS_NAME="$(uname -s)"
ARCH_NAME="$(uname -m)"

if [ "$OS_NAME" = "Darwin" ] && command -v swift >/dev/null 2>&1; then
  echo "==> Packaging macOS SwiftUI MenuBarExtra bundle (Wroughtmark.app) & DMG"
  export WROUGHTMARK_CORE_LIB_DIR="$ROOT/core/target/release"
  SWIFT_FLAGS=()
  if ! swift package --package-path "$ROOT/apple" describe >/dev/null 2>&1; then
    SWIFT_FLAGS=("--disable-sandbox")
  fi
  swift build -c release ${SWIFT_FLAGS[@]+"${SWIFT_FLAGS[@]}"} --package-path "$ROOT/apple" --product WroughtmarkApp
  APP_BIN="$(swift build -c release ${SWIFT_FLAGS[@]+"${SWIFT_FLAGS[@]}"} --package-path "$ROOT/apple" --product WroughtmarkApp --show-bin-path)/WroughtmarkApp"

  APP_BUNDLE="$DIST/Wroughtmark.app"
  mkdir -p "$APP_BUNDLE/Contents/MacOS" "$APP_BUNDLE/Contents/Resources"
  cp "$APP_BIN" "$APP_BUNDLE/Contents/MacOS/WroughtmarkApp"
  cp "$CLI_BIN" "$APP_BUNDLE/Contents/Resources/wroughtmark"
  chmod +x "$APP_BUNDLE/Contents/MacOS/WroughtmarkApp" "$APP_BUNDLE/Contents/Resources/wroughtmark"

  cat > "$APP_BUNDLE/Contents/Info.plist" <<EOF
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>CFBundleDevelopmentRegion</key>
  <string>en</string>
  <key>CFBundleExecutable</key>
  <string>WroughtmarkApp</string>
  <key>CFBundleIdentifier</key>
  <string>com.wroughtmark.app</string>
  <key>CFBundleInfoDictionaryVersion</key>
  <string>6.0</string>
  <key>CFBundleName</key>
  <string>Wroughtmark</string>
  <key>CFBundlePackageType</key>
  <string>APPL</string>
  <key>CFBundleShortVersionString</key>
  <string>${VERSION}</string>
  <key>CFBundleVersion</key>
  <string>${VERSION}</string>
  <key>LSMinimumSystemVersion</key>
  <string>14.0</string>
  <key>LSUIElement</key>
  <true/>
  <key>NSHighResolutionCapable</key>
  <true/>
</dict>
</plist>
EOF

  MAC_TAG="macOS-${ARCH_NAME}"
  DMG_STAGE="$DIST/dmg-stage"
  rm -rf "$DMG_STAGE"
  mkdir -p "$DMG_STAGE/bin"
  cp -R "$APP_BUNDLE" "$DMG_STAGE/Wroughtmark.app"
  cp "$CLI_BIN" "$GUI_BIN" "$DMG_STAGE/bin/"
  ln -s /Applications "$DMG_STAGE/Applications"

  tar -czf "$DIST/Wroughtmark-${MAC_TAG}.tar.gz" -C "$DIST" Wroughtmark.app -C "$DIST/bin" wroughtmark wroughtmark-desktop
  if command -v hdiutil >/dev/null 2>&1; then
    hdiutil create -volname "Wroughtmark ${VERSION}" -srcfolder "$DMG_STAGE" -ov -format UDZO "$DIST/Wroughtmark-${MAC_TAG}.dmg" >/dev/null
  fi
  rm -rf "$DMG_STAGE"
elif [ "$OS_NAME" = "Linux" ]; then
  tar -czf "$DIST/wroughtmark-linux-${ARCH_NAME}.tar.gz" -C "$DIST/bin" wroughtmark wroughtmark-desktop
else
  (cd "$DIST/bin" && zip -q -r "$DIST/wroughtmark-windows-x86_64.zip" wroughtmark.exe wroughtmark-desktop.exe)
fi

echo "==> Packaging all 10 open-core plugin bundles"
for plugin in browser-extension office-addin google-workspace-addon skills/wroughtmark-provenance integrations/vscode integrations/obsidian integrations/figma integrations/adobe-uxp; do
  name="$(basename "$plugin")"
  bun run --cwd "$ROOT/$plugin" build >/dev/null
  mkdir -p "$DIST/plugins/$name"
  cp -R "$ROOT/$plugin/dist" "$DIST/plugins/$name/"
  for meta in manifest.json manifest.xml appsscript.json SKILL.md package.json README.md; do
    [ -f "$ROOT/$plugin/$meta" ] && cp "$ROOT/$plugin/$meta" "$DIST/plugins/$name/"
  done
done

mkdir -p "$DIST/plugins/blender" "$DIST/plugins/reaper"
cp "$ROOT/integrations/blender/wroughtmark_blender.py" "$DIST/plugins/blender/"
cp "$ROOT/integrations/reaper/wroughtmark_reaper.py" "$DIST/plugins/reaper/"

if command -v zip >/dev/null 2>&1; then
  (cd "$DIST/plugins" && zip -q -r "$DIST/wroughtmark-plugins-bundle.zip" .)
else
  python3 -c "import shutil; shutil.make_archive('$DIST/wroughtmark-plugins-bundle', 'zip', '$DIST/plugins')"
fi

echo "==> Computing SHA256SUMS.txt"
(
  cd "$DIST"
  FILES=()
  for f in *.dmg *.tar.gz *.zip; do
    [ -f "$f" ] && FILES+=("$f")
  done
  if [ "${#FILES[@]}" -gt 0 ]; then
    if command -v sha256sum >/dev/null 2>&1; then
      sha256sum "${FILES[@]}" > SHA256SUMS.txt
    else
      shasum -a 256 "${FILES[@]}" > SHA256SUMS.txt
    fi
  fi
)

echo "Packaged release artifacts in $DIST:"
ls -lh "$DIST"
