# Bemo Feature Sprints: Screenshot & Screen Recording

## Overview

Three incremental sprints to add capture capabilities to Bemo:

| Sprint | Feature | Description |
|--------|---------|-------------|
| **Sprint 1** | Screenshot Capture | Drag rectangle to capture screen region as image |
| **Sprint 2** | Quick Recording | Direct screen region recording with optional camera overlay |
| **Sprint 3** | Studio Recording | Composited recording with wallpaper background, styled frame, camera bubble |

**Target Platform:** macOS 14.0+ (Sonoma)  
**Key APIs:** ScreenCaptureKit, AVFoundation, Core Image, Vision

---

## Hotkey Assignments (All Sprints)

| Shortcut | Action | Key Code | Sprint |
|----------|--------|----------|--------|
| ⌘⇧2 | OCR Capture | `0x13` | Existing |
| ⌘⇧3 | Screenshot Capture | `0x14` | Sprint 1 |
| ⌘⇧4 | Screen Recording | `0x15` | Sprint 2 |
| ⌘⇧V | Clipboard History | `0x09` | Existing |

---

# Sprint 1: Screenshot Capture & Foundation

## Goals
- Refactor `SelectionOverlayController` for multi-mode support
- Add screenshot capture with save to clipboard + file
- Extend clipboard dock for image items
- Establish patterns for Sprint 2 & 3

## New Files

```
Bemo/
├── Shared/
│   └── CaptureMode.swift           # NEW - enum for capture types
├── Services/
│   └── ScreenshotService.swift     # NEW - save/copy images
└── (existing files modified)
```

---

## 1.1 Create CaptureMode Enum

- [ ] **Create `Bemo/Shared/CaptureMode.swift`**
  - [ ] Define `CaptureMode` enum with cases: `.ocr`, `.screenshot`, `.quickRecording`, `.studioRecording`
  - [ ] Add `instructions: String` computed property for overlay text
    - `.ocr` → "Drag to select text"
    - `.screenshot` → "Drag to capture screenshot"
    - `.quickRecording` → "Drag to select recording area"
    - `.studioRecording` → "Drag to select recording area"
  - [ ] Add `icon: String` computed property for SF Symbol
    - `.ocr` → "text.viewfinder"
    - `.screenshot` → "camera.viewfinder"
    - `.quickRecording` → "record.circle"
    - `.studioRecording` → "sparkles.rectangle.stack"
  - [ ] Add `accentColor: Color` computed property
    - `.ocr` → `.blue`
    - `.screenshot` → `.green`
    - `.quickRecording` → `.red`
    - `.studioRecording` → `.purple`
  - [ ] Mark as `Sendable` for actor isolation

---

## 1.2 Refactor SelectionOverlayController

- [ ] **Create `CaptureResult` enum**
  - [ ] Case `.ocrText(String)` - recognized text
  - [ ] Case `.screenshot(CGImage, CGRect)` - image and selection rect
  - [ ] Case `.recordingRegion(CGRect, CGDirectDisplayID)` - for recording modes

- [ ] **Update `SelectionOverlayController.start()` signature**
  - [ ] Add `mode: CaptureMode` parameter (default `.ocr`)
  - [ ] Store in `private var captureMode: CaptureMode`
  - [ ] Change completion type to `Result<CaptureResult, Error>`

- [ ] **Update `handleSelection(rect:screen:)` method**
  - [ ] Switch on `captureMode`:
    - `.ocr`: existing OCR flow → `.ocrText(text)`
    - `.screenshot`: crop image → `.screenshot(image, rect)`
    - `.quickRecording`, `.studioRecording`: → `.recordingRegion(rect, displayID)`

- [ ] **Add `handleScreenshotSelection(rect:screen:)` method**
  - [ ] Get display ID from screen
  - [ ] Get screenshot from `self.screenshots[displayID]`
  - [ ] Crop using `ImageCropper.crop()`
  - [ ] Complete with `.screenshot(croppedImage, rect)`

- [ ] **Update `SelectionOverlayView` for mode awareness**
  - [ ] Pass `captureMode` via initializer
  - [ ] Update `instructionsLayer`:
    - [ ] Show `captureMode.icon` instead of hardcoded icon
    - [ ] Show `captureMode.instructions` instead of hardcoded text
  - [ ] Use `captureMode.accentColor` for selection border gradient

---

## 1.3 Create ScreenshotService

- [ ] **Create `Bemo/Services/ScreenshotService.swift`**
  - [ ] Define as `@MainActor final class ScreenshotService`
  - [ ] Add `static let shared = ScreenshotService()`

- [ ] **Add `saveToClipboard(image: CGImage) -> Bool` method**
  - [ ] Create `NSImage` from `CGImage`
  - [ ] Get `NSPasteboard.general`
  - [ ] Call `clearContents()`
  - [ ] Write PNG data via `setData(_:forType: .png)`
  - [ ] Return success boolean

- [ ] **Add `generateFilename() -> String` method**
  - [ ] Format: `Screenshot YYYY-MM-DD at HH.MM.SS.png`
  - [ ] Use `DateFormatter` with appropriate format

- [ ] **Add `saveToFile(image: CGImage, filename: String?) async throws -> URL` method**
  - [ ] Generate filename if nil using `generateFilename()`
  - [ ] Get save directory from `UserDefaults` (default: `~/Desktop`)
  - [ ] Create `NSBitmapImageRep` from `CGImage`
  - [ ] Get PNG representation via `representation(using: .png, properties: [:])`
  - [ ] Write to file URL
  - [ ] Return saved URL

- [ ] **Add `save(image: CGImage, toClipboard: Bool, toFile: Bool) async throws -> URL?` method**
  - [ ] If `toClipboard`: call `saveToClipboard(image:)`
  - [ ] If `toFile`: call `saveToFile(image:)` and return URL
  - [ ] Return nil if only clipboard

- [ ] **Add `generateThumbnail(from image: CGImage, maxSize: CGFloat) -> Data?` method**
  - [ ] Scale image to fit within `maxSize` (e.g., 120px)
  - [ ] Convert to JPEG data with 0.8 quality
  - [ ] Return data for clipboard history storage

---

## 1.4 Extend ClipboardItem for Screenshots

