package com.wroughtmark.wear

import com.wroughtmark.CoSignerDeviceType
import com.wroughtmark.CoSignerEvent
import com.wroughtmark.PhysicalCaptureKind
import com.wroughtmark.WroughtmarkCoSigner
import com.wroughtmark.ui.WroughtmarkComposePalette

/**
 * Wear OS Smartwatch companion controller & surface model (`WROUGHTMARK // WEAR OS`).
 * Pairs with desktop/mobile studio sessions to stamp StrongBox wrist biometric witness beats
 * and 5-second vocal/film room-tone slates (`AdapterKind::Physical`).
 */
class WroughtmarkWearSlateController {
    private val _events = mutableListOf<CoSignerEvent>()
    val events: List<CoSignerEvent> get() = _events

    val palette: WroughtmarkComposePalette = WroughtmarkComposePalette.Dark

    var statusLine: String = "WRIST STRONGBOX READY"
        private set
    var lastSealJson: String? = null
        private set

    fun stampWristWitness(): CoSignerEvent {
        return recordWearBeat(
            kind = PhysicalCaptureKind.BIOMETRIC_WRIST_PULSE,
            note = "Wear OS wrist biometric witness"
        )
    }

    fun markAudioSlateTake(): CoSignerEvent {
        return recordWearBeat(
            kind = PhysicalCaptureKind.ROOM_TONE_AUDIO,
            note = "Wear OS studio room-tone slate"
        )
    }

    private fun recordWearBeat(kind: PhysicalCaptureKind, note: String): CoSignerEvent {
        val payload = "wearos_${kind.wireValue}_${System.currentTimeMillis()}".toByteArray(Charsets.UTF_8)
        val ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData = payload,
            deviceType = CoSignerDeviceType.WEAR_OS,
            biometricConfirmed = true,
            note = note,
            captureKind = kind
        )
        _events.add(ev)
        statusLine = "ATTESTED #${_events.size}"
        lastSealJson = WroughtmarkCoSigner.mintCoSignSeal(
            captureData = payload,
            projectId = "wearos-studio-slate",
            discipline = "film",
            deviceType = CoSignerDeviceType.WEAR_OS
        )
        return ev
    }
}
