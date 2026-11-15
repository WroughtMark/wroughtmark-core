import Foundation
import Testing
@testable import WroughtmarkKit

@Test("Swift FFI computes SHA-256 via Rust core")
func sha256ViaRustFFI() {
    let data = Data("hello wroughtmark".utf8)
    let digest = WroughtmarkVerifier.sha256Hex(of: data)
    #expect(digest != nil)
    #expect(digest?.count == 64)
}

@Test("Swift FFI rejects invalid seal JSON")
func invalidSealRejected() {
    let data = Data("sample".utf8)
    let ok = WroughtmarkVerifier.verify(output: data, sealJSON: "{}")
    #expect(ok == false)
    let dossier = WroughtmarkVerifier.buildDossierHTML(output: data, sealJSON: "{}")
    #expect(dossier == nil)
}

@Test("CreativeDiscipline classifies all four disciplines")
func classifiesDisciplines() {
    #expect(CreativeDiscipline.classify(url: URL(fileURLWithPath: "/tmp/book.md")) == .writing)
    #expect(CreativeDiscipline.classify(url: URL(fileURLWithPath: "/tmp/mix.logicx")) == .music)
    #expect(CreativeDiscipline.classify(url: URL(fileURLWithPath: "/tmp/art.procreate")) == .visual)
    #expect(CreativeDiscipline.classify(url: URL(fileURLWithPath: "/tmp/cut.drp")) == .film)
    #expect(CreativeDiscipline.classify(url: URL(fileURLWithPath: "/tmp/ignore.tmp")) == nil)
}

@Test("WroughtmarkCoSigner builds physical proof event via Rust core")
func buildsPhysicalCoSignerEvent() {
    let capture = Data("studio_room_tone_sample".utf8)
    let event = WroughtmarkCoSigner.buildPhysicalEvent(
        captureData: capture,
        deviceType: .watchos,
        biometricConfirmed: true,
        note: "Slate take 3"
    )
    #expect(event != nil)
    #expect(event?.deviceType == .watchos)
    #expect(event?.biometricConfirmed == true)
    #expect(event?.artifactDigest.hasPrefix("sha256:") == true)
    #expect(event?.blake3Digest.hasPrefix("blake3:") == true)
}

@Test("iOS and watchOS CoSigner mints and verifies hardware-attested physical seal")
func mintsAndVerifiesMobileAndWatchSeal() {
    let capture = Data("watch_wrist_slate_audio_take_01".utf8)
    let sealJSON = WroughtmarkCoSigner.mintCoSignSeal(
        captureData: capture,
        projectID: "watch-film-slate",
        discipline: "film",
        deviceType: .watchos
    )
    #expect(sealJSON != nil)
    guard let sealJSON else { return }
    #expect(sealJSON.contains("watchos-secure-enclave"))
    #expect(sealJSON.contains("HUMAN_WROUGHT"))
    #expect(WroughtmarkVerifier.verify(output: capture, sealJSON: sealJSON) == true)
    #expect(WroughtmarkVerifier.verify(output: Data("tampered".utf8), sealJSON: sealJSON) == false)
}

@Test("visionOS Optic ID and Meta Ray-Ban Display Neural Band co-sign and verify")
func visionOSAndMetaDisplayCoSign() {
    let povCapture = Data("meta_display_pov_studio_take_04".utf8)
    let emgEvent = WroughtmarkCoSigner.buildPhysicalEvent(
        captureData: povCapture,
        deviceType: .metaRayBanDisplay,
        biometricConfirmed: true,
        note: "Neural Band sEMG pinch witness",
        captureKind: .neuralBandEmgPinch,
        emgMotorVarianceBps: 2680,
        spatial6DofEntropyBps: 2950
    )
    #expect(emgEvent != nil)
    #expect(emgEvent?.deviceType == .metaRayBanDisplay)
    #expect(emgEvent?.captureKind == .neuralBandEmgPinch)
    #expect(emgEvent?.emgMotorVarianceBps == 2680)

    let visionSeal = WroughtmarkCoSigner.mintCoSignSeal(
        captureData: povCapture,
        projectID: "xr-sculpt-studio",
        discipline: "visual",
        deviceType: .visionos
    )
    #expect(visionSeal != nil)
    guard let visionSeal else { return }
    #expect(visionSeal.contains("visionos-secure-enclave"))
    #expect(WroughtmarkVerifier.verify(output: povCapture, sealJSON: visionSeal) == true)
}