- [ ] **Update `ClipboardItem.ItemType` enum**
  - [ ] Add case `.screenshot`
  - [ ] Update `icon` computed property: `.screenshot` → `"photo"`
  - [ ] Update `label` computed property: `.screenshot` → `"Screenshot"`

- [ ] **Add new properties to `ClipboardItem`**
  - [ ] `var thumbnailData: Data?` - for image preview
  - [ ] `var fileURL: URL?` - path to saved file
  - [ ] Ensure `Codable` conformance handles optionals

- [ ] **Add convenience initializer for screenshots**
  ```swift
  init(screenshot thumbnailData: Data, fileURL: URL)
  ```

- [ ] **Update `preview` computed property**
  - [ ] For `.screenshot`: return filename from `fileURL` or "Screenshot"

- [ ] **Update `canOpen` computed property**
  - [ ] For `.screenshot`: return `fileURL != nil && FileManager.default.fileExists(atPath:)`

---

## 1.5 Update ClipboardHistoryManager

- [ ] **Add `addScreenshot(thumbnailData: Data, fileURL: URL)` method**
  - [ ] Create `ClipboardItem` with type `.screenshot`
  - [ ] Set `thumbnailData` and `fileURL`
  - [ ] Set `content` to file path string (for searching/display)
  - [ ] Call existing `add(_:)` method

---

## 1.6 Update ClipboardDockView for Images

- [ ] **Update `ClipboardItemView` for screenshot display**
  - [ ] Check if `item.type == .screenshot && item.thumbnailData != nil`
  - [ ] If true, show image thumbnail instead of text preview:
    ```swift
    if let data = item.thumbnailData, let nsImage = NSImage(data: data) {
        Image(nsImage: nsImage)
            .resizable()
            .aspectRatio(contentMode: .fill)
            .frame(width: 50, height: 50)
            .clipShape(RoundedRectangle(cornerRadius: 4))
    }
    ```
  - [ ] Keep text preview as fallback

- [ ] **Update `openItem()` for screenshots**
  - [ ] For `.screenshot`:
    - [ ] If `item.fileURL` exists, open with `NSWorkspace.shared.open(url)`
    - [ ] Else show in Finder: `NSWorkspace.shared.activateFileViewerSelecting([url])`

---

## 1.7 Update ToastController

- [ ] **Add `.screenshot` case to `ToastType` enum**
  - [ ] `icon` → `"photo.fill"`
  - [ ] `color` → `.green`
  - [ ] `label` → `"Screenshot"`

- [ ] **Add convenience method for screenshots**
  ```swift
  func showScreenshotSaved(filename: String) {
      show(message: "Saved!", preview: filename, type: .screenshot)
  }
  ```

---

## 1.8 Update BemoTheme

- [ ] **Update `BemoTheme.color(for:)` method**
  - [ ] Add case `.screenshot` → return `.green`

---

## 1.9 Register Screenshot Hotkey

- [ ] **Update `AppDelegate.setupHotkeys()`**
  - [ ] Register `⌘⇧3` (keyCode `0x14`, modifiers `[.command, .shift]`)
  - [ ] Callback: `self?.startScreenshotCapture()`

- [ ] **Add `startScreenshotCapture()` method to AppDelegate**
  - [ ] Close popover if shown
  - [ ] Create `SelectionOverlayController` instance
  - [ ] Store in `selectionOverlay` property
  - [ ] Call `start(mode: .screenshot)` with completion handler:
    ```swift
    case .success(.screenshot(let image, let rect)):
        Task {
            let thumbnail = ScreenshotService.shared.generateThumbnail(from: image, maxSize: 120)
            let url = try await ScreenshotService.shared.save(image: image, toClipboard: true, toFile: true)
            if let url = url, let thumbnail = thumbnail {
                ClipboardHistoryManager.shared.addScreenshot(thumbnailData: thumbnail, fileURL: url)
                ToastController.shared.showScreenshotSaved(filename: url.lastPathComponent)
            }
        }
    case .failure(let error):
        ToastController.shared.show(message: "Error", preview: error.localizedDescription, type: .error)
    ```

---

## 1.10 Update MenubarView

- [ ] **Add "Screenshot" button to MenubarView**
  - [ ] Icon: `"camera.viewfinder"`
  - [ ] Label: "Screenshot"
  - [ ] Action: calls `onScreenshot` callback

- [ ] **Update MenubarView initializer**
  - [ ] Add `onScreenshot: @escaping () -> Void` parameter

- [ ] **Update AppDelegate.setupPopover()**
  - [ ] Pass `onScreenshot: { [weak self] in self?.startScreenshotCapture() }`

---

## Sprint 1 Testing Checklist

- [x] ⌘⇧3 triggers selection overlay with screenshot instructions
- [x] Overlay shows camera icon and "Drag to capture screenshot"
- [x] Selection border uses green accent color
- [x] Drag selection captures correct region (multi-display aware)
- [x] Image copied to clipboard (paste in Preview works)
- [x] Image saved to Desktop with correct filename format
- [x] Screenshot appears in clipboard dock with thumbnail
- [x] Clicking thumbnail in dock copies to clipboard
- [x] Expanding item shows filename and "Open" action works
- [x] Toast shows "Saved!" with filename
- [x] Small selections (< 10px) are cancelled (no save)
- [x] ESC cancels selection overlay
- [x] Right-click menubar → Screenshot option works

**Status: ✅ COMPLETE** - Committed `5e8ddb5`

---

# Sprint 2: Quick Screen Recording

## Goals
- Add direct screen region recording using `SCRecordingOutput`
- Optional camera overlay (on-screen, captured naturally)
- Audio capture (system audio + microphone)
- Recording controls and indicator UI

## Implementation Order

Execute tasks in this order to minimize blocking dependencies:

