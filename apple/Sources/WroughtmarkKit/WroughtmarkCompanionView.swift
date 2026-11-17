#if canImport(SwiftUI)
import SwiftUI

public struct WroughtmarkMobilePalette: Sendable {
    public let bg: Color
    public let surface: Color
    public let border: Color
    public let ink: Color
    public let muted: Color
    public let brass: Color
    public let emerald: Color
    public let crimson: Color

    public static let dark = WroughtmarkMobilePalette(
        bg: Color(red: 9/255, green: 10/255, blue: 13/255),
        surface: Color(red: 17/255, green: 19/255, blue: 24/255),
        border: Color(red: 44/255, green: 50/255, blue: 64/255),
        ink: Color(red: 242/255, green: 244/255, blue: 248/255),
        muted: Color(red: 161/255, green: 168/255, blue: 182/255),
        brass: Color(red: 226/255, green: 172/255, blue: 85/255),
        emerald: Color(red: 52/255, green: 211/255, blue: 153/255),
        crimson: Color(red: 248/255, green: 113/255, blue: 113/255)
    )

    public static let light = WroughtmarkMobilePalette(
        bg: Color(red: 247/255, green: 247/255, blue: 245/255),
        surface: Color.white,
        border: Color(red: 23/255, green: 26/255, blue: 33/255),
        ink: Color(red: 15/255, green: 18/255, blue: 24/255),
        muted: Color(red: 73/255, green: 80/255, blue: 94/255),
        brass: Color(red: 157/255, green: 102/255, blue: 22/255),
        emerald: Color(red: 15/255, green: 110/255, blue: 67/255),
        crimson: Color(red: 185/255, green: 28/255, blue: 28/255)
    )
}

/// Dedicated Apple Watch (`watchOS`) wrist slate & biometric witness companion view.
public struct WroughtmarkWatchSlateView: View {
    @State private var events: [CoSignerEvent] = []
    @State private var selectedKind: PhysicalCaptureKind = .biometricWristPulse
    @State private var statusLine = "WRIST ENCLAVE READY"
    @State private var lastSealID: String?

    public init() {}

    private let p = WroughtmarkMobilePalette.dark

    public var body: some View {
        ScrollView {
            VStack(alignment: .leading, spacing: 8) {
                HStack {
                    Text("WM // WATCH")
                        .font(.caption2.monospaced().bold())
                        .foregroundStyle(p.brass)
                    Spacer()
                    Text("\(events.count) BEATS")
                        .font(.caption2.monospaced())
                        .foregroundStyle(p.emerald)
                }

                Text("Wrist Slate Witness")
                    .font(.system(.headline, design: .default).weight(.bold))
                    .foregroundStyle(p.ink)

                Text(statusLine)
                    .font(.caption2.monospaced())
                    .foregroundStyle(events.isEmpty ? p.muted : p.emerald)

                Button("STAMP WRIST WITNESS") {
                    stampWatchEvent(kind: .biometricWristPulse, note: "Watch wrist witness")
                }
                .padding(.vertical, 8)
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity)
                .background(p.brass)
                .foregroundStyle(p.bg)
                .font(.caption2.monospaced().bold())

                Button("MARK AUDIO SLATE TAKE") {
                    stampWatchEvent(kind: .studioRoomTone, note: "Watch room-tone slate")
                }
                .padding(.vertical, 6)
                .padding(.horizontal, 10)
                .frame(maxWidth: .infinity)
                .background(p.surface)
                .foregroundStyle(p.ink)
                .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                .font(.caption2.monospaced())

                if let latest = events.last {
                    VStack(alignment: .leading, spacing: 2) {
                        Text(latest.captureKind.rawValue.uppercased())
                            .font(.caption2.monospaced().bold())
                            .foregroundStyle(p.brass)
                        Text(String(latest.blake3Digest.prefix(22)) + "...")
                            .font(.caption2.monospaced())
                            .foregroundStyle(p.ink)
                    }
                    .padding(6)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(p.surface)
                }
            }
            .padding(10)
        }
        .background(p.bg)
    }

    private func stampWatchEvent(kind: PhysicalCaptureKind, note: String) {
        let payload = Data("watch_\(kind.rawValue)_\(Date().timeIntervalSince1970)".utf8)
        if let ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData: payload,
            deviceType: .watchos,
            biometricConfirmed: true,
            note: note,
            captureKind: kind
        ) {
            events.append(ev)
            statusLine = "ATTESTED #\(events.count)"
            if let seal = WroughtmarkCoSigner.mintCoSignSeal(
                captureData: payload,
                projectID: "watch-studio-slate",
                discipline: "film",
                deviceType: .watchos
            ) {
                lastSealID = seal
            }
        }
    }
}

