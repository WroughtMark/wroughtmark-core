package com.wroughtmark.ui

import com.wroughtmark.CoSignerDeviceType
import com.wroughtmark.CoSignerEvent
import com.wroughtmark.PhysicalCaptureKind
import com.wroughtmark.WroughtmarkCoSigner
import com.wroughtmark.WroughtmarkVerifier

enum class AndroidMobileTab(val title: String) {
    COSIGN("01 CO-SIGN"),
    SLATE("02 SLATE"),
    VERIFY("03 VERIFY")
}

data class WroughtmarkComposePalette(
    val bgHex: Long,
    val surfaceHex: Long,
    val borderHex: Long,
    val inkHex: Long,
    val mutedHex: Long,
    val brassHex: Long,
    val emeraldHex: Long,
    val crimsonHex: Long
) {
    companion object {
        val Dark = WroughtmarkComposePalette(
            bgHex = 0xFF090A0D,
            surfaceHex = 0xFF111318,
            borderHex = 0xFF2C3240,
            inkHex = 0xFFF2F4F8,
            mutedHex = 0xFFA1A8B6,
            brassHex = 0xFFE2AC55,
            emeraldHex = 0xFF34D399,
            crimsonHex = 0xFFF87171
        )
        val Light = WroughtmarkComposePalette(
            bgHex = 0xFFF7F7F5,
            surfaceHex = 0xFFFFFFFF,
            borderHex = 0xFF171A21,
            inkHex = 0xFF0F1218,
            mutedHex = 0xFF49505E,
            brassHex = 0xFF9D6616,
            emeraldHex = 0xFF0F6E43,
            crimsonHex = 0xFFB91C1C
        )
    }
}

/**
 * State controller for the 3-tab Android Phone/Tablet Jetpack Compose application
 * (01 Co-Sign & Pair, 02 Physical Studio Slate, 03 Offline Pocket Verifier).
 */
class WroughtmarkMobileController(
    val deviceType: CoSignerDeviceType = CoSignerDeviceType.ANDROID
) {
    var isDarkTheme: Boolean = true
        private set
    var activeTab: AndroidMobileTab = AndroidMobileTab.COSIGN
    var pairingCode: String = "WM-8492"
    var projectId: String = "android-studio-session"

    private val _events = mutableListOf<CoSignerEvent>()
    val events: List<CoSignerEvent> get() = _events

    var latestCaptureBytes: ByteArray = ByteArray(0)
        private set
    var latestSealJson: String = ""
        private set
    var lastVerifyPassed: Boolean? = null
        private set

    val palette: WroughtmarkComposePalette
        get() = if (isDarkTheme) WroughtmarkComposePalette.Dark else WroughtmarkComposePalette.Light

    fun toggleTheme() {
        isDarkTheme = !isDarkTheme
    }

    fun stampPhysicalCapture(
        kind: PhysicalCaptureKind,
        note: String = "StrongBox hardware witness"
    ): CoSignerEvent {
        val payload = "physical_${deviceType.wireValue}_${kind.wireValue}_${System.currentTimeMillis()}"
            .toByteArray(Charsets.UTF_8)
        val event = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData = payload,
            deviceType = deviceType,
            biometricConfirmed = true,
            note = note,
            captureKind = kind
        )
        _events.add(event)
        latestCaptureBytes = payload
        latestSealJson = WroughtmarkCoSigner.mintCoSignSeal(
            captureData = payload,
            projectId = projectId,
            discipline = "film",
            deviceType = deviceType
        ) ?: ""
        return event
    }

    fun verifyLatestSeal(): Boolean {
        if (latestCaptureBytes.isEmpty() || latestSealJson.isEmpty()) {
            stampPhysicalCapture(PhysicalCaptureKind.HANDWRITTEN_OUTLINE, "Sample physical take")
        }
        val ok = WroughtmarkVerifier.verify(latestCaptureBytes, latestSealJson)
        lastVerifyPassed = ok
        return ok
    }
}
