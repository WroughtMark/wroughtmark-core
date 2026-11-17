import { writeFileSync, mkdirSync } from "fs";
import { execSync } from "child_process";

const OUTPUT_DIR = "/tmp/wroughtmark_screens";
mkdirSync(OUTPUT_DIR, { recursive: true });

// Common CSS
const baseCss = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body {
    background-color: #08090C;
    color: #E6EDF3;
    font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
    width: 100vw;
    height: 100vh;
    overflow: hidden;
    display: flex;
    flex-direction: column;
    justify-content: space-between;
    -webkit-font-smoothing: antialiased;
  }
  .status-bar {
    height: 52px;
    padding: 0 40px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    font-size: 18px;
    font-weight: 600;
    color: #E6EDF3;
  }
  .status-icons {
    display: flex;
    gap: 12px;
    align-items: center;
  }
  .header {
    padding: 16px 40px 20px 40px;
    border-bottom: 1px solid #1C212B;
    background: linear-gradient(180deg, #10131A 0%, #08090C 100%);
  }
  .brand-line {
    font-family: "SF Mono", "JetBrains Mono", Menlo, monospace;
    font-size: 14px;
    letter-spacing: 2px;
    color: #E2AC55;
    font-weight: 700;
    margin-bottom: 6px;
    text-transform: uppercase;
    display: flex;
    align-items: center;
    gap: 12px;
  }
  .title {
    font-size: 32px;
    font-weight: 700;
    color: #FFFFFF;
    letter-spacing: -0.5px;
    margin-bottom: 4px;
  }
  .subtitle {
    font-size: 16px;
    color: #8B949E;
    font-weight: 400;
    line-height: 1.4;
  }
  .card {
    background: #11141B;
    border: 1px solid #232936;
    border-radius: 18px;
    padding: 24px;
    box-shadow: 0 12px 36px rgba(0,0,0,0.6);
  }
  .badge {
    display: inline-flex;
    align-items: center;
    gap: 8px;
    padding: 5px 12px;
    border-radius: 999px;
    font-size: 13px;
    font-weight: 700;
    font-family: monospace;
    text-transform: uppercase;
    letter-spacing: 0.5px;
  }
  .badge-emerald {
    background: rgba(52, 211, 153, 0.15);
    color: #34D399;
    border: 1px solid rgba(52, 211, 153, 0.4);
  }
  .badge-brass {
    background: rgba(226, 172, 85, 0.15);
    color: #E2AC55;
    border: 1px solid rgba(226, 172, 85, 0.4);
  }
  .stat-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 14px;
    margin-top: 14px;
  }
  .stat-box {
    background: #0B0D12;
    border: 1px solid #1C212B;
    border-radius: 12px;
    padding: 14px;
  }
  .stat-label {
    font-size: 12px;
    font-family: monospace;
    color: #8B949E;
    text-transform: uppercase;
    letter-spacing: 1px;
    margin-bottom: 4px;
  }
  .stat-value {
    font-size: 22px;
    font-weight: 700;
    color: #FFFFFF;
    font-family: monospace;
  }
  .code-box {
    background: #060709;
    border: 1px solid #1C212B;
    border-radius: 12px;
    padding: 16px;
    font-family: "SF Mono", monospace;
    font-size: 13px;
    color: #8B949E;
    line-height: 1.6;
    overflow: hidden;
    word-break: break-all;
  }
  .code-highlight {
    color: #34D399;
    font-weight: 600;
  }
  .button-primary {
    background: linear-gradient(135deg, #E2AC55 0%, #B88225 100%);
    color: #08090C;
    border: none;
    border-radius: 14px;
    padding: 18px;
    font-size: 16px;
    font-weight: 700;
    text-align: center;
    letter-spacing: 1px;
    text-transform: uppercase;
    box-shadow: 0 8px 24px rgba(226, 172, 85, 0.3);
  }
  .button-outline {
    background: #11141B;
    color: #E2AC55;
    border: 1px solid #E2AC55;
    border-radius: 14px;
    padding: 16px;
    font-size: 15px;
    font-weight: 600;
    text-align: center;
    letter-spacing: 1px;
  }
  .tab-bar {
    height: 84px;
    border-top: 1px solid #1C212B;
    background: #0B0D12;
    display: flex;
    justify-content: space-around;
    align-items: center;
    padding: 0 16px;
  }
  .tab-item {
    display: flex;
    flex-direction: column;
    align-items: center;
    gap: 6px;
    font-family: monospace;
    font-size: 13px;
    font-weight: 700;
    color: #6E7681;
  }
  .tab-item.active {
    color: #E2AC55;
  }
  .tab-indicator {
    width: 26px;
    height: 3px;
    background: #E2AC55;
    border-radius: 2px;
  }
`;

function getPhoneHtml(title: string, subtitle: string, activeTab: number, contentHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  ${baseCss}
  .main-content {
    flex: 1;
    padding: 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 18px;
    overflow: hidden;
  }
</style>
</head>
<body>
  <div class="status-bar">
    <span>9:41</span>
    <div class="status-icons">
      <span>5G</span>
      <span>100%</span>
    </div>
  </div>
  <div class="header">
    <div class="brand-line">WROUGHTMARK // MOBILE FOUNDRY</div>
    <div class="title">${title}</div>
    <div class="subtitle">${subtitle}</div>
  </div>
  <div class="main-content">
    ${contentHtml}
  </div>
  <div class="tab-bar">
    <div class="tab-item ${activeTab === 1 ? 'active' : ''}">
      <span>01 CO-SIGN</span>
      ${activeTab === 1 ? '<div class="tab-indicator"></div>' : ''}
    </div>
    <div class="tab-item ${activeTab === 2 ? 'active' : ''}">
      <span>02 SLATE</span>
      ${activeTab === 2 ? '<div class="tab-indicator"></div>' : ''}
    </div>
    <div class="tab-item ${activeTab === 3 ? 'active' : ''}">
      <span>03 VERIFY</span>
      ${activeTab === 3 ? '<div class="tab-indicator"></div>' : ''}
    </div>
  </div>
</body>
</html>`;
}

