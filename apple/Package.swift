// swift-tools-version: 6.0
import Foundation
import PackageDescription

let coreLibDir = ProcessInfo.processInfo.environment["WROUGHTMARK_CORE_LIB_DIR"]
    ?? "\(Context.packageDirectory)/../core/target/debug"

let package = Package(
    name: "WroughtmarkKit",
    platforms: [
        .macOS(.v14)
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
    targets: [
        .target(
            name: "CWroughtmarkCore",
            path: "Sources/CWroughtmarkCore",
            publicHeadersPath: "include"
        ),
        .target(
            name: "WroughtmarkKit",
            dependencies: ["CWroughtmarkCore"],
            path: "Sources/WroughtmarkKit",
            linkerSettings: [
                .unsafeFlags([
                    "-L\(coreLibDir)",
                    "-lwroughtmark_core"
                ])
            ]
        ),
        .executableTarget(
            name: "WroughtmarkApp",
            dependencies: ["WroughtmarkKit"],
            path: "Sources/WroughtmarkApp",
            linkerSettings: [
                .unsafeFlags([
                    "-L\(coreLibDir)",
                    "-lwroughtmark_core"
                ])
            ]
        ),
        .testTarget(
            name: "WroughtmarkKitTests",
            dependencies: ["WroughtmarkKit"],
            path: "Tests/WroughtmarkKitTests"
        )
    ]
)
