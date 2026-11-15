package com.wroughtmark.xr

import com.wroughtmark.CoSignerDeviceType
import com.wroughtmark.CoSignerEvent
import com.wroughtmark.PhysicalCaptureKind
import com.wroughtmark.WroughtmarkCoSigner
import com.wroughtmark.ui.WroughtmarkComposePalette

/**
 * Controller for Meta Ray-Ban Display 600x600 right-lens monocular HUD
 * paired with the Meta Neural Band (surface-EMG pinch & flick biometrics) via Meta Wearables DAT.
 */
class WroughtmarkMetaDisplayHudController {
    private val _events = mutableListOf<CoSignerEvent>()
    val events: List<CoSignerEvent> get() = _events

    val hudResolutionPx: Pair<Int, Int> = 600 to 600
    val palette: WroughtmarkComposePalette = WroughtmarkComposePalette.Dark

    var lastEmgVarianceBps: Int = 2680
        private set
    var statusLine: String = "HUD 600x600 // NEURAL BAND DAT READY"
        private set
    var lastSealJson: String? = null
        private set

    fun pinchNeuralBandWitness(emgVarianceBps: Int = 2680): CoSignerEvent {
        lastEmgVarianceBps = emgVarianceBps
        return recordHudBeat(
            kind = PhysicalCaptureKind.NEURAL_BAND_EMG_PINCH,
            note = "Meta Neural Band sEMG pinch witness",
            emgVarianceBps = emgVarianceBps,
            spatialEntropyBps = 2950
        )
    }

    fun capturePovStudioFrameHash(emgVarianceBps: Int = 2590): CoSignerEvent {
        lastEmgVarianceBps = emgVarianceBps
        return recordHudBeat(
            kind = PhysicalCaptureKind.POV_STUDIO_FRAME,
            note = "Meta Ray-Ban Display POV studio frame hash (zero pixels uploaded)",
            emgVarianceBps = emgVarianceBps,
            spatialEntropyBps = 3040
        )
    }

    private fun recordHudBeat(
        kind: PhysicalCaptureKind,
        note: String,
        emgVarianceBps: Int,
        spatialEntropyBps: Int
    ): CoSignerEvent {
        val payload = "meta_display_${kind.wireValue}_${System.currentTimeMillis()}"
            .toByteArray(Charsets.UTF_8)
        val ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData = payload,
            deviceType = CoSignerDeviceType.META_RAYBAN_DISPLAY,
            biometricConfirmed = true,
            note = note,
            captureKind = kind,
            emgMotorVarianceBps = emgVarianceBps,
            spatial6DofEntropyBps = spatialEntropyBps
        )
        _events.add(ev)
        statusLine = "HUD STAMPED #${_events.size} // sEMG ${emgVarianceBps}bps"
        lastSealJson = WroughtmarkCoSigner.mintCoSignSeal(
            captureData = payload,
            projectId = "meta-rayban-display-session",
            discipline = "visual",
            deviceType = CoSignerDeviceType.META_RAYBAN_DISPLAY
        )
        return ev
    }
}

/**
 * 6DoF spatial sculpting & virtual production co-signer controller for Meta Quest (Horizon OS)
 * and Google/Samsung Android XR headsets backed by `libwroughtmark_core.so`.
 */
class WroughtmarkSpatialXrController(
    val deviceType: CoSignerDeviceType = CoSignerDeviceType.HORIZON_OS_QUEST
) {
    private val _events = mutableListOf<CoSignerEvent>()
    val events: List<CoSignerEvent> get() = _events

    var last6DofEntropyBps: Int = 3420
        private set
    var lastSealJson: String? = null
        private set

    fun record6DofSculptBeat(
        spatialEntropyBps: Int = 3420,
        projectId: String = "xr-spatial-sculpt"
    ): CoSignerEvent {
        last6DofEntropyBps = spatialEntropyBps
        val payload = "${deviceType.wireValue}_6dof_${System.currentTimeMillis()}"
            .toByteArray(Charsets.UTF_8)
        val ev = WroughtmarkCoSigner.buildPhysicalEvent(
            captureData = payload,
            deviceType = deviceType,
            biometricConfirmed = true,
            note = "6DoF spatial brush/camera witness ($spatialEntropyBps bps)",
            captureKind = PhysicalCaptureKind.SPATIAL_6DOF_SCULPT,
            emgMotorVarianceBps = 2500,
            spatial6DofEntropyBps = spatialEntropyBps
        )
        _events.add(ev)
        lastSealJson = WroughtmarkCoSigner.mintCoSignSeal(
            captureData = payload,
            projectId = projectId,
            discipline = "visual",
            deviceType = deviceType
        )
        return ev
    }
}