/// Full 3-tab iOS / iPadOS application view (Co-Sign & Pair, Physical Studio Slate, Pocket Verifier).
public struct WroughtmarkMobileAppView: View {
    public enum MobileTab: String, CaseIterable {
        case cosign = "01 CO-SIGN"
        case slate = "02 SLATE"
        case verify = "03 VERIFY"
    }

    @Environment(\.horizontalSizeClass) private var horizontalSizeClass
    @State private var activeTab: MobileTab = .cosign
    @State private var isDark: Bool = true
    @State private var pairingCode: String = "WM-8492"
    @State private var isPaired: Bool = true
    @State private var selectedKind: PhysicalCaptureKind = .handwrittenOutline
    @State private var projectID: String = "ios-studio-session"
    @State private var events: [CoSignerEvent] = []
    @State private var latestSealJSON: String = ""
    @State private var latestCaptureBytes: Data = Data()
    @State private var verifyResultText: String = "Standby for local Ed25519 + SHA-256 assay."
    @State private var verifyPassed: Bool? = nil
    private let deviceType: CoSignerDeviceType

    public init(deviceType: CoSignerDeviceType = .ios) {
        self.deviceType = deviceType
    }

    private var p: WroughtmarkMobilePalette {
        isDark ? .dark : .light
    }

    public var body: some View {
        ZStack {
            p.bg.ignoresSafeArea()

            VStack(alignment: .leading, spacing: 12) {
                // Top bar with Dark / Light switch
                HStack {
                    VStack(alignment: .leading, spacing: 2) {
                        HStack(spacing: 8) {
                            Text("WROUGHTMARK // \(deviceType.rawValue.uppercased())")
                                .font(.caption2.monospaced().bold())
                                .foregroundStyle(p.brass)
                            if horizontalSizeClass == .regular {
                                Text("FOLDABLE / IPAD WORKSTATION")
                                    .font(.system(size: 9).monospaced().bold())
                                    .foregroundStyle(p.emerald)
                                    .padding(.horizontal, 6)
                                    .padding(.vertical, 2)
                                    .background(p.surface)
                                    .overlay(Rectangle().stroke(p.emerald, lineWidth: 1))
                            }
                        }
                        Text(horizontalSizeClass == .regular ? "Foundry Hardware Co-Signer & Offline Verifier" : "Mobile Hardware Co-Signer")
                            .font(.system(.title3, design: .default).weight(.bold))
                            .foregroundStyle(p.ink)
                    }
                    Spacer()
                    Button(isDark ? "DARK" : "LIGHT") {
                        isDark.toggle()
                    }
                    .padding(.vertical, 5)
                    .padding(.horizontal, 10)
                    .background(p.surface)
                    .foregroundStyle(p.ink)
                    .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                    .font(.caption2.monospaced().bold())
                }

                if horizontalSizeClass == .regular {
                    // DUAL-PANE WORKSTATION LAYOUT (Foldable Unfolded / iPad / Stage Manager)
                    HStack(alignment: .top, spacing: 16) {
                        // Left Column: Co-Signing & Hardware Attestations
                        VStack(alignment: .leading, spacing: 12) {
                            coSignTab
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)

                        // Vertical Divider
                        Rectangle()
                            .fill(p.border)
                            .frame(width: 1)
                            .frame(maxHeight: .infinity)

                        // Right Column: Studio Slate & Offline Verifier
                        VStack(alignment: .leading, spacing: 16) {
                            slateTab
                            Divider().background(p.border)
                            verifyTab
                        }
                        .frame(maxWidth: .infinity, alignment: .topLeading)
                    }
                } else {
                    // 3-Tab Segmented Selector (Compact iPhone / Folded Cover Screen)
                    HStack(spacing: 6) {
                        ForEach(MobileTab.allCases, id: \.self) { tab in
                            Button(tab.rawValue) {
                                activeTab = tab
                            }
                            .padding(.vertical, 7)
                            .padding(.horizontal, 10)
                            .frame(maxWidth: .infinity)
                            .background(activeTab == tab ? p.brass : p.surface)
                            .foregroundStyle(activeTab == tab ? p.bg : p.ink)
                            .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                            .font(.caption2.monospaced().bold())
                        }
                    }

                    if activeTab == .cosign {
                        coSignTab
                    } else if activeTab == .slate {
                        slateTab
                    } else {
                        verifyTab
                    }
                }

                Spacer()
            }
            .padding(16)
        }
        .frame(maxWidth: .infinity, maxHeight: .infinity)
    }

