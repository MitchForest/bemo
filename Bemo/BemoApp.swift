import SwiftUI

@main
struct BemoApp: App {
    @NSApplicationDelegateAdaptor(AppDelegate.self) var appDelegate

    var body: some Scene {
        // No main window - menubar only app
        Settings {
            SettingsView()
        }
    }
}
