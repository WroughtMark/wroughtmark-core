import Foundation

public enum CoSignerDeviceType: String, Codable, Sendable, CaseIterable {
    case ios
    case ipados
    case watchos
    case visionos
    case metaRayBanDisplay = "meta_rayban_display"
}

public enum PhysicalCaptureKind: String, Codable, Sendable, CaseIterable {
    case studioRoomTone = "room_tone_audio"
    case handwrittenOutline = "handwritten_outline"
    case canvasUnderpainting = "canvas_underpainting"
    case filmClapperSlate = "film_clapper_slate"
    case biometricWristPulse = "biometric_wrist_pulse"
    case povStudioFrame = "pov_studio_frame"
    case neuralBandEmgPinch = "neural_band_emg_pinch"
    case spatial6DofSculpt = "spatial_6dof_sculpt"
}

public struct CoSignerEvent: Codable, Sendable, Equatable {
    public let version: String
    public let deviceType: CoSignerDeviceType
    public let captureKind: PhysicalCaptureKind
    public let timestampUTC: String
    public let artifactDigest: String
    public let blake3Digest: String
    public let biometricConfirmed: Bool
    public let emgMotorVarianceBps: UInt16
    public let spatial6DofEntropyBps: UInt16
    public let note: String?

    public init(
        version: String = "0.1",
        deviceType: CoSignerDeviceType,
        captureKind: PhysicalCaptureKind = .filmClapperSlate,
        timestampUTC: String,
        artifactDigest: String,
        blake3Digest: String = "",
        biometricConfirmed: Bool,
        emgMotorVarianceBps: UInt16 = 2450,
        spatial6DofEntropyBps: UInt16 = 3100,
        note: String? = nil
    ) {
        self.version = version
        self.deviceType = deviceType
        self.captureKind = captureKind
        self.timestampUTC = timestampUTC
        self.artifactDigest = artifactDigest
        self.blake3Digest = blake3Digest
        self.biometricConfirmed = biometricConfirmed
        self.emgMotorVarianceBps = emgMotorVarianceBps
        self.spatial6DofEntropyBps = spatial6DofEntropyBps
        self.note = note
    }
}

public enum WroughtmarkCoSigner {
    /// Hash raw physical capture bytes (photo, room-tone audio, or slate) via Rust core
    /// and construct a `CoSignerEvent` ready for signing and chain attachment.
    public static func buildPhysicalEvent(
        captureData: Data,
        deviceType: CoSignerDeviceType,
        biometricConfirmed: Bool,
        note: String? = nil,
        captureKind: PhysicalCaptureKind = .filmClapperSlate,
        emgMotorVarianceBps: UInt16 = 2450,
        spatial6DofEntropyBps: UInt16 = 3100,
        date: Date = Date()
    ) -> CoSignerEvent? {
        guard let sha = WroughtmarkVerifier.sha256Hex(of: captureData),
              let b3 = WroughtmarkVerifier.blake3Hex(of: captureData) else {
            return nil
        }
        let iso = ISO8601DateFormatter().string(from: date)
        return CoSignerEvent(
            deviceType: deviceType,
            captureKind: captureKind,
            timestampUTC: iso,
            artifactDigest: "sha256:\(sha)",
            blake3Digest: "blake3:\(b3)",
            biometricConfirmed: biometricConfirmed,
            emgMotorVarianceBps: emgMotorVarianceBps,
            spatial6DofEntropyBps: spatial6DofEntropyBps,
            note: note
        )
    }

    /// Mint a portable WroughtmarkSeal JSON from a physical or wearable co-sign event.
    public static func mintCoSignSeal(
        captureData: Data,
        projectID: String,
        discipline: String = "film",
        deviceType: CoSignerDeviceType,
        date: Date = Date()
    ) -> String? {
        let iso = ISO8601DateFormatter().string(from: date)
        return WroughtmarkVerifier.mintPhysicalSeal(
            capture: captureData,
            projectID: projectID,
            discipline: discipline,
            deviceLabel: "\(deviceType.rawValue)-secure-enclave",
            timestampUTC: iso
        )
    }
}