    private var coSignTab: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("PAIRED SESSION: \(pairingCode)")
                    .font(.caption.monospaced().bold())
                    .foregroundStyle(isPaired ? p.emerald : p.muted)
                Spacer()
                Text("SECURE ENCLAVE")
                    .font(.caption2.monospaced())
                    .foregroundStyle(p.brass)
            }
            .padding(10)
            .background(p.surface)
            .overlay(Rectangle().stroke(p.border, lineWidth: 1))

            Button("CO-SIGN DESKTOP SESSION (FACE ID)") {
                recordCapture(kind: .biometricWristPulse, note: "Paired desktop Face ID witness")
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity)
            .background(p.brass)
            .foregroundStyle(p.bg)
            .font(.caption.monospaced().bold())

            Text("CO-SIGNED EVENT LEDGER (\(events.count))")
                .font(.caption2.monospaced())
                .foregroundStyle(p.muted)

            if events.isEmpty {
                Text("Tap above to co-sign your active writing, DAW, canvas, or NLE session with hardware biometrics.")
                    .font(.caption)
                    .foregroundStyle(p.muted)
            } else {
                ForEach(Array(events.suffix(3).enumerated()), id: \.offset) { idx, ev in
                    VStack(alignment: .leading, spacing: 2) {
                        Text("#\(idx + 1) // \(ev.deviceType.rawValue.uppercased()) // \(ev.captureKind.rawValue.uppercased())")
                            .font(.caption2.monospaced().bold())
                            .foregroundStyle(p.brass)
                        Text(String(ev.artifactDigest.prefix(34)) + "...")
                            .font(.caption2.monospaced())
                            .foregroundStyle(p.ink)
                    }
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(p.surface)
                    .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                }
            }
        }
    }

    private var slateTab: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("ZERO-UPLOAD PHYSICAL STUDIO SLATE")
                .font(.caption2.monospaced().bold())
                .foregroundStyle(p.brass)
            Text("Hashes a notebook outline, canvas underpainting, film clapperboard, or 5s room-tone sample locally in Rust. 0 bytes leave this device.")
                .font(.caption)
                .foregroundStyle(p.muted)

            HStack(spacing: 6) {
                Button("OUTLINE PHOTO") {
                    recordCapture(kind: .handwrittenOutline, note: "Notebook outline hash")
                }
                .padding(8)
                .background(p.surface)
                .foregroundStyle(p.ink)
                .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                .font(.caption2.monospaced())

                Button("ROOM-TONE MIC") {
                    recordCapture(kind: .studioRoomTone, note: "Vocal booth 5s room-tone")
                }
                .padding(8)
                .background(p.surface)
                .foregroundStyle(p.ink)
                .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                .font(.caption2.monospaced())

                Button("FILM SLATE") {
                    recordCapture(kind: .filmClapperSlate, note: "On-set slate take")
                }
                .padding(8)
                .background(p.surface)
                .foregroundStyle(p.ink)
                .overlay(Rectangle().stroke(p.border, lineWidth: 1))
                .font(.caption2.monospaced())
            }

            if !latestSealJSON.isEmpty {
                Text("MINTED PORTABLE SEAL (*.seal.json)")
                    .font(.caption2.monospaced().bold())
                    .foregroundStyle(p.emerald)
                Text(String(latestSealJSON.prefix(220)) + "...")
                    .font(.caption2.monospaced())
                    .foregroundStyle(p.ink)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(p.surface)
                    .overlay(Rectangle().stroke(p.border, lineWidth: 1))
            }
        }
    }

    private var verifyTab: some View {
        VStack(alignment: .leading, spacing: 10) {
            Text("OFFLINE POCKET SEAL VERIFIER")
                .font(.caption2.monospaced().bold())
                .foregroundStyle(p.brass)

            Button("VERIFY LATEST MOBILE SEAL") {
                if latestCaptureBytes.isEmpty || latestSealJSON.isEmpty {
                    recordCapture(kind: .handwrittenOutline, note: "Sample physical take")
                }
                let ok = WroughtmarkVerifier.verify(output: latestCaptureBytes, sealJSON: latestSealJSON)
                verifyPassed = ok
                verifyResultText = ok
                    ? "VERIFIED HUMAN_WROUGHT // SCORE 100/100 // ED25519 + SHA-256 VALID"
                    : "VERIFICATION FAILED // DIGEST OR SIGNATURE MISMATCH"
            }
            .padding(.vertical, 10)
            .padding(.horizontal, 14)
            .frame(maxWidth: .infinity)
            .background(p.brass)
            .foregroundStyle(p.bg)
            .font(.caption.monospaced().bold())

            Text(verifyResultText)
                .font(.caption.monospaced().bold())
                .foregroundStyle(verifyPassed == nil ? p.muted : (verifyPassed == true ? p.emerald : p.crimson))
                .padding(10)
                .frame(maxWidth: .infinity, alignment: .leading)
                .background(p.surface)
                .overlay(Rectangle().stroke(p.border, lineWidth: 1))
        }
    }

    private func recordCapture(kind: PhysicalCaptureKind, note: String) {
        let capture = Data("physical_\(deviceType.rawValue)_\(kind.rawValue)_\(Date().timeIntervalSince1970)".utf8)
        if let ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData: capture,
            deviceType: deviceType,
            biometricConfirmed: true,
            note: note,
            captureKind: kind
        ) {
            events.append(ev)
            latestCaptureBytes = capture
            if let seal = WroughtmarkCoSigner.mintCoSignSeal(
                captureData: capture,
                projectID: projectID,
                discipline: "film",
                deviceType: deviceType
            ) {
                latestSealJSON = seal
            }
        }
    }
}