function getDualPaneHtml(title: string, subtitle: string, badgeText: string, leftHtml: string, rightHtml: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${title}</title>
<style>
  ${baseCss}
  .dual-pane-content {
    flex: 1;
    padding: 32px 48px;
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 32px;
    overflow: hidden;
  }
  .pane-column {
    display: flex;
    flex-direction: column;
    gap: 20px;
    overflow: hidden;
  }
</style>
</head>
<body>
  <div class="status-bar">
    <span>9:41</span>
    <div class="status-icons">
      <span>5G</span>
      <span>100%</span>
    </div>
  </div>
  <div class="header">
    <div class="brand-line">
      <span>WROUGHTMARK // FOUNDRY WORKSTATION</span>
      <span class="badge badge-emerald">● ${badgeText}</span>
    </div>
    <div class="title">${title}</div>
    <div class="subtitle">${subtitle}</div>
  </div>
  <div class="dual-pane-content">
    <div class="pane-column">
      ${leftHtml}
    </div>
    <div class="pane-column" style="border-left: 1px solid #1C212B; padding-left: 32px;">
      ${rightHtml}
    </div>
  </div>
</body>
</html>`;
}

// 1. PHONE SCREEN 1: CO-SIGN
const phoneScreen1 = `
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span class="badge badge-emerald">● HARDWARE ENCLAVE ACTIVE</span>
      <span style="font-family: monospace; color: #8B949E; font-size: 13px;">KEY-SLOT #01</span>
    </div>
    <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">Foundry Desktop Pairing</div>
    <div style="color: #8B949E; font-size: 15px; margin-bottom: 16px;">Biometric challenge co-signing commits, drafts, and renders via local hardware attestation.</div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">Co-Signed Keystrokes</div>
        <div class="stat-value" style="color: #34D399;">18,492</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Variance Window</div>
        <div class="stat-value" style="color: #E2AC55;">142 ± 18ms</div>
      </div>
    </div>
  </div>

  <div class="card" style="padding: 20px;">
    <div class="stat-label" style="margin-bottom: 10px;">Live Hardware Signature Stream</div>
    <div class="code-box">
      <div>[11:02:14.218] <span class="code-highlight">SIG_OK</span> ed25519:7c9e8f41...21b4a098</div>
      <div>[11:02:14.360] <span class="code-highlight">SIG_OK</span> ed25519:9a12c401...88b2e1f4</div>
      <div>[11:02:14.492] <span class="code-highlight">SIG_OK</span> ed25519:3d88ef55...aa0192c7</div>
      <div style="color: #565D68; margin-top: 6px;">→ Zero Raw Audio or Image Uploads Guaranteed</div>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 12px; margin-top: auto;">
    <div class="button-primary">Stamp Biometric Pulse</div>
    <div class="button-outline">Rotate Secure Enclave Key</div>
  </div>
`;

// 2. PHONE SCREEN 2: SLATE
const phoneScreen2 = `
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span class="badge badge-brass">● PHYSICAL SENSING</span>
      <span style="font-family: monospace; color: #8B949E; font-size: 13px;">ROOM TONE 5S</span>
    </div>
    <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">Studio Clapper & Entropy Slate</div>
    <div style="color: #8B949E; font-size: 15px; margin-bottom: 16px;">Ambient acoustic entropy anchors creative takes locally in Rust without recording speech.</div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">Noise Floor</div>
        <div class="stat-value" style="color: #E2AC55;">38.4 dB</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Physical Craft</div>
        <div class="stat-value" style="color: #34D399;">100% REAL</div>
      </div>
    </div>
  </div>

  <div class="card" style="padding: 20px;">
    <div class="stat-label" style="margin-bottom: 10px;">Acoustic Spectrum & Hash</div>
    <div style="display: flex; gap: 6px; height: 50px; align-items: flex-end; margin-bottom: 14px; padding: 0 8px;">
      <div style="flex: 1; background: #232936; height: 35%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #E2AC55; height: 65%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #E2AC55; height: 85%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #34D399; height: 100%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #E2AC55; height: 75%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #232936; height: 45%; border-radius: 4px;"></div>
      <div style="flex: 1; background: #34D399; height: 90%; border-radius: 4px;"></div>
    </div>
    <div class="code-box">
      <div>ROOM_HASH: <span class="code-highlight">sha256:d84f103a89e1b27c...</span></div>
      <div>ACOUSTICS: Certified Non-Synthetic Natural Decay</div>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 12px; margin-top: auto;">
    <div class="button-primary" style="background: linear-gradient(135deg, #34D399 0%, #059669 100%);">Capture Physical Slate</div>
    <div class="button-outline">Calibrate Room Threshold</div>
  </div>
`;

// 3. PHONE SCREEN 3: VERIFY
const phoneScreen3 = `
  <div class="card" style="border-color: rgba(52, 211, 153, 0.4); background: linear-gradient(180deg, #101B17 0%, #11141B 100%);">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span class="badge badge-emerald">✓ PROVENANCE VERIFIED</span>
      <span style="font-family: monospace; color: #34D399; font-weight: 700; font-size: 15px;">100% ORGANIC</span>
    </div>
    <div style="font-size: 24px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">Authentic Human Authorship</div>
    <div style="color: #8B949E; font-size: 15px; margin-bottom: 16px;">Seal ID: wm-seal-2026-8841-792f. Verified offline on-device via local Ed25519 DAG inspection.</div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">Active Work</div>
        <div class="stat-value" style="color: #E2AC55;">4h 18m</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Keystroke Events</div>
        <div class="stat-value" style="color: #34D399;">32,840</div>
      </div>
    </div>
  </div>

  <div class="card" style="padding: 20px;">
    <div class="stat-label" style="margin-bottom: 10px;">Hardware Witness Assertions</div>
    <div class="code-box">
      <div>AUTHOR: RD Crampton (Key: ed25519:3a8f...c891)</div>
      <div>WITNESS: Bitcoin Anchor Block #982,104</div>
      <div>WITNESS: StrongBox Hardware Biometrics Active</div>
      <div style="color: #34D399; margin-top: 6px;">STATUS: Certified Process Provenance (USCO Compliant)</div>
    </div>
  </div>

  <div style="display: flex; flex-direction: column; gap: 12px; margin-top: auto;">
    <div class="button-primary">Run Offline Seal Verification</div>
    <div class="button-outline">Export Cryptographic Dossier</div>
  </div>
`;

// 4. DUAL-PANE FOLDABLE / IPAD WORKSTATION (Left: Co-Signer, Right: Slate & Verifier)
const dualPaneLeft = `
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px;">
      <span class="badge badge-emerald">● STRONG-BOX ATTESTATION ACTIVE</span>
      <span style="font-family: monospace; color: #8B949E; font-size: 14px;">PAIRING: WM-8492</span>
    </div>
    <div style="font-size: 26px; font-weight: 700; color: #FFFFFF; margin-bottom: 8px;">Foundry Workstation Co-Signer</div>
    <div style="color: #8B949E; font-size: 15px; margin-bottom: 16px;">Direct hardware attestation pairs your mobile device with your desktop writing, DAW, or 3D viewport.</div>
    <div class="stat-grid">
      <div class="stat-box">
        <div class="stat-label">Attested Events</div>
        <div class="stat-value" style="color: #34D399;">18,492</div>
      </div>
      <div class="stat-box">
        <div class="stat-label">Hardware Enclave</div>
        <div class="stat-value" style="color: #E2AC55;">SECURE</div>
      </div>
    </div>
  </div>

  <div class="card" style="padding: 20px; flex: 1;">
    <div class="stat-label" style="margin-bottom: 10px;">Hardware Witness Event Stream</div>
    <div class="code-box" style="height: 140px;">
      <div>[11:02:14.218] <span class="code-highlight">SIG_OK</span> BIOMETRIC_WRIST_PULSE (ed25519:7c9e8f41...)</div>
      <div>[11:02:14.360] <span class="code-highlight">SIG_OK</span> ROOM_TONE_AUDIO (sha256:9a12c401...)</div>
      <div>[11:02:14.492] <span class="code-highlight">SIG_OK</span> HANDWRITTEN_OUTLINE (sha256:3d88ef55...)</div>
      <div>[11:02:14.610] <span class="code-highlight">SIG_OK</span> KEYSTROKE_CADENCE (ed25519:1b48ef90...)</div>
      <div style="color: #565D68; margin-top: 6px;">→ Local Enclave Only · 0 Remote Bytes</div>
    </div>
    <div style="margin-top: 16px;">
      <div class="button-primary">Stamp Biometric Pulse</div>
    </div>
  </div>
`;

const dualPaneRight = `
  <div class="card">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span class="badge badge-brass">● PHYSICAL SLATE</span>
      <span style="font-family: monospace; color: #8B949E; font-size: 13px;">ACOUSTIC WITNESS</span>
    </div>
    <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">Acoustic Room Tone & Clapper</div>
    <div style="color: #8B949E; font-size: 14px; margin-bottom: 14px;">Record ambient acoustic tone and motion signatures to anchor the start of creative takes.</div>
    <div style="display: flex; gap: 10px;">
      <div class="button-outline" style="flex: 1; padding: 12px; font-size: 13px;">Capture 5s Room Tone</div>
      <div class="button-outline" style="flex: 1; padding: 12px; font-size: 13px;">Outline Hash</div>
    </div>
  </div>

  <div class="card" style="border-color: rgba(52, 211, 153, 0.4); background: linear-gradient(180deg, #101B17 0%, #11141B 100%); flex: 1;">
    <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
      <span class="badge badge-emerald">✓ ASSAY VERIFIED</span>
      <span style="font-family: monospace; color: #34D399; font-weight: 700;">SCORE 100/100</span>
    </div>
    <div style="font-size: 22px; font-weight: 700; color: #FFFFFF; margin-bottom: 6px;">Offline Pocket Verifier</div>
    <div style="color: #8B949E; font-size: 14px; margin-bottom: 12px;">Instant offline cryptographic verification of any *.seal.json or embedded media container.</div>
    <div class="code-box" style="margin-bottom: 14px;">
      <div>STATUS: <span class="code-highlight">SEAL VALID · HUMAN WROUGHT (100%)</span></div>
      <div>DIGEST: BLAKE3 + SHA-256 Validated</div>
      <div>WITNESS: Hardware Secure Enclave Face ID Token</div>
    </div>
    <div class="button-primary">Run Offline Seal Verification</div>
  </div>
`;

// Write HTML templates
writeFileSync(`${OUTPUT_DIR}/phone1.html`, getPhoneHtml("Hardware Co-Signer", "Secure Enclave & StrongBox Key Attestation", 1, phoneScreen1));
writeFileSync(`${OUTPUT_DIR}/phone2.html`, getPhoneHtml("Acoustic Slate", "Continuous Physical Environment Witness", 2, phoneScreen2));
writeFileSync(`${OUTPUT_DIR}/phone3.html`, getPhoneHtml("Offline Seal Verifier", "Process Provenance & Authorship Inspection", 3, phoneScreen3));
writeFileSync(`${OUTPUT_DIR}/dual_workstation.html`, getDualPaneHtml("Foundry Dual-Pane Workstation", "Co-Signing, Ambient Sensing & Offline Cryptographic Assay", "FOLDABLE ADAPTIVE ACTIVE", dualPaneLeft, dualPaneRight));

console.log("HTML screenshot templates ready. Rendering store assets via Chrome headless...");

const CHROME = "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome";
const ANDROID_DIR = "/Users/reginaldcrampton/.gemini/antigravity/scratch/wroughtmark/android/store/screenshots";
const APPLE_DIR = "/Users/reginaldcrampton/.gemini/antigravity/scratch/wroughtmark/apple/store/screenshots";

mkdirSync(ANDROID_DIR, { recursive: true });
mkdirSync(APPLE_DIR, { recursive: true });

interface RenderTarget {
  html: string;
  width: number;
  height: number;
  dest: string;
}

const targets: RenderTarget[] = [
  // Android Phone
  { html: "phone1.html", width: 1080, height: 2400, dest: `${ANDROID_DIR}/screen1_cosign_1080x2400.png` },
  { html: "phone2.html", width: 1080, height: 2400, dest: `${ANDROID_DIR}/screen2_slate_1080x2400.png` },
  { html: "phone3.html", width: 1080, height: 2400, dest: `${ANDROID_DIR}/screen3_verify_1080x2400.png` },

  // Android Foldables (Unfolded Inner & Folded Outer)
  { html: "dual_workstation.html", width: 2208, height: 1840, dest: `${ANDROID_DIR}/foldable1_unfolded_foundry_2208x1840.png` },
  { html: "dual_workstation.html", width: 2208, height: 1840, dest: `${ANDROID_DIR}/foldable2_unfolded_verify_2208x1840.png` },
  { html: "phone1.html", width: 1080, height: 2092, dest: `${ANDROID_DIR}/foldable3_folded_cover_1080x2092.png` },

  // Android Tablets (7" & 10")
  { html: "phone1.html", width: 1200, height: 1920, dest: `${ANDROID_DIR}/tablet7_1_portrait_1200x1920.png` },
  { html: "dual_workstation.html", width: 1920, height: 1200, dest: `${ANDROID_DIR}/tablet7_2_landscape_1920x1200.png` },
  { html: "phone1.html", width: 1600, height: 2560, dest: `${ANDROID_DIR}/tablet10_1_portrait_1600x2560.png` },
  { html: "dual_workstation.html", width: 2560, height: 1600, dest: `${ANDROID_DIR}/tablet10_2_landscape_2560x1600.png` },

  // Apple iPhone 6.9" / 6.7" (Super Retina XDR)
  { html: "phone1.html", width: 1290, height: 2796, dest: `${APPLE_DIR}/screen1_cosign_1290x2796.png` },
  { html: "phone2.html", width: 1290, height: 2796, dest: `${APPLE_DIR}/screen2_slate_1290x2796.png` },
  { html: "phone3.html", width: 1290, height: 2796, dest: `${APPLE_DIR}/screen3_verify_1290x2796.png` },

  // Apple iPhone 6.5"
  { html: "phone1.html", width: 1242, height: 2688, dest: `${APPLE_DIR}/iphone65_1_cosign_1242x2688.png` },
  { html: "phone2.html", width: 1242, height: 2688, dest: `${APPLE_DIR}/iphone65_2_slate_1242x2688.png` },
  { html: "phone3.html", width: 1242, height: 2688, dest: `${APPLE_DIR}/iphone65_3_verify_1242x2688.png` },

  // Apple iPad Pro 13" / Foldable Workstation
  { html: "dual_workstation.html", width: 2752, height: 2064, dest: `${APPLE_DIR}/ipad_13_dualpane_landscape_2752x2064.png` },
  { html: "dual_workstation.html", width: 2064, height: 2752, dest: `${APPLE_DIR}/ipad_13_dualpane_portrait_2064x2752.png` },
  { html: "dual_workstation.html", width: 2752, height: 2064, dest: `${APPLE_DIR}/ipad_13_verifier_2752x2064.png` },
];

for (const t of targets) {
  const url = `file://${OUTPUT_DIR}/${t.html}`;
  const cmd = `"${CHROME}" --headless=new --no-sandbox --disable-gpu --user-data-dir=/tmp/chrome_ss_${t.width}x${t.height} --window-size=${t.width},${t.height} --screenshot="${t.dest}" "${url}" 2>/dev/null`;
  try {
    execSync(cmd);
    console.log(`Rendered: ${t.dest.split("/").pop()} (${t.width}x${t.height})`);
  } catch (err: any) {
    console.error(`Failed to render ${t.dest}:`, err.message);
  }
}

console.log("All store screenshots generated successfully.");

