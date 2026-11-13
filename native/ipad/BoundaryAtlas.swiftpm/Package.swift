// swift-tools-version: 5.9
import PackageDescription
import AppleProductTypes

let package = Package(
    name: "Boundary Atlas",
    platforms: [.iOS("17.0")],
    products: [
        .iOSApplication(
            name: "Boundary Atlas", targets: ["AtlasApp"],
            bundleIdentifier: "local.boundaryatlas.china.prototype",
            displayVersion: "0.1.1", bundleVersion: "2",
            appIcon: .placeholder(icon: .bird),
            accentColor: .presetColor(.orange),
            supportedDeviceFamilies: [.pad],
            supportedInterfaceOrientations: [.portrait, .landscapeLeft, .landscapeRight]
        )
    ],
    targets: [
        .target(name: "AtlasCore", resources: [.copy("Resources")]),
        .executableTarget(name: "AtlasApp", dependencies: ["AtlasCore"]),
        .testTarget(name: "AtlasCoreTests", dependencies: ["AtlasCore"])
    ],
    swiftLanguageVersions: [.v5]
)
