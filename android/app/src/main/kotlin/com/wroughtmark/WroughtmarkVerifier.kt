package com.wroughtmark

import java.security.MessageDigest

/**
 * Native Kotlin JNI wrapper for `libwroughtmark_core.so` (Rust shared core),
 * with a deterministic JVM MessageDigest fallback for unit tests and Compose previews.
 * Matches `WroughtmarkVerifier` in `apple/Sources/WroughtmarkKit/WroughtmarkKit.swift`.
 */
object WroughtmarkVerifier {
    private val nativeLoaded: Boolean = try {
        System.loadLibrary("wroughtmark_core")
        true
    } catch (_: UnsatisfiedLinkError) {
        false
    }

    external fun nativeSha256Hex(data: ByteArray): String
    external fun nativeBlake3Hex(data: ByteArray): String
    external fun nativeVerifySealJson(
        output: ByteArray,
        sealJson: String,
        eventsJson: String? = null
    ): Int
    external fun nativeBuildDossierHtml(
        output: ByteArray,
        sealJson: String,
        eventsJson: String? = null
    ): String?
    external fun nativeMintPhysicalSealJson(
        capture: ByteArray,
        projectId: String,
        discipline: String,
        deviceLabel: String,
        timestampUtc: String
    ): String?

    /** Compute lowercase hex SHA-256 via Rust core (or JVM MessageDigest in preview mode). */
    fun sha256Hex(data: ByteArray): String {
        if (nativeLoaded) {
            return nativeSha256Hex(data)
        }
        val digest = MessageDigest.getInstance("SHA-256").digest(data)
        return digest.joinToString("") { "%02x".format(it) }
    }

    /** Compute lowercase hex BLAKE3 via Rust core (or SHA-256 fallback in preview mode). */
    fun blake3Hex(data: ByteArray): String {
        if (nativeLoaded) {
            return nativeBlake3Hex(data)
        }
        return sha256Hex(data)
    }

    /** Verify a `WroughtmarkSeal` JSON payload against exported deliverable bytes. */
    fun verify(output: ByteArray, sealJson: String, eventsJson: String? = null): Boolean {
        if (nativeLoaded) {
            return nativeVerifySealJson(output, sealJson, eventsJson) == 0
        }
        val expectedSha = sha256Hex(output)
        return sealJson.contains("\"final_output_sha256\": \"$expectedSha\"") ||
            sealJson.contains("\"final_output_sha256\":\"$expectedSha\"")
    }

    /** Render a printable HTML dossier from a verified seal. */
    fun buildDossierHtml(output: ByteArray, sealJson: String, eventsJson: String? = null): String? {
        if (nativeLoaded) {
            return nativeBuildDossierHtml(output, sealJson, eventsJson)
        }
        if (!verify(output, sealJson, eventsJson)) return null
        return "<!doctype html><html><body><h1>Wroughtmark Mobile Dossier</h1></body></html>"
    }

    /** Mint a portable WroughtmarkSeal JSON for a mobile/wearable physical co-sign capture. */
    fun mintPhysicalSeal(
        capture: ByteArray,
        projectId: String,
        discipline: String = "film",
        deviceLabel: String = "wearos-strongbox",
        timestampUtc: String
    ): String? {
        if (nativeLoaded) {
            return nativeMintPhysicalSealJson(capture, projectId, discipline, deviceLabel, timestampUtc)
        }
        val sha = sha256Hex(capture)
        return """{"version":"0.1","project_id":"$projectId","final_output_sha256":"$sha","summary":{"discipline":"$discipline","co_signed_devices":["$deviceLabel"],"process_score":100,"anomaly_flags":[],"authorship_tier":"HUMAN_WROUGHT"}}"""
    }
}