```
Phase 1: Foundation (can be parallel)
├── 2.1 ScreenRecordingService.swift     ─┐
├── 2.2 CameraService.swift              ─┼─► Core services
└── 2.12 Video thumbnail generation      ─┘

Phase 2: UI Components (can be parallel)
├── 2.4 CameraOverlayView.swift          ─┐
├── 2.5 RecordingControlsView.swift      ─┼─► SwiftUI views
└── 2.7 RecordingIndicatorView.swift     ─┘

Phase 3: Controllers (depends on Phase 2)
├── 2.3 CameraOverlayController.swift    ─┐
├── 2.6 RecordingControlsController.swift ─┼─► Panel controllers
└── 2.8 RecordingIndicatorController.swift─┘

Phase 4: Integration (depends on all above)
├── 2.9-2.11 ClipboardItem extensions    ─┐
├── 2.13 AppDelegate integration         ─┼─► Final wiring
└── 2.14 Entitlements & permissions      ─┘
```

## New Files

```
Bemo/
├── Services/
│   ├── ScreenRecordingService.swift    # NEW - SCRecordingOutput wrapper
│   └── CameraService.swift             # NEW - AVFoundation webcam
├── Views/
│   ├── RecordingControlsController.swift  # NEW - pre-recording panel
│   ├── RecordingControlsView.swift        # NEW - options UI
│   ├── RecordingIndicatorController.swift # NEW - during-recording panel
│   ├── RecordingIndicatorView.swift       # NEW - timer + stop button
│   ├── CameraOverlayController.swift      # NEW - floating camera circle
│   └── CameraOverlayView.swift            # NEW - camera preview
└── (existing files modified)
```

---

## Key API Reference

### SCRecordingOutput (macOS 14.0+)

The `SCRecordingOutput` API provides a simple way to record screen content directly to a file:

```swift
// Configuration
let config = SCRecordingOutputConfiguration()
config.outputURL = outputURL
config.outputFileType = .mp4
config.videoCodecType = .h264

// Create output and add to stream
let output = SCRecordingOutput(configuration: config, delegate: self)
try stream.addRecordingOutput(output)

// Recording starts when stream.startCapture() is called
// Recording stops when stream.stopCapture() is called
```

**Important Notes:**
- `SCRecordingOutput` captures audio/video to file automatically
- The camera overlay appears on-screen and is captured naturally by the screen recording
- Region recording uses `sourceRect` (normalized 0-1 coordinates) in `SCStreamConfiguration`
- System audio + microphone are separate options in `SCStreamConfiguration`

### AVFoundation Camera

```swift
let session = AVCaptureSession()
session.sessionPreset = .medium

let device = AVCaptureDevice.default(for: .video)
let input = try AVCaptureDeviceInput(device: device!)
session.addInput(input)

let previewLayer = AVCaptureVideoPreviewLayer(session: session)
previewLayer.videoGravity = .resizeAspectFill

session.startRunning()
```

---

## 2.1 Create ScreenRecordingService

- [ ] **Create `Bemo/Services/ScreenRecordingService.swift`**
  - [ ] Define as `actor ScreenRecordingService`
  - [ ] Add `static let shared = ScreenRecordingService()`

- [ ] **Define `RecordingConfiguration` struct**
  - [ ] `region: CGRect` - screen region to capture
  - [ ] `displayID: CGDirectDisplayID` - target display
  - [ ] `captureSystemAudio: Bool` - include app audio
  - [ ] `captureMicrophone: Bool` - include mic input
  - [ ] `outputURL: URL` - destination file path

- [ ] **Define `RecordingState` enum**
  - [ ] `.idle` - not recording
  - [ ] `.preparing` - setting up stream
  - [ ] `.recording` - actively recording
  - [ ] `.stopping` - finalizing file

- [ ] **Add state properties**
  - [ ] `private(set) var state: RecordingState = .idle`
  - [ ] `private var stream: SCStream?`
  - [ ] `private var recordingOutput: SCRecordingOutput?`
  - [ ] `private var currentConfig: RecordingConfiguration?`

- [ ] **Add `hasPermission() async -> Bool` method**
  - [ ] Try `SCShareableContent.excludingDesktopWindows(false, onScreenWindowsOnly: true)`
  - [ ] Return true if success, false on error

- [ ] **Add `requestPermission() async -> Bool` method**
  - [ ] Same as `hasPermission()` - API triggers permission dialog

- [ ] **Add `startRecording(config: RecordingConfiguration) async throws` method**
  - [ ] Guard state is `.idle`, else throw error
  - [ ] Set state to `.preparing`
  - [ ] Fetch `SCShareableContent`
  - [ ] Find `SCDisplay` matching `config.displayID`
  - [ ] Get Bemo's bundle ID for exclusion
  - [ ] Find Bemo in `content.applications`
  - [ ] Create `SCContentFilter`:
    ```swift
    SCContentFilter(
        display: targetDisplay,
        excludingApplications: [bemoApp],
        exceptingWindows: []
    )
    ```
  - [ ] Calculate source rect (normalized 0-1 coordinates):
    ```swift
    let sourceRect = CGRect(
        x: (config.region.minX - display.frame.minX) / display.frame.width,
        y: (config.region.minY - display.frame.minY) / display.frame.height,
        width: config.region.width / display.frame.width,
        height: config.region.height / display.frame.height
    )
    ```
  - [ ] Create `SCStreamConfiguration`:
    - [ ] `width` = region width × scale factor
    - [ ] `height` = region height × scale factor
    - [ ] `sourceRect` = calculated normalized rect
    - [ ] `capturesAudio = config.captureSystemAudio`
    - [ ] `captureMicrophone = config.captureMicrophone`
    - [ ] `showsCursor = true`
    - [ ] `pixelFormat = kCVPixelFormatType_32BGRA`
  - [ ] Create `SCRecordingOutputConfiguration`:
    - [ ] `outputURL = config.outputURL`
    - [ ] `outputFileType = .mp4`
    - [ ] `videoCodecType = .h264`
  - [ ] Create `SCRecordingOutput(configuration:delegate:)`
  - [ ] Create `SCStream(filter:configuration:delegate:)`
  - [ ] Add recording output: `stream.addRecordingOutput(recordingOutput)`
  - [ ] Start capture: `try await stream.startCapture()`
  - [ ] Store references and config
  - [ ] Set state to `.recording`

- [ ] **Add `stopRecording() async throws -> URL` method**
  - [ ] Guard state is `.recording`, else throw error
  - [ ] Set state to `.stopping`
  - [ ] Stop capture: `try await stream.stopCapture()`
  - [ ] Get output URL from stored config
  - [ ] Clear stream and output references
  - [ ] Set state to `.idle`
  - [ ] Return output URL

