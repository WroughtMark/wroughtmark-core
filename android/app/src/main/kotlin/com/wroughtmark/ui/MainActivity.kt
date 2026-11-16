package com.wroughtmark.ui

import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.compose.foundation.background
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.Alignment
import androidx.compose.ui.Modifier
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.text.font.FontFamily
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.dp
import androidx.compose.ui.unit.sp
import com.wroughtmark.PhysicalCaptureKind

class MainActivity : ComponentActivity() {
    private val controller = WroughtmarkMobileController()

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContent {
            WroughtmarkAppScreen(controller)
        }
    }
}

@Composable
fun WroughtmarkAppScreen(controller: WroughtmarkMobileController) {
    var isDark by remember { mutableStateOf(controller.isDarkTheme) }
    var activeTab by remember { mutableStateOf(controller.activeTab) }
    var eventCount by remember { mutableIntStateOf(controller.events.size) }
    var lastVerify by remember { mutableStateOf(controller.lastVerifyPassed) }

    val palette = if (isDark) WroughtmarkComposePalette.Dark else WroughtmarkComposePalette.Light
    val bgColor = Color(palette.bgHex)
    val surfaceColor = Color(palette.surfaceHex)
    val borderColor = Color(palette.borderHex)
    val inkColor = Color(palette.inkHex)
    val mutedColor = Color(palette.mutedHex)
    val brassColor = Color(palette.brassHex)
    val emeraldColor = Color(palette.emeraldHex)

    Scaffold(
        topBar = {
            Row(
                modifier = Modifier
                    .fillMaxWidth()
                    .background(surfaceColor)
                    .padding(horizontal = 16.dp, vertical = 12.dp),
                horizontalArrangement = Arrangement.SpaceBetween,
                verticalAlignment = Alignment.CenterVertically
            ) {
                Column {
                    Text(
                        text = "WROUGHTMARK // FOUNDRY",
                        color = brassColor,
                        fontSize = 11.sp,
                        fontFamily = FontFamily.Monospace,
                        fontWeight = FontWeight.Bold
                    )
                    Text(
                        text = "Mobile Hardware Co-Signer",
                        color = inkColor,
                        fontSize = 16.sp,
                        fontWeight = FontWeight.SemiBold
                    )
                }
                Button(
                    onClick = {
                        controller.toggleTheme()
                        isDark = controller.isDarkTheme
                    },
                    colors = ButtonDefaults.buttonColors(containerColor = surfaceColor),
                    shape = RoundedCornerShape(4.dp),
                    contentPadding = PaddingValues(horizontal = 10.dp, vertical = 6.dp)
                ) {
                    Text(
                        text = if (isDark) "LIGHT" else "DARK",
                        color = brassColor,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 11.sp
                    )
                }
            }
        },
        bottomBar = {
            TabRow(
                selectedTabIndex = activeTab.ordinal,
                containerColor = surfaceColor,
                contentColor = brassColor
            ) {
                AndroidMobileTab.values().forEach { tab ->
                    Tab(
                        selected = activeTab == tab,
                        onClick = {
                            controller.activeTab = tab
                            activeTab = tab
                        },
                        text = {
                            Text(
                                text = tab.title,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 12.sp,
                                fontWeight = if (activeTab == tab) FontWeight.Bold else FontWeight.Normal,
                                color = if (activeTab == tab) brassColor else mutedColor
                            )
                        }
                    )
                }
            }
        },
        containerColor = bgColor
    ) { innerPadding ->
        Column(
            modifier = Modifier
                .fillMaxSize()
                .padding(innerPadding)
                .padding(16.dp)
        ) {
            when (activeTab) {
                AndroidMobileTab.COSIGN -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = surfaceColor)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "PHYSICAL PROOF OF CRAFT",
                                color = brassColor,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(6.dp))
                            Text(
                                text = "Pair with your desktop session to co-sign commits, manuscripts, or renders using StrongBox hardware key attestation.",
                                color = mutedColor,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Row(
                                modifier = Modifier.fillMaxWidth(),
                                horizontalArrangement = Arrangement.SpaceBetween,
                                verticalAlignment = Alignment.CenterVertically
                            ) {
                                Text(
                                    text = "PAIRING CODE: ${controller.pairingCode}",
                                    color = inkColor,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 14.sp,
                                    fontWeight = FontWeight.Bold
                                )
                                Text(
                                    text = "ACTIVE",
                                    color = emeraldColor,
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 12.sp
                                )
                            }
                        }
                    }

                    Spacer(modifier = Modifier.height(16.dp))

                    Text(
                        text = "HARDWARE WITNESS ATTESTATIONS ($eventCount)",
                        color = mutedColor,
                        fontFamily = FontFamily.Monospace,
                        fontSize = 12.sp
                    )

                    Spacer(modifier = Modifier.height(8.dp))

                    LazyColumn(modifier = Modifier.weight(1f)) {
                        items(controller.events) { ev ->
                            Card(
                                modifier = Modifier
                                    .fillMaxWidth()
                                    .padding(vertical = 4.dp),
                                shape = RoundedCornerShape(6.dp),
                                colors = CardDefaults.cardColors(containerColor = surfaceColor)
                            ) {
                                Row(
                                    modifier = Modifier
                                        .fillMaxWidth()
                                        .padding(12.dp),
                                    horizontalArrangement = Arrangement.SpaceBetween
                                ) {
                                    Column {
                                        Text(
                                            text = ev.captureKind.wireValue.uppercase(),
                                            color = inkColor,
                                            fontFamily = FontFamily.Monospace,
                                            fontSize = 12.sp,
                                            fontWeight = FontWeight.Bold
                                        )
                                        Text(
                                            text = ev.note ?: "",
                                            color = mutedColor,
                                            fontSize = 11.sp
                                        )
                                    }
                                    Text(
                                        text = "SIGNED",
                                        color = emeraldColor,
                                        fontFamily = FontFamily.Monospace,
                                        fontSize = 11.sp
                                    )
                                }
                            }
                        }
                    }

                    Button(
                        onClick = {
                            controller.stampPhysicalCapture(
                                PhysicalCaptureKind.BIOMETRIC_WRIST_PULSE,
                                "Android StrongBox Biometric Witness"
                            )
                            eventCount = controller.events.size
                        },
                        modifier = Modifier.fillMaxWidth(),
                        colors = ButtonDefaults.buttonColors(containerColor = brassColor),
                        shape = RoundedCornerShape(6.dp)
                    ) {
                        Text(
                            text = "STAMP BIOMETRIC PULSE",
                            color = Color(0xFF0C0D10),
                            fontFamily = FontFamily.Monospace,
                            fontWeight = FontWeight.Bold
                        )
                    }
                }

                AndroidMobileTab.SLATE -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = surfaceColor)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "STUDIO SLATE & ROOM TONE",
                                color = brassColor,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Record ambient acoustic room tone and spatial motion signatures to anchor the start of creative takes in audio, film, or physical drafting.",
                                color = mutedColor,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    controller.stampPhysicalCapture(
                                        PhysicalCaptureKind.ROOM_TONE_AUDIO,
                                        "5s Room Tone Studio Slate"
                                    )
                                    eventCount = controller.events.size
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = surfaceColor),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "CAPTURE 5S ROOM TONE",
                                    color = brassColor,
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }

                AndroidMobileTab.VERIFY -> {
                    Card(
                        modifier = Modifier.fillMaxWidth(),
                        shape = RoundedCornerShape(8.dp),
                        colors = CardDefaults.cardColors(containerColor = surfaceColor)
                    ) {
                        Column(modifier = Modifier.padding(16.dp)) {
                            Text(
                                text = "OFFLINE POCKET VERIFIER",
                                color = brassColor,
                                fontFamily = FontFamily.Monospace,
                                fontSize = 11.sp,
                                fontWeight = FontWeight.Bold
                            )
                            Spacer(modifier = Modifier.height(8.dp))
                            Text(
                                text = "Verify any .seal.json or embedded media container directly on your mobile device without uploading bytes to any cloud.",
                                color = mutedColor,
                                fontSize = 13.sp
                            )
                            Spacer(modifier = Modifier.height(16.dp))
                            Button(
                                onClick = {
                                    val result = controller.verifyLatestSeal()
                                    lastVerify = result
                                },
                                modifier = Modifier.fillMaxWidth(),
                                colors = ButtonDefaults.buttonColors(containerColor = brassColor),
                                shape = RoundedCornerShape(6.dp)
                            ) {
                                Text(
                                    text = "RUN OFFLINE SEAL VERIFICATION",
                                    color = Color(0xFF0C0D10),
                                    fontFamily = FontFamily.Monospace,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                            if (lastVerify != null) {
                                Spacer(modifier = Modifier.height(12.dp))
                                Text(
                                    text = if (lastVerify == true) "STATUS: SEAL VALID · HUMAN WROUGHT (100%)" else "STATUS: VERIFICATION FAILED",
                                    color = if (lastVerify == true) emeraldColor else Color(palette.crimsonHex),
                                    fontFamily = FontFamily.Monospace,
                                    fontSize = 12.sp,
                                    fontWeight = FontWeight.Bold
                                )
                            }
                        }
                    }
                }
            }
        }
    }
}
