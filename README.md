# Bemo

A fast, minimal macOS menubar app for **OCR text capture** and **clipboard history**.

## Features

### OCR Text Capture
Select any area of your screen and instantly extract text using Apple's Vision framework. The recognized text is automatically copied to your clipboard.

### Clipboard History
Keep track of your recent copies with a sleek dock-style panel. View, re-copy, or open items from your history.

## Keyboard Shortcuts

| Shortcut | Action |
|----------|--------|
| **⌘⇧2** | OCR Capture — drag to select screen area, extracts text |
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

- macOS 14.0+
- Screen Recording permission (for OCR capture)

## Installation

1. Open `Bemo.xcworkspace` in Xcode
2. Build and run (⌘R)
3. Grant Screen Recording permission when prompted

## Architecture

```
Bemo/
├── Bemo.xcworkspace/          # Open this in Xcode
├── Bemo/                      # App shell
│   ├── AppDelegate.swift       # Menubar, hotkeys, lifecycle
│   └── BemoApp.swift          # App entry point
└── BemoPackage/               # Feature code (SPM)
    └── Sources/BemoFeature/
        ├── Models/             # ClipboardItem
        ├── Services/           # HotkeyManager, ClipboardHistoryManager
        ├── Theme/              # BemoTheme styling
        └── Views/              # UI components
```

## Tech Stack

- **SwiftUI** — Modern declarative UI
- **Vision** — OCR text recognition
- **ScreenCaptureKit** — Screen capture
- **Carbon** — Global hotkey registration
- **Swift 6** — Strict concurrency

---