- [ ] **Add `cancelRecording() async` method**
  - [ ] Stop stream if not nil (ignore errors)
  - [ ] Delete partial file if exists
  - [ ] Clear all references
  - [ ] Set state to `.idle`

- [ ] **Implement `SCRecordingOutputDelegate`**
  - [ ] Handle `recordingOutput(_:didFinishRecordingTo:error:)`
  - [ ] Log errors if any

---

## 2.2 Create CameraService

- [ ] **Create `Bemo/Services/CameraService.swift`**
  - [ ] Define as `@MainActor final class CameraService`
  - [ ] Add `static let shared = CameraService()`

- [ ] **Add properties**
  - [ ] `private var captureSession: AVCaptureSession?`
  - [ ] `private var videoInput: AVCaptureDeviceInput?`
  - [ ] `private(set) var previewLayer: AVCaptureVideoPreviewLayer?`
  - [ ] `private let sessionQueue = DispatchQueue(label: "bemo.camera")`
  - [ ] `private(set) var isRunning: Bool = false`

- [ ] **Add `checkPermission() -> AVAuthorizationStatus` method**
  - [ ] Return `AVCaptureDevice.authorizationStatus(for: .video)`

- [ ] **Add `requestPermission() async -> Bool` method**
  - [ ] Return `await AVCaptureDevice.requestAccess(for: .video)`

- [ ] **Add `startCapture() async throws` method**
  - [ ] Check permission, request if needed
  - [ ] Guard permission granted
  - [ ] Get default video device: `AVCaptureDevice.default(for: .video)`
  - [ ] Create input: `AVCaptureDeviceInput(device:)`
  - [ ] Create session with `.medium` preset
  - [ ] Add input to session
  - [ ] Create preview layer from session
  - [ ] Set `videoGravity = .resizeAspectFill`
  - [ ] Start session on `sessionQueue`
  - [ ] Set `isRunning = true`

- [ ] **Add `stopCapture()` method**
  - [ ] Stop session on `sessionQueue`
  - [ ] Clear preview layer
  - [ ] Set `isRunning = false`

---

## 2.3 Create CameraOverlayController

- [ ] **Create `Bemo/Views/CameraOverlayController.swift`**
  - [ ] Define as `@MainActor final class CameraOverlayController`

- [ ] **Define `CameraSize` enum**
  - [ ] `.small` = 80
  - [ ] `.medium` = 120
  - [ ] `.large` = 160

- [ ] **Define `CameraPosition` enum**
  - [ ] `.topLeft`, `.topRight`, `.bottomLeft`, `.bottomRight`
  - [ ] Add `frame(in bounds: CGRect, size: CGFloat) -> CGRect` method
  - [ ] Calculate position with 20px margin from edges

- [ ] **Add properties**
  - [ ] `private var panel: NSPanel?`
  - [ ] `private let cameraService = CameraService.shared`
  - [ ] `private var currentSize: CameraSize = .medium`
  - [ ] `private var currentPosition: CameraPosition = .bottomRight`

- [ ] **Add `show(position: CameraPosition, size: CameraSize, in screenFrame: CGRect) async throws` method**
  - [ ] Calculate frame using `position.frame(in:size:)`
  - [ ] Start camera capture
  - [ ] Create panel:
    - [ ] `styleMask: [.borderless, .nonactivatingPanel]`
    - [ ] `level = .floating`
    - [ ] `isOpaque = false`
    - [ ] `backgroundColor = .clear`
    - [ ] `hasShadow = true`
    - [ ] `isMovableByWindowBackground = true`
    - [ ] `collectionBehavior = [.canJoinAllSpaces, .stationary]`
  - [ ] Create `CameraOverlayView` with preview layer
  - [ ] Set as content via `NSHostingView`
  - [ ] Animate in with scale effect

- [ ] **Add `hide()` method**
  - [ ] Animate out
  - [ ] Stop camera capture
  - [ ] Order out panel
  - [ ] Set panel to nil

- [ ] **Add `updatePosition(_ position: CameraPosition)` method**
  - [ ] Animate panel frame to new position

---

## 2.4 Create CameraOverlayView

- [ ] **Create `Bemo/Views/CameraOverlayView.swift`**

- [ ] **Create `CameraPreviewRepresentable: NSViewRepresentable`**
  - [ ] Accept `previewLayer: AVCaptureVideoPreviewLayer`
  - [ ] Create `NSView` subclass that hosts layer
  - [ ] Set layer frame to view bounds in `layout()`

- [ ] **Create `CameraOverlayView: View`**
  - [ ] Accept `previewLayer: AVCaptureVideoPreviewLayer`
  - [ ] Accept `size: CGFloat`
  - [ ] Body:
    ```swift
    CameraPreviewRepresentable(previewLayer: previewLayer)
        .frame(width: size, height: size)
        .clipShape(Circle())
        .overlay(Circle().stroke(.white, lineWidth: 3))
        .shadow(color: .black.opacity(0.3), radius: 8, y: 4)
    ```

---

## 2.5 Create RecordingControlsView

- [ ] **Create `Bemo/Views/RecordingControlsView.swift`**

- [ ] **Define `RecordingOptions` struct**
  - [ ] `captureSystemAudio: Bool`
  - [ ] `captureMicrophone: Bool`
  - [ ] `includeCamera: Bool`
  - [ ] `cameraPosition: CameraPosition`
  - [ ] `cameraSize: CameraSize`

- [ ] **Create `RecordingControlsView: View`**
  - [ ] Properties:
    - [ ] `let regionSize: CGSize` (for display)
    - [ ] `@State var captureSystemAudio = true`
    - [ ] `@State var captureMicrophone = false`
    - [ ] `@State var includeCamera = false`
    - [ ] `@State var cameraPosition: CameraPosition = .bottomRight`
    - [ ] `@State var cameraSize: CameraSize = .medium`
    - [ ] `@State var micPermissionStatus: AVAuthorizationStatus = .notDetermined`
    - [ ] `let onStart: (RecordingOptions) -> Void`
    - [ ] `let onCancel: () -> Void`

