import CWroughtmarkCore
import Foundation

/// Native Swift wrapper around `wroughtmark-core` (Rust C-ABI).
public enum WroughtmarkVerifier {
    /// Compute lowercase hex SHA-256 via the shared Rust core.
    public static func sha256Hex(of data: Data) -> String? {
        data.withUnsafeBytes { rawBuffer in
            let ptr = rawBuffer.bindMemory(to: UInt8.self).baseAddress
            guard let cStr = wm_sha256_hex(ptr, data.count) else {
                return nil
            }
            defer { wm_free_string(cStr) }
            return String(cString: cStr)
        }
    }

    /// Compute lowercase hex BLAKE3 via the shared Rust core.
    public static func blake3Hex(of data: Data) -> String? {
        data.withUnsafeBytes { rawBuffer in
            let ptr = rawBuffer.bindMemory(to: UInt8.self).baseAddress
            guard let cStr = wm_blake3_hex(ptr, data.count) else {
                return nil
            }
            defer { wm_free_string(cStr) }
            return String(cString: cStr)
        }
    }

    /// Mint a portable WroughtmarkSeal JSON for a mobile/wearable physical co-sign capture.
    public static func mintPhysicalSeal(
        capture: Data,
        projectID: String,
        discipline: String = "film",
        deviceLabel: String = "watchos-secure-enclave",
        timestampUTC: String = "2026-11-15T00:00:00Z"
    ) -> String? {
        capture.withUnsafeBytes { rawBuffer in
            let ptr = rawBuffer.bindMemory(to: UInt8.self).baseAddress
            return projectID.withCString { projPtr in
                discipline.withCString { discPtr in
                    deviceLabel.withCString { devPtr in
                        timestampUTC.withCString { tsPtr in
                            guard let cStr = wm_mint_physical_seal_json(
                                ptr,
                                capture.count,
                                projPtr,
                                discPtr,
                                devPtr,
                                tsPtr
                            ) else {
                                return nil
                            }
                            defer { wm_free_string(cStr) }
                            return String(cString: cStr)
                        }
                    }
                }
            }
        }
    }

    /// Verify a `WroughtmarkSeal` JSON payload against exported deliverable bytes.
    public static func verify(
        output: Data,
        sealJSON: String,
        eventsJSON: String? = nil
    ) -> Bool {
        output.withUnsafeBytes { rawBuffer in
            let ptr = rawBuffer.bindMemory(to: UInt8.self).baseAddress
            return sealJSON.withCString { sealPtr in
                if let eventsJSON {
                    return eventsJSON.withCString { evPtr in
                        wm_verify_seal_json(ptr, output.count, sealPtr, evPtr) == 0
                    }
                } else {
                    return wm_verify_seal_json(ptr, output.count, sealPtr, nil) == 0
                }
            }
        }
    }

    /// Verify a seal and render a printable HTML dossier via Rust core, or `nil` if invalid.
    public static func buildDossierHTML(
        output: Data,
        sealJSON: String,
        eventsJSON: String? = nil
    ) -> String? {
        output.withUnsafeBytes { rawBuffer in
            let ptr = rawBuffer.bindMemory(to: UInt8.self).baseAddress
            return sealJSON.withCString { sealPtr in
                let cStr: UnsafeMutablePointer<CChar>? = if let eventsJSON {
                    eventsJSON.withCString { evPtr in
                        wm_build_dossier_html(ptr, output.count, sealPtr, evPtr)
                    }
                } else {
                    wm_build_dossier_html(ptr, output.count, sealPtr, nil)
                }
                guard let cStr else { return nil }
                defer { wm_free_string(cStr) }
                return String(cString: cStr)
            }
        }
    }
}
