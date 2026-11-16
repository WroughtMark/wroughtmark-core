// swift-tools-version: 6.0
import Foundation
import PackageDescription

let xcframeworkPath = "\(Context.packageDirectory)/WroughtmarkCore.xcframework"
let hasXcframework = FileManager.default.fileExists(atPath: xcframeworkPath)

let coreLibDir = ProcessInfo.processInfo.environment["WROUGHTMARK_CORE_LIB_DIR"]
    ?? "\(Context.packageDirectory)/../core/target/debug"

var targets: [Target] = []

if hasXcframework {
    targets.append(
        .binaryTarget(
            name: "CWroughtmarkCore",
            path: "WroughtmarkCore.xcframework"
        )
    )
} else {
    targets.append(
        .target(
            name: "CWroughtmarkCore",
            path: "Sources/CWroughtmarkCore",
            publicHeadersPath: "include"
        )
    )
}

targets.append(
    .target(
        name: "WroughtmarkKit",
        dependencies: ["CWroughtmarkCore"],
        path: "Sources/WroughtmarkKit",
        linkerSettings: hasXcframework ? [] : [
            .unsafeFlags([
                "-L\(coreLibDir)",
                "-lwroughtmark_core"
            ])
        ]
    )
)

targets.append(
    .executableTarget(
        name: "WroughtmarkApp",
        dependencies: ["WroughtmarkKit"],
        path: "Sources/WroughtmarkApp",
        linkerSettings: hasXcframework ? [] : [
            .unsafeFlags([
                "-L\(coreLibDir)",
                "-lwroughtmark_core"
            ])
        ]
    )
)

targets.append(
    .testTarget(
        name: "WroughtmarkKitTests",
        dependencies: ["WroughtmarkKit"],
        path: "Tests/WroughtmarkKitTests"
    )
)

let package = Package(
    name: "WroughtmarkKit",
    platforms: [
        .macOS(.v14),
        .iOS(.v17),
        .watchOS(.v10),
        .visionOS(.v2)
    ],
    products: [
        .library(
            name: "WroughtmarkKit",
            targets: ["WroughtmarkKit"]
        ),
        .executable(
            name: "WroughtmarkApp",
            targets: ["WroughtmarkApp"]
        )
    ],
    targets: targets
)