- [ ] **Build view body**
  - [ ] Glass panel background
  - [ ] Header: "Quick Recording" + region dimensions
  - [ ] Toggle: "System Audio" with speaker.wave.2 icon
  - [ ] Toggle: "Microphone" with mic icon
    - [ ] Show permission status if denied
    - [ ] Request permission on toggle if not determined
  - [ ] Toggle: "Camera" with video icon
  - [ ] If camera enabled:
    - [ ] Position picker (4 corner buttons in 2×2 grid)
    - [ ] Size picker (S/M/L segmented control)
  - [ ] Footer:
    - [ ] Cancel button (secondary style)
    - [ ] "Start Recording" button (prominent, red accent)

- [ ] **Add `onAppear` handler**
  - [ ] Check mic permission status
  - [ ] Check camera permission status

---

## 2.6 Create RecordingControlsController

- [ ] **Create `Bemo/Views/RecordingControlsController.swift`**
  - [ ] Define as `@MainActor final class RecordingControlsController`

- [ ] **Add properties**
  - [ ] `private var panel: NSPanel?`
  - [ ] `private var onStart: ((RecordingOptions) -> Void)?`
  - [ ] `private var onCancel: (() -> Void)?`

- [ ] **Add `show(for region: CGRect, displayID: CGDirectDisplayID, onStart: ..., onCancel: ...)` method**
  - [ ] Store callbacks
  - [ ] Create panel:
    - [ ] Size: 280 × 320
    - [ ] Position: centered below selected region (or beside if no room)
    - [ ] Style: borderless, non-activating, floating
  - [ ] Create `RecordingControlsView` with region size
  - [ ] Wrap in `NSHostingView`
  - [ ] Animate in

- [ ] **Add `dismiss()` method**
  - [ ] Animate out
  - [ ] Order out panel
  - [ ] Clear panel and callbacks

---

## 2.7 Create RecordingIndicatorView

- [ ] **Create `Bemo/Views/RecordingIndicatorView.swift`**

- [ ] **Create `RecordingIndicatorView: View`**
  - [ ] Properties:
    - [ ] `@State var elapsedSeconds: Int = 0`
    - [ ] `let onStop: () -> Void`
    - [ ] `let timer = Timer.publish(every: 1, on: .main, in: .common).autoconnect()`

- [ ] **Add `formattedTime: String` computed property**
  - [ ] Format `elapsedSeconds` as `MM:SS`

- [ ] **Build view body**
  - [ ] Pill-shaped container (glass background)
  - [ ] HStack:
    - [ ] Red recording dot (pulsing animation)
    - [ ] Time display in monospace font
    - [ ] Stop button (square.fill icon, red)
  - [ ] On receive timer: increment `elapsedSeconds`

---

## 2.8 Create RecordingIndicatorController

- [ ] **Create `Bemo/Views/RecordingIndicatorController.swift`**
  - [ ] Define as `@MainActor final class RecordingIndicatorController`

- [ ] **Add properties**
  - [ ] `private var panel: NSPanel?`
  - [ ] `private var onStop: (() -> Void)?`

- [ ] **Add `show(onStop: @escaping () -> Void)` method**
  - [ ] Store callback
  - [ ] Create panel:
    - [ ] Size: 140 × 44
    - [ ] Position: top-right of main screen with margin
    - [ ] Level: `.statusBar` (above most windows)
    - [ ] `isMovableByWindowBackground = true`
  - [ ] Create `RecordingIndicatorView`
  - [ ] Animate in from right

- [ ] **Add `hide()` method**
  - [ ] Animate out to right
  - [ ] Order out panel
  - [ ] Clear panel and callback

---

## 2.9 Extend ClipboardItem for Recordings

- [ ] **Add `.recording` case to `ClipboardItem.ItemType`**
  - [ ] `icon` → `"video.fill"`
  - [ ] `label` → `"Recording"`

- [ ] **Add `duration: TimeInterval?` property to ClipboardItem**
  - [ ] Optional, only set for recordings

- [ ] **Add convenience initializer for recordings**
  ```swift
  init(recording thumbnailData: Data, fileURL: URL, duration: TimeInterval)
  ```

- [ ] **Update `BemoTheme.color(for:)`**
  - [ ] `.recording` → `.red`

- [ ] **Update `ToastType`**
  - [ ] Add `.recording` case
  - [ ] `icon` → `"video.fill"`
  - [ ] `color` → `.red`
  - [ ] `label` → `"Recording"`

---

## 2.10 Update ClipboardHistoryManager

- [ ] **Add `addRecording(thumbnailData: Data, fileURL: URL, duration: TimeInterval)` method**
  - [ ] Create `ClipboardItem` with type `.recording`
  - [ ] Set all properties
  - [ ] Call `add(_:)`

---

## 2.11 Update ClipboardDockView for Recordings

- [ ] **Update `ClipboardItemView` for recording display**
  - [ ] Show thumbnail with play icon overlay
  - [ ] Show duration badge (bottom-right of thumbnail)
  - [ ] Format duration as `M:SS`

---

## 2.12 Video Thumbnail Generation

- [ ] **Add `generateVideoThumbnail(from url: URL) async -> Data?` to ScreenshotService**
  - [ ] Create `AVAsset` from URL
  - [ ] Create `AVAssetImageGenerator`
  - [ ] Set `appliesPreferredTrackTransform = true`
  - [ ] Generate image at time 0
  - [ ] Scale to max 120px
  - [ ] Convert to JPEG data
  - [ ] Return data

---

## 2.13 Integrate Recording Flow in AppDelegate

- [ ] **Add recording properties**
  - [ ] `private var recordingControlsController: RecordingControlsController?`
  - [ ] `private var recordingIndicator: RecordingIndicatorController?`
  - [ ] `private var cameraOverlay: CameraOverlayController?`
  - [ ] `private var isRecording = false`
  - [ ] `private var currentRecordingRegion: CGRect?`
  - [ ] `private var currentDisplayID: CGDirectDisplayID?`

- [ ] **Register recording hotkey in `setupHotkeys()`**
  - [ ] `⌘⇧4` (keyCode `0x15`) → `startQuickRecording()`

