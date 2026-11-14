import Foundation
import Testing
@testable import WroughtmarkKit

@Test("Swift FFI computes SHA-256 and BLAKE3 via Rust core")
func sha256AndBlake3ViaRustFFI() {
    let data = Data("hello wroughtmark".utf8)
    let sha = WroughtmarkVerifier.sha256Hex(of: data)
    let blake = WroughtmarkVerifier.blake3Hex(of: data)
    #expect(sha != nil)
    #expect(sha?.count == 64)
    #expect(blake != nil)
    #expect(blake?.count == 64)
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
