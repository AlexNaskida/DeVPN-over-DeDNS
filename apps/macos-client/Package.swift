// swift-tools-version:5.9
import PackageDescription

let package = Package(
    name: "DVoDClient",
    platforms: [.macOS(.v13)],
    targets: [
        .executableTarget(
            name: "DVoDClient",
            path: "Sources/DVoDClient"
        )
    ]
)