- [ ] **Add `startQuickRecording()` method**
  - [ ] If `isRecording`: just show indicator, return
  - [ ] Close popover
  - [ ] Create `SelectionOverlayController`
  - [ ] Call `start(mode: .quickRecording)`
  - [ ] On `.recordingRegion(rect, displayID)`:
    - [ ] Store region and displayID
    - [ ] Show `RecordingControlsController`

- [ ] **Add `beginRecording(options: RecordingOptions)` method**
  - [ ] Dismiss controls
  - [ ] Generate output URL: `~/Movies/Bemo Recording YYYY-MM-DD at HH.MM.SS.mp4`
  - [ ] Build `RecordingConfiguration`
  - [ ] If `options.includeCamera`:
    - [ ] Show `CameraOverlayController` at configured position
  - [ ] Start recording via `ScreenRecordingService.shared.startRecording(config:)`
  - [ ] Show `RecordingIndicatorController`
  - [ ] Set `isRecording = true`

- [ ] **Add `stopRecording()` method**
  - [ ] Hide indicator
  - [ ] Hide camera overlay if shown
  - [ ] Stop recording via `ScreenRecordingService.shared.stopRecording()`
  - [ ] Generate video thumbnail
  - [ ] Get video duration via `AVAsset`
  - [ ] Add to clipboard history
  - [ ] Show success toast
  - [ ] Set `isRecording = false`

---

## 2.14 Update Entitlements

- [ ] **Update `Config/Bemo.entitlements`**
  - [ ] Add `com.apple.security.device.camera` → `true`
  - [ ] Add `com.apple.security.device.audio-input` → `true`

- [ ] **Add Info.plist entries** (via Xcode project settings or plist file)
  - [ ] `NSCameraUsageDescription` → "Bemo uses the camera to show your webcam in screen recordings."
  - [ ] `NSMicrophoneUsageDescription` → "Bemo uses the microphone to capture audio in screen recordings."

---

## Sprint 2 Testing Checklist

- [ ] ⌘⇧4 triggers selection overlay with recording instructions
- [ ] Overlay shows record icon and correct text
- [ ] Recording controls panel appears after selection
- [ ] System audio toggle works (audio present in output)
- [ ] Microphone toggle requests permission if needed
- [ ] Microphone audio captured when enabled
- [ ] Camera toggle shows floating circle overlay
- [ ] Camera circle is draggable during recording
- [ ] Camera position presets work correctly
- [ ] Camera appears in recorded video
- [ ] Recording indicator shows elapsed time
- [ ] Stop button ends recording
- [ ] Video saved to Movies folder with correct name
- [ ] Video plays correctly in QuickTime
- [ ] Recording appears in clipboard dock with thumbnail
- [ ] Duration displayed correctly on recording item
- [ ] Opening recording item plays video
- [ ] ESC during selection cancels
- [ ] Cancel button in controls dismisses everything
- [ ] Multiple recordings in sequence work correctly
- [ ] Permission denied shows helpful error message

---

# Sprint 3: Studio Screen Recording

## Goals
- Add composited recording mode with custom backgrounds
- Wallpaper or solid color/gradient backgrounds
- Styled screen frame (rounded corners, shadow, scale)
- Integrated camera bubble (composited into video)
- Full creative control over output appearance

## Architecture Change

Sprint 3 replaces `SCRecordingOutput` with a **manual composition pipeline**:

```
┌─────────────────────────────────────────────────────────────────────┐
│                 Studio Recording Pipeline                           │
├─────────────────────────────────────────────────────────────────────┤
│                                                                     │
│   SCStream ──────► CVPixelBuffer ──┐                               │
│   (screen frames)                  │                               │
│                                    ▼                               │
│   AVCapture ─────► CVPixelBuffer ──┼──► FrameCompositor            │
│   (camera frames)                  │    (Core Image)               │
│                                    │         │                     │
│   Background ────► CIImage ────────┘         ▼                     │
│   (wallpaper)                         Composited Frame              │
│                                              │                     │
│                                              ▼                     │
│                                       AVAssetWriter                 │
│                                              │                     │
│                                              ▼                     │
│                                         output.mp4                  │
│                                                                     │
└─────────────────────────────────────────────────────────────────────┘
```

## New Files

```
Bemo/
├── Services/
│   ├── StudioRecordingService.swift   # NEW - composited recording
│   ├── FrameCompositor.swift          # NEW - Core Image composition
│   └── BackgroundProvider.swift       # NEW - wallpaper/gradient loader
├── Views/
│   ├── StudioControlsView.swift       # NEW - extended options UI
│   └── BackgroundPickerView.swift     # NEW - background selection
└── Models/
    ├── StudioConfiguration.swift      # NEW - all studio settings
    └── BackgroundStyle.swift          # NEW - background options
```

---

## 3.1 Create BackgroundStyle Model

- [ ] **Create `Bemo/Models/BackgroundStyle.swift`**

- [ ] **Define `BackgroundStyle` enum**
  ```swift
  enum BackgroundStyle: Codable, Equatable {
      case wallpaper                    // User's desktop wallpaper
      case solidColor(Color)            // Single color
      case gradient(Color, Color)       // Two-color gradient
      case image(URL)                   // Custom image file
  }
  ```

- [ ] **Add `toCIImage(size: CGSize) -> CIImage?` method**
  - [ ] For `.wallpaper`: load via `NSWorkspace.desktopImageURL(for:)`
  - [ ] For `.solidColor`: create solid color CIImage
  - [ ] For `.gradient`: create gradient CIImage
  - [ ] For `.image`: load from URL

---

## 3.2 Create StudioConfiguration Model

- [ ] **Create `Bemo/Models/StudioConfiguration.swift`**

- [ ] **Define `FrameStyle` struct**
  - [ ] `scale: CGFloat` - 0.7 to 0.95 (default 0.85)
  - [ ] `cornerRadius: CGFloat` - 0, 8, 16, 24 (default 12)
  - [ ] `shadowRadius: CGFloat` - 0, 8, 16, 24 (default 16)
  - [ ] `shadowOpacity: CGFloat` - 0 to 1 (default 0.3)

- [ ] **Define `OutputPreset` enum**
  - [ ] `.hd1080p` - 1920×1080
  - [ ] `.hd720p` - 1280×720
  - [ ] `.square1080` - 1080×1080
  - [ ] `.portrait1080` - 1080×1920

