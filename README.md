# Bemo

A fast, minimal macOS menubar app for **OCR text capture**, **screenshots**, **screen recording**, and **clipboard history**.

## Features

### OCR Text Capture
Select any area of your screen and instantly extract text using Apple's Vision framework. The recognized text is automatically copied to your clipboard.

### Screenshots
Capture a selected screen region and save the image to disk and clipboard history.

### Screen Recording
Record a selected screen region or window with optional system audio, microphone, and camera overlay.

### Clipboard History
Keep track of your recent copies with a sleek dock-style panel. View, re-copy, or open items from your history.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌘⇧1** | OCR Capture — drag to select screen area, extracts text |
| **⌘⇧2** | Screenshot — drag to select screen area |
| **⌘⇧3** | Screen Recording — drag to select screen area |
| **⌘⇧4** | Window Recording — click a window to record |
| **⌘⇧V** | Toggle Clipboard History panel |

## Menubar

- **Click** the menubar icon → Toggle clipboard history
- **Right-click** the menubar icon → Show options menu

## Clipboard History

The clipboard dock shows your last 10 copied items with:
- Text preview
- Type indicator (OCR text)
- Timestamp
- One-click copy
- Expand to see full content
- Open in default app
- Delete items

## Requirements

- macOS 15.0+
- Screen Recording permission (for OCR, screenshots, and recording)
- Accessibility permission (for global hotkeys)
- Camera/Microphone permission (for recording with camera/mic)

## Installation

1. Open `Bemo.xcworkspace` in Xcode
2. Build and run (⌘R)
3. Grant Screen Recording permission when prompted

## Architecture

```
Bemo/
├── Bemo.xcworkspace/          # Open this in Xcode
├── Bemo/                      # App source
│   ├── App/                    # AppDelegate, lifecycle
│   ├── Services/               # Capture, OCR, clipboard, recording
│   ├── Views/                  # UI components
│   ├── Models/                 # ClipboardItem, RecordingStyle
│   └── Shared/                 # Shared types/utilities
└── Config/                     # Build configs and entitlements
```

## Tech Stack

- **SwiftUI** — Modern declarative UI
- **Vision** — OCR text recognition
- **ScreenCaptureKit** — Screen capture
- **Carbon** — Global hotkey registration
- **Swift 6** — Strict concurrency

---
