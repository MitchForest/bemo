import SwiftUI

struct SettingsView: View {
    @AppStorage("ocrRecognitionLevel") private var ocrRecognitionLevel = "accurate"
    @AppStorage("ocrLanguage") private var ocrLanguage = "en-US"
    @AppStorage("defaultCopyMode") private var defaultCopyMode = "path"

    init() {}

    var body: some View {
        TabView {
            GeneralSettingsView()
                .tabItem {
                    Label("General", systemImage: "gear")
                }

            PermissionsSettingsView()
                .tabItem {
                    Label("Permissions", systemImage: "lock.shield")
                }

            OCRSettingsView(recognitionLevel: $ocrRecognitionLevel, language: $ocrLanguage)
                .tabItem {
                    Label("OCR", systemImage: "text.viewfinder")
                }

            FileCopySettingsView(defaultMode: $defaultCopyMode)
                .tabItem {
                    Label("Files", systemImage: "doc")
                }
        }
        .frame(width: 400, height: 280)
    }
}

struct GeneralSettingsView: View {
    var body: some View {
        Form {
            Section {
                Text("Keyboard Shortcuts")
                    .font(.headline)

                ForEach(HotkeyAction.allCases, id: \.self) { action in
                    HStack {
                        Text(action.title)
                        Spacer()
                        Text(action.shortcutLabel)
                            .foregroundColor(.secondary)
                    }
                }
            }
        }
        .padding()
    }
}

struct OCRSettingsView: View {
    @Binding var recognitionLevel: String
    @Binding var language: String

    var body: some View {
        Form {
            Picker("Recognition Level", selection: $recognitionLevel) {
                Text("Fast").tag("fast")
                Text("Accurate").tag("accurate")
            }
            .pickerStyle(.segmented)

            Picker("Language", selection: $language) {
                Text("English").tag("en-US")
                Text("Spanish").tag("es-ES")
                Text("French").tag("fr-FR")
                Text("German").tag("de-DE")
                Text("Chinese (Simplified)").tag("zh-Hans")
                Text("Japanese").tag("ja-JP")
            }
        }
        .padding()
    }
}

struct FileCopySettingsView: View {
    @Binding var defaultMode: String

    var body: some View {
        Form {
            Picker("Default Copy Mode", selection: $defaultMode) {
                Text("Copy Path").tag("path")
                Text("Copy Contents").tag("contents")
            }
            .pickerStyle(.radioGroup)

            Text("Tip: Hold Option when clicking to use the alternate mode")
                .font(.caption)
                .foregroundColor(.secondary)
        }
        .padding()
    }
}

struct PermissionsSettingsView: View {
    private var permissions = PermissionService.shared

    var body: some View {
        Form {
            PermissionRow(
                title: "Screen Recording",
                description: "Required for OCR screen capture",
                isGranted: permissions.screenRecordingGranted,
                onRequest: { permissions.requestScreenRecording() }
            )

            PermissionRow(
                title: "Accessibility",
                description: "Required for global keyboard shortcuts",
                isGranted: permissions.accessibilityGranted,
                onRequest: { permissions.requestAccessibility() }
            )
        }
        .padding()
        .onAppear {
            permissions.refresh()
        }
    }
}

private struct PermissionRow: View {
    let title: String
    let description: String
    let isGranted: Bool
    let onRequest: () -> Void

    var body: some View {
        HStack {
            VStack(alignment: .leading, spacing: 2) {
                HStack(spacing: 6) {
                    Image(systemName: isGranted ? "checkmark.circle.fill" : "xmark.circle.fill")
                        .foregroundStyle(isGranted ? .green : .red)

                    Text(title)
                        .font(.headline)
                }

                Text(description)
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }

            Spacer()

            if !isGranted {
                Button("Grant") {
                    onRequest()
                }
            } else {
                Text("Granted")
                    .font(.caption)
                    .foregroundStyle(.secondary)
            }
        }
        .padding(.vertical, 4)
    }
}