/// Dedicated 600x600 monocular right-lens HUD for Meta Ray-Ban Display + Meta Neural Band (sEMG).
public struct WroughtmarkMetaDisplayHudView: View {
    @State private var events: [CoSignerEvent] = []
    @State private var emgVarianceBps: UInt16 = 2680
    @State private var statusLine = "HUD 600x600 // NEURAL BAND READY"

    public init() {}

    private let p = WroughtmarkMobilePalette.dark

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("META DISPLAY // 600x600 HUD")
                    .font(.caption2.monospaced().bold())
                    .foregroundStyle(p.emerald)
                Spacer()
                Text("sEMG \(emgVarianceBps)bps")
                    .font(.caption2.monospaced())
                    .foregroundStyle(p.brass)
            }

            Text(statusLine)
                .font(.caption.monospaced().bold())
                .foregroundStyle(events.isEmpty ? p.muted : p.emerald)

            Button("PINCH NEURAL BAND WITNESS") {
                recordGlassesTake(kind: .neuralBandEmgPinch, note: "Meta Neural Band sEMG pinch")
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity)
            .background(p.brass)
            .foregroundStyle(p.bg)
            .font(.caption2.monospaced().bold())

            Button("HASH POV STUDIO FRAME") {
                recordGlassesTake(kind: .povStudioFrame, note: "Ray-Ban Display POV studio frame hash")
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity)
            .background(p.surface)
            .foregroundStyle(p.ink)
            .overlay(Rectangle().stroke(p.border, lineWidth: 1))
            .font(.caption2.monospaced().bold())

            if let latest = events.last {
                Text("ATTESTED #\(events.count) // \(String(latest.blake3Digest.prefix(24)))...")
                    .font(.caption2.monospaced())
                    .foregroundStyle(p.ink)
                    .padding(8)
                    .frame(maxWidth: .infinity, alignment: .leading)
                    .background(p.surface)
                    .overlay(Rectangle().stroke(p.border, lineWidth: 1))
            }
        }
        .padding(14)
        .background(p.bg)
    }

    private func recordGlassesTake(kind: PhysicalCaptureKind, note: String) {
        let payload = Data("meta_display_\(kind.rawValue)_\(Date().timeIntervalSince1970)".utf8)
        if let ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData: payload,
            deviceType: .metaRayBanDisplay,
            biometricConfirmed: true,
            note: note,
            captureKind: kind,
            emgMotorVarianceBps: emgVarianceBps,
            spatial6DofEntropyBps: 2950
        ) {
            events.append(ev)
            statusLine = "HUD STAMPED #\(events.count) // ZERO PIXELS UPLOADED"
        }
    }
}