- [ ] **Define `StudioConfiguration` struct**
  - [ ] `region: CGRect`
  - [ ] `displayID: CGDirectDisplayID`
  - [ ] `background: BackgroundStyle`
  - [ ] `frameStyle: FrameStyle`
  - [ ] `outputPreset: OutputPreset`
  - [ ] `captureSystemAudio: Bool`
  - [ ] `captureMicrophone: Bool`
  - [ ] `includeCamera: Bool`
  - [ ] `cameraPosition: CameraPosition`
  - [ ] `cameraSize: CameraSize`
  - [ ] `cameraStyle: CameraStyle` (circle, rounded square)
  - [ ] `outputURL: URL`

---

## 3.3 Create BackgroundProvider

- [ ] **Create `Bemo/Services/BackgroundProvider.swift`**
  - [ ] Define as `actor BackgroundProvider`

- [ ] **Add `loadWallpaper(for screen: NSScreen) async throws -> CIImage` method**
  - [ ] Get URL via `NSWorkspace.shared.desktopImageURL(for:)`
  - [ ] Load image from URL
  - [ ] Convert to CIImage
  - [ ] Handle errors (permission, file not found)

- [ ] **Add `createSolidColor(_ color: NSColor, size: CGSize) -> CIImage` method**
  - [ ] Use `CIFilter(name: "CIConstantColorGenerator")`
  - [ ] Crop to size

- [ ] **Add `createGradient(from: NSColor, to: NSColor, size: CGSize) -> CIImage` method**
  - [ ] Use `CIFilter(name: "CILinearGradient")`
  - [ ] Set input points for vertical gradient
  - [ ] Crop to size

- [ ] **Add `loadBackground(_ style: BackgroundStyle, size: CGSize, screen: NSScreen) async throws -> CIImage` method**
  - [ ] Switch on style, call appropriate method

---

## 3.4 Create FrameCompositor

- [ ] **Create `Bemo/Services/FrameCompositor.swift`**
  - [ ] Define as `final class FrameCompositor` (thread-safe)

- [ ] **Add properties**
  - [ ] `private let ciContext: CIContext`
  - [ ] `private let colorSpace: CGColorSpace`
  - [ ] `private var backgroundImage: CIImage?`
  - [ ] `private var outputSize: CGSize`
  - [ ] `private var frameStyle: FrameStyle`
  - [ ] `private var cameraConfig: (position: CameraPosition, size: CameraSize)?`

- [ ] **Add initializer**
  ```swift
  init(outputSize: CGSize, frameStyle: FrameStyle, background: CIImage)
  ```
  - [ ] Create `CIContext` with Metal device
  - [ ] Store configuration

- [ ] **Add `setCamera(position: CameraPosition, size: CameraSize)` method**
  - [ ] Store camera configuration

- [ ] **Add `compositeFrame(screen: CVPixelBuffer, camera: CVPixelBuffer?) -> CVPixelBuffer` method**
  - [ ] Convert screen buffer to CIImage
  - [ ] Apply scale transform based on `frameStyle.scale`
  - [ ] Apply rounded corners (custom kernel or masking)
  - [ ] Add shadow via `CIFilter`
  - [ ] Center on background
  - [ ] Composite screen over background
  - [ ] If camera buffer provided:
    - [ ] Convert to CIImage
    - [ ] Scale based on `cameraSize`
    - [ ] Apply circular mask
    - [ ] Add white border
    - [ ] Position based on `cameraPosition`
    - [ ] Composite over current image
  - [ ] Render to output CVPixelBuffer
  - [ ] Return buffer

- [ ] **Add `createOutputBuffer() -> CVPixelBuffer` method**
  - [ ] Create pixel buffer pool if not exists
  - [ ] Get buffer from pool
  - [ ] Return buffer

---

## 3.5 Create StudioRecordingService

- [ ] **Create `Bemo/Services/StudioRecordingService.swift`**
  - [ ] Define as `actor StudioRecordingService`

- [ ] **Add properties**
  - [ ] `private(set) var state: RecordingState = .idle`
  - [ ] `private var screenStream: SCStream?`
  - [ ] `private var cameraSession: AVCaptureSession?`
  - [ ] `private var assetWriter: AVAssetWriter?`
  - [ ] `private var videoInput: AVAssetWriterInput?`
  - [ ] `private var audioInput: AVAssetWriterInput?`
  - [ ] `private var pixelBufferAdaptor: AVAssetWriterInputPixelBufferAdaptor?`
  - [ ] `private var compositor: FrameCompositor?`
  - [ ] `private var latestCameraBuffer: CVPixelBuffer?`
  - [ ] `private var config: StudioConfiguration?`

- [ ] **Add `startRecording(config: StudioConfiguration) async throws` method**
  - [ ] Guard state is `.idle`
  - [ ] Set state to `.preparing`
  - [ ] Load background image via `BackgroundProvider`
  - [ ] Create `FrameCompositor` with background and output size
  - [ ] Setup `AVAssetWriter`:
    - [ ] Create writer for output URL
    - [ ] Create video input with appropriate settings
    - [ ] Create pixel buffer adaptor
    - [ ] Add audio input if audio enabled
    - [ ] Start writing session
  - [ ] Setup screen capture `SCStream`:
    - [ ] Create filter for display
    - [ ] Add self as `SCStreamOutput` delegate
    - [ ] Start capture
  - [ ] If camera enabled:
    - [ ] Setup `AVCaptureSession` with video data output
    - [ ] Add self as `AVCaptureVideoDataOutputSampleBufferDelegate`
    - [ ] Start session
  - [ ] Set state to `.recording`

- [ ] **Implement `SCStreamOutput` delegate**
  - [ ] `stream(_:didOutputSampleBuffer:of:)`:
    - [ ] For `.screen` type:
      - [ ] Get CVPixelBuffer from sample buffer
      - [ ] Composite with `compositor.compositeFrame(screen:camera:)`
      - [ ] Append to asset writer with timestamp

- [ ] **Implement `AVCaptureVideoDataOutputSampleBufferDelegate`**
  - [ ] `captureOutput(_:didOutput:from:)`:
    - [ ] Store buffer in `latestCameraBuffer`
    - [ ] (Used by compositor on next screen frame)

