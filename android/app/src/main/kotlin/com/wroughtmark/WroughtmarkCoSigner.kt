package com.wroughtmark

import java.time.Instant

enum class CoSignerDeviceType(val wireValue: String, val enclaveLabel: String) {
    ANDROID("android", "android-strongbox"),
    WEAR_OS("wearos", "wearos-strongbox"),
    META_RAYBAN_DISPLAY("meta_rayban_display", "meta-rayban-display-emg"),
    HORIZON_OS_QUEST("horizon_os", "meta-quest-horizon-os"),
    ANDROID_XR("android_xr", "android-xr-spatial")
}

enum class PhysicalCaptureKind(val wireValue: String, val displayLabel: String) {
    ROOM_TONE_AUDIO("room_tone_audio", "Room-Tone Audio"),
    HANDWRITTEN_OUTLINE("handwritten_outline", "Handwritten Outline"),
    CANVAS_UNDERPAINTING("canvas_underpainting", "Canvas Sketch"),
    FILM_CLAPPER_SLATE("film_clapper_slate", "Film Clapper Slate"),
    BIOMETRIC_WRIST_PULSE("biometric_wrist_pulse", "Biometric Wrist Witness"),
    POV_STUDIO_FRAME("pov_studio_frame", "POV Studio Frame"),
    NEURAL_BAND_EMG_PINCH("neural_band_emg_pinch", "Neural Band sEMG Pinch"),
    SPATIAL_6DOF_SCULPT("spatial_6dof_sculpt", "6DoF Spatial Sculpt")
}

data class CoSignerEvent(
    val version: String = "0.1",
    val deviceType: CoSignerDeviceType,
    val captureKind: PhysicalCaptureKind = PhysicalCaptureKind.FILM_CLAPPER_SLATE,
    val timestampUTC: String,
    val artifactDigest: String,
    val blake3Digest: String = "",
    val biometricConfirmed: Boolean,
    val emgMotorVarianceBps: Int = 2450,
    val spatial6DofEntropyBps: Int = 3100,
    val note: String? = null
)

/**
 * Android, Wear OS, Meta Ray-Ban Display, Horizon OS & Android XR co-signer.
 */
object WroughtmarkCoSigner {
    fun buildPhysicalEvent(
        captureData: ByteArray,
        deviceType: CoSignerDeviceType,
        biometricConfirmed: Boolean,
        note: String? = null,
        captureKind: PhysicalCaptureKind = PhysicalCaptureKind.FILM_CLAPPER_SLATE,
        emgMotorVarianceBps: Int = 2450,
        spatial6DofEntropyBps: Int = 3100
    ): CoSignerEvent {
        val sha = WroughtmarkVerifier.sha256Hex(captureData)
        val b3 = WroughtmarkVerifier.blake3Hex(captureData)
        return CoSignerEvent(
            deviceType = deviceType,
            captureKind = captureKind,
            timestampUTC = Instant.now().toString(),
            artifactDigest = "sha256:$sha",
            blake3Digest = "blake3:$b3",
            biometricConfirmed = biometricConfirmed,
            emgMotorVarianceBps = emgMotorVarianceBps,
            spatial6DofEntropyBps = spatial6DofEntropyBps,
            note = note
        )
    }

    fun mintCoSignSeal(
        captureData: ByteArray,
        projectId: String,
        discipline: String = "film",
        deviceType: CoSignerDeviceType
    ): String? {
        return WroughtmarkVerifier.mintPhysicalSeal(
            capture = captureData,
            projectId = projectId,
            discipline = discipline,
            deviceLabel = deviceType.enclaveLabel,
            timestampUtc = Instant.now().toString()
        )
    }
}
