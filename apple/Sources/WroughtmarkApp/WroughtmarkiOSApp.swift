#if os(iOS) || os(visionOS)
import SwiftUI
import WroughtmarkKit

@main
struct WroughtmarkiOSApp: App {
    var body: some Scene {
        WindowGroup {
            WroughtmarkMobileAppView()
        }
    }
}
#endif
