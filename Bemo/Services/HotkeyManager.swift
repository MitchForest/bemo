import AppKit
import Carbon

struct KeyModifiers: OptionSet, Sendable {
    let rawValue: UInt32

    static let command = KeyModifiers(rawValue: UInt32(cmdKey))
    static let shift = KeyModifiers(rawValue: UInt32(shiftKey))
}

@MainActor
final class HotkeyManager {
    private var hotkeys: [UInt32: @MainActor () -> Void] = [:]
    nonisolated(unsafe) private var hotKeyRefs: [EventHotKeyRef?] = []
    private var nextId: UInt32 = 1

    init() {
        setupEventHandler()
    }

    deinit {
        for hotKeyRef in hotKeyRefs {
            if let ref = hotKeyRef {
                UnregisterEventHotKey(ref)
            }
        }
    }

    private func setupEventHandler() {
        var eventType = EventTypeSpec(eventClass: OSType(kEventClassKeyboard), eventKind: UInt32(kEventHotKeyPressed))

        InstallEventHandler(
            GetApplicationEventTarget(),
            { (_, event, userData) -> OSStatus in
                guard let userData = userData else { return OSStatus(eventNotHandledErr) }

                let manager = Unmanaged<HotkeyManager>.fromOpaque(userData).takeUnretainedValue()

                var hotKeyID = EventHotKeyID()
                GetEventParameter(
                    event,
                    EventParamName(kEventParamDirectObject),
                    EventParamType(typeEventHotKeyID),
                    nil,
                    MemoryLayout<EventHotKeyID>.size,
                    nil,
                    &hotKeyID
                )

                let hotkeyId = hotKeyID.id
                DispatchQueue.main.async { @MainActor in
                    if let callback = manager.hotkeys[hotkeyId] {
                        callback()
                    }
                }

                return noErr
            },
            1,
            &eventType,
            Unmanaged.passUnretained(self).toOpaque(),
            nil
        )
    }

    func registerHotkey(keyCode: UInt32, modifiers: KeyModifiers, callback: @escaping @MainActor () -> Void) {
        let id = nextId
        nextId += 1

        hotkeys[id] = callback

        let hotKeyID = EventHotKeyID(signature: OSType(0x434F5059), id: id) // "COPY"
        var hotKeyRef: EventHotKeyRef?

        let status = RegisterEventHotKey(
            keyCode,
            modifiers.rawValue,
            hotKeyID,
            GetApplicationEventTarget(),
            0,
            &hotKeyRef
        )

        if status == noErr {
            hotKeyRefs.append(hotKeyRef)
        }
    }
}
