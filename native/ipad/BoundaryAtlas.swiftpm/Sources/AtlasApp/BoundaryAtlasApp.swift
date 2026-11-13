import SwiftUI

@MainActor @main struct BoundaryAtlasApp: App {
    @StateObject private var store = AtlasStore()
    var body: some Scene { WindowGroup { AtlasRootView(store:store) } }
}

enum AtlasTheme {
    static let paper=Color(red:0.992,green:0.98,blue:0.96)
    static let ink=Color(red:0.25,green:0.18,blue:0.15)
    static let accent=Color(red:0.69,green:0.22,blue:0.13)
    static let muted=Color(red:0.53,green:0.47,blue:0.42)
}
