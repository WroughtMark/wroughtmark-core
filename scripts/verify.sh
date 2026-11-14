#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
CARGO_FLAGS=()
if ! cargo metadata --offline --manifest-path "$ROOT/core/Cargo.toml" >/dev/null 2>&1; then
  CARGO_FLAGS=()
elif [ "${WROUGHTMARK_OFFLINE:-0}" = "1" ] || [ "${CI:-false}" != "true" ]; then
  CARGO_FLAGS=("--offline")
fi

echo "==> 1/14 Rust core tests"
cargo test ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/core/Cargo.toml"

echo "==> 2/14 Cross-platform Rust desktop tests (Windows / Linux / macOS)"
cargo test ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/desktop-win-linux/Cargo.toml"

if [ "$(uname -s)" = "Darwin" ] && command -v swift >/dev/null 2>&1; then
  echo "==> 2b/14 macOS SwiftUI MenuBarExtra app & Swift C-ABI FFI tests"
  cargo build ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/core/Cargo.toml" >/dev/null
  if swift package --package-path "$ROOT/apple" describe >/dev/null 2>&1; then
    SWIFT_FLAGS=()
  else
    SWIFT_FLAGS=("--disable-sandbox")
  fi
  swift test ${SWIFT_FLAGS[@]+"${SWIFT_FLAGS[@]}"} --package-path "$ROOT/apple"
  swift build ${SWIFT_FLAGS[@]+"${SWIFT_FLAGS[@]}"} --package-path "$ROOT/apple" --product WroughtmarkApp >/dev/null
fi

echo "==> 3/14 Web SDK cross-language verification tests"
cargo build ${CARGO_FLAGS[@]+"${CARGO_FLAGS[@]}"} --manifest-path "$ROOT/core/Cargo.toml" --bin wroughtmark >/dev/null
bun test --cwd "$ROOT/web-sdk"

echo "==> 4/14 Browser extension build & provenance tests"
bun run --cwd "$ROOT/browser-extension" build
bun test --cwd "$ROOT/browser-extension"

echo "==> 5/14 Microsoft 365 multi-host add-in build & provenance tests"
bun run --cwd "$ROOT/office-addin" build
bun test --cwd "$ROOT/office-addin"

echo "==> 6/14 Google Workspace add-on build & provenance tests"
bun run --cwd "$ROOT/google-workspace-addon" build
bun test --cwd "$ROOT/google-workspace-addon"

echo "==> 7/14 Wroughtmark Agent Skill & MCP server build & tests"
bun run --cwd "$ROOT/skills/wroughtmark-provenance" build
bun test --cwd "$ROOT/skills/wroughtmark-provenance"

echo "==> 8/14 VS Code extension build & provenance tests"
bun run --cwd "$ROOT/integrations/vscode" build
bun test --cwd "$ROOT/integrations/vscode"

echo "==> 9/14 Figma plugin build & provenance tests"
bun run --cwd "$ROOT/integrations/figma" build
bun test --cwd "$ROOT/integrations/figma"

echo "==> 10/14 Adobe UXP plugin build & provenance tests"
bun run --cwd "$ROOT/integrations/adobe-uxp" build
bun test --cwd "$ROOT/integrations/adobe-uxp"

echo "==> 11/14 Obsidian vault plugin build & provenance tests"
bun run --cwd "$ROOT/integrations/obsidian" build
bun test --cwd "$ROOT/integrations/obsidian"

echo "==> 12/14 End-to-end CLI watch -> seal -> verify -> tamper-fail check"
TMP_DIR="$(mktemp -d)"
trap 'rm -rf "$TMP_DIR"' EXIT

mkdir -p "$TMP_DIR/proj"
printf "chapter one" > "$TMP_DIR/proj/book.md"
printf "daw stem" > "$TMP_DIR/proj/mix.als"
printf "final export" > "$TMP_DIR/final.pdf"
printf "tampered export" > "$TMP_DIR/tampered.pdf"

BIN="$ROOT/core/target/debug/wroughtmark"
if [ -x "${BIN}.exe" ]; then
  BIN="${BIN}.exe"
fi

"$BIN" keygen "$TMP_DIR/key.json"
"$BIN" watch "$TMP_DIR/proj" "$TMP_DIR/chain.json" "$TMP_DIR/key.json" --once
"$BIN" seal "$TMP_DIR/chain.json" "$TMP_DIR/key.json" writing "$TMP_DIR/final.pdf" "$TMP_DIR/seal.json"
"$BIN" verify "$TMP_DIR/final.pdf" "$TMP_DIR/seal.json" "$TMP_DIR/chain.json"
"$BIN" dossier "$TMP_DIR/final.pdf" "$TMP_DIR/seal.json" "$TMP_DIR/dossier.html" "$TMP_DIR/chain.json"
grep -q "VERIFIED HUMAN PROCESS" "$TMP_DIR/dossier.html"

if "$BIN" verify "$TMP_DIR/tampered.pdf" "$TMP_DIR/seal.json" "$TMP_DIR/chain.json" 2>/dev/null; then
  echo "ERROR: tampered deliverable unexpectedly passed verification"
  exit 1
fi
echo "Tampered deliverable rejected as expected."

echo "==> 13/14 Blender 3D add-on integration tests"
python3 -m unittest discover -s "$ROOT/integrations/blender" -p "test_*.py" -v

echo "==> 14/14 Reaper DAW ReaScript integration tests"
python3 -m unittest discover -s "$ROOT/integrations/reaper" -p "test_*.py" -v

echo "ALL WROUGHTMARK CORE SUITES PASSED"