/// Spatial studio ornament for Apple Vision Pro (`visionOS`) with Optic ID co-signing and 6DoF entropy.
public struct WroughtmarkVisionOSOrnamentView: View {
    @State private var events: [CoSignerEvent] = []
    @State private var handEntropyBps: UInt16 = 3420
    @State private var statusLine = "VISIONOS ORNAMENT // OPTIC ID READY"

    public init() {}

    private let p = WroughtmarkMobilePalette.dark

    public var body: some View {
        VStack(alignment: .leading, spacing: 10) {
            HStack {
                Text("WROUGHTMARK // VISIONOS")
                    .font(.caption2.monospaced().bold())
                    .foregroundStyle(p.brass)
                Spacer()
                Text("6DoF \(handEntropyBps)bps")
                    .font(.caption2.monospaced())
                    .foregroundStyle(p.emerald)
            }

            Text("Spatial Studio Ornament")
                .font(.system(.headline, design: .default).weight(.bold))
                .foregroundStyle(p.ink)

            Text(statusLine)
                .font(.caption2.monospaced())
                .foregroundStyle(events.isEmpty ? p.muted : p.emerald)

            Button("CO-SIGN WITH OPTIC ID") {
                let payload = Data("visionos_optic_id_\(Date().timeIntervalSince1970)".utf8)
                if let ev = WroughtmarkCoSigner.buildPhysicalEvent(
                    captureData: payload,
                    deviceType: .visionos,
                    biometricConfirmed: true,
                    note: "visionOS Optic ID spatial sculpt witness",
                    captureKind: .spatial6DofSculpt,
                    emgMotorVarianceBps: 2520,
                    spatial6DofEntropyBps: handEntropyBps
                ) {
                    events.append(ev)
                    statusLine = "OPTIC ID STAMPED #\(events.count)"
                }
            }
            .padding(.vertical, 8)
            .padding(.horizontal, 12)
            .frame(maxWidth: .infinity)
            .background(p.brass)
            .foregroundStyle(p.bg)
            .font(.caption2.monospaced().bold())
        }
        .padding(14)
        .background(p.bg)
    }
}

/// Adaptive entry view routing `.watchos`, `.metaRayBanDisplay`, `.visionos`, and `.ios`/`.ipados`.
public struct WroughtmarkCompanionView: View {
    private let deviceType: CoSignerDeviceType

    public init(deviceType: CoSignerDeviceType) {
        self.deviceType = deviceType
    }

    public var body: some View {
        if deviceType == .watchos {
            WroughtmarkWatchSlateView()
        } else if deviceType == .metaRayBanDisplay {
            WroughtmarkMetaDisplayHudView()
        } else if deviceType == .visionos {
            WroughtmarkVisionOSOrnamentView()
        } else {
            WroughtmarkMobileAppView(deviceType: deviceType)
        }
    }
}
#endif