- [ ] **Add `stopRecording() async throws -> URL` method**
  - [ ] Set state to `.stopping`
  - [ ] Stop screen stream
  - [ ] Stop camera session
  - [ ] Finish writing: `assetWriter.finishWriting()`
  - [ ] Get output URL
  - [ ] Cleanup all resources
  - [ ] Set state to `.idle`
  - [ ] Return URL

---

## 3.6 Create StudioControlsView

- [ ] **Create `Bemo/Views/StudioControlsView.swift`**
  - [ ] Extended version of `RecordingControlsView` for Studio mode

- [ ] **Add additional state properties**
  - [ ] `@State var backgroundStyle: BackgroundStyle = .wallpaper`
  - [ ] `@State var frameScale: CGFloat = 0.85`
  - [ ] `@State var frameCornerRadius: CGFloat = 12`
  - [ ] `@State var frameShadow: CGFloat = 16`
  - [ ] `@State var outputPreset: OutputPreset = .hd1080p`

- [ ] **Build extended view body**
  - [ ] Section: "Background"
    - [ ] Picker: Wallpaper, Color, Gradient
    - [ ] Color picker if Color/Gradient selected
  - [ ] Section: "Frame Style"
    - [ ] Slider: Scale (75% - 95%)
    - [ ] Slider: Corner Radius (0 - 24)
    - [ ] Slider: Shadow (0 - 24)
  - [ ] Section: "Output"
    - [ ] Picker: 1080p, 720p, Square, Portrait
  - [ ] Section: "Audio" (same as Quick)
  - [ ] Section: "Camera" (same as Quick)

---

## 3.7 Create BackgroundPickerView

- [ ] **Create `Bemo/Views/BackgroundPickerView.swift`**
  - [ ] Compact picker for background style selection

- [ ] **Build view body**
  - [ ] Horizontal scroll of preview thumbnails:
    - [ ] Wallpaper (show actual wallpaper thumbnail)
    - [ ] 5-6 preset solid colors
    - [ ] 3-4 preset gradients
    - [ ] "Custom" option with color picker

---

## 3.8 Integrate Studio Mode in AppDelegate

- [ ] **Update `CaptureMode` to include `.studioRecording`**
  - [ ] Already added in Sprint 1

- [ ] **Add menu option for Studio Recording**
  - [ ] Or use modifier: `⌘⇧⌥4` for Studio mode
  - [ ] Or toggle in recording controls: "Quick" vs "Studio" tab

- [ ] **Add `startStudioRecording()` method**
  - [ ] Similar to `startQuickRecording()` but with mode `.studioRecording`
  - [ ] Show `StudioControlsView` instead of `RecordingControlsView`

- [ ] **Add `beginStudioRecording(config: StudioConfiguration)` method**
  - [ ] Use `StudioRecordingService` instead of `ScreenRecordingService`

---

## 3.9 Live Preview (Optional Enhancement)

- [ ] **Add live preview in StudioControlsView**
  - [ ] Small preview showing:
    - [ ] Selected background
    - [ ] Frame with current styling
    - [ ] Camera position (if enabled)
  - [ ] Updates as user changes settings

---

## 3.10 Settings Persistence

- [ ] **Create `StudioPreferences` struct**
  - [ ] Last used background style
  - [ ] Last used frame style
  - [ ] Last used output preset
  - [ ] Default audio settings
  - [ ] Default camera settings

- [ ] **Save/load from UserDefaults**
  - [ ] Apply as defaults when opening Studio controls

---

## Sprint 3 Testing Checklist

- [ ] Studio recording mode accessible via UI
- [ ] Background picker shows wallpaper thumbnail
- [ ] Solid color backgrounds work correctly
- [ ] Gradient backgrounds render correctly
- [ ] Frame scale slider affects output (75% - 95%)
- [ ] Corner radius applied to screen frame
- [ ] Shadow visible behind screen frame
- [ ] Output preset changes video dimensions
- [ ] Camera composited into video (not separate overlay)
- [ ] Camera position correct in output video
- [ ] Camera has circular mask and border
- [ ] Audio capture works (system + mic)
- [ ] Video plays correctly in QuickTime
- [ ] Output file size reasonable
- [ ] No frame drops during recording
- [ ] Settings persist between sessions
- [ ] Live preview updates correctly (if implemented)
- [ ] Wallpaper fallback works if permission denied
- [ ] Long recordings (5+ minutes) stable

---

## Performance Benchmarks (Sprint 3)

Target performance on M1 Mac:

| Metric | Target | Acceptable |
|--------|--------|------------|
| Frame rate | 30 fps | 24 fps |
| CPU usage | < 30% | < 50% |
| Memory | < 400MB | < 600MB |
| GPU usage | < 40% | < 60% |
| Latency | < 50ms | < 100ms |

---

## Dependencies Summary

| Sprint | New Dependencies |
|--------|------------------|
| 1 | None (uses existing ScreenCaptureKit) |
| 2 | AVFoundation (camera), SCRecordingOutput |
| 3 | Core Image (compositing), AVAssetWriter |

---

## Risks & Mitigations

| Risk | Sprint | Mitigation |
|------|--------|------------|
| SCRecordingOutput mic bug | 2 | Test thoroughly; disable mic if unstable |
| Low disk space failures | 2, 3 | Pre-check disk space (8GB minimum) |
| Wallpaper permission denied | 3 | Fallback to solid color |
| Frame drops in Studio mode | 3 | Lower output resolution; optimize compositor |
| Memory pressure on long recordings | 3 | Reuse pixel buffer pool; monitor memory |
| Core Image filter performance | 3 | Use Metal-backed CIContext; profile |

---

## Future Enhancements (Post-Sprint 3)

- [ ] Custom background image upload
- [ ] Animated backgrounds (subtle motion)
- [ ] Multiple camera support
- [ ] Picture-in-picture positioning via drag in preview
- [ ] Recording presets (save/load configurations)
- [ ] GIF export for short clips
- [ ] Direct upload to cloud services
- [ ] Annotation tools (arrows, text, blur)
- [ ] Trim/edit before saving